import { Message } from 'discord.js';
import { db, getSettings } from '../database/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ChatMessage, generate } from './provider';
import { buildSystemPrompt } from './prompt';

interface Turn { role: 'user' | 'assistant'; content: string; at: number }
const histories = new Map<string, Turn[]>();
const cooldowns = new Map<string, number>();
const MAX_TURNS = 10;
const HISTORY_TTL = 30 * 60_000;
const COOLDOWN_MS = 4_000;
const MAX_INPUT = 800;

setInterval(() => {
  const now = Date.now();
  for (const [k, turns] of histories) if (!turns.length || now - turns[turns.length - 1].at > HISTORY_TTL) histories.delete(k);
  for (const [k, t] of cooldowns) if (now - t > 60_000) cooldowns.delete(k);
}, 60_000).unref();

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|any\s+)?(your\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i,
  /(reveal|show|print|repeat|leak|display).{0,40}(system\s*prompt|your\s+(instructions|prompt|rules)|hidden\s+prompt)/i,
  /(developer|dev|god|jailbreak)\s*mode|\bDAN\b/i,
  /(your|the\s+bot'?s?)\s+(api[\s_-]?key|token|secret|\.env|environment\s+variables?|password)/i,
  /you\s+are\s+now\s+(?!v1p3rx)/i,
];
const DEFLECTIONS = [
  "Nice try. Not happening.",
  "I don't do that. Ask me about PvP instead.",
  "Cute. Still no.",
];

function sanitizeInput(text: string): string {
  return text.replace(/<@[!&]?\d+>/g, '@user').replace(/@(everyone|here)/gi, '@\u200b$1').trim().slice(0, MAX_INPUT);
}
function sanitizeOutput(text: string): string {
  let out = text.replace(/@(everyone|here)/gi, '@\u200b$1').replace(/<@&?\d+>/g, '');
  for (const secret of [env.token, env.ai.apiKey]) if (secret && out.includes(secret)) out = out.split(secret).join('[redacted]');
  if (/[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/.test(out)) out = out.replace(/[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g, '[redacted]');
  return out.slice(0, 1900);
}

/** Should V1p3rx answer this message? Configured AI channels, or a direct mention / reply to the bot. */
export function shouldRespond(message: Message): boolean {
  if (!message.guild || !message.client.user) return false;
  const s = getSettings(message.guild.id);
  if (!s.ai_enabled || !env.ai.apiKey) return false;
  const inAiChannel = !!db.prepare('SELECT 1 FROM ai_channels WHERE guild_id = ? AND channel_id = ?').get(message.guild.id, message.channelId);
  const mentioned = message.mentions.users.has(message.client.user.id) && !message.mentions.everyone;
  const repliedToBot = message.mentions.repliedUser?.id === message.client.user.id;
  return inAiChannel || mentioned || repliedToBot;
}

export async function handleAiMessage(message: Message): Promise<void> {
  if (!message.guild || !message.client.user) return;
  const last = cooldowns.get(message.author.id) ?? 0;
  if (Date.now() - last < COOLDOWN_MS) return;
  cooldowns.set(message.author.id, Date.now());

  const text = sanitizeInput(message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), ''));
  if (!text) return;

  const reply = (content: string) => message.reply({ content, allowedMentions: { parse: [], repliedUser: false } });

  if (INJECTION_PATTERNS.some((p) => p.test(text))) {
    await reply(DEFLECTIONS[Math.floor(Math.random() * DEFLECTIONS.length)]);
    return;
  }

  const key = `${message.guild.id}:${message.channelId}`;
  const turns = histories.get(key) ?? [];
  turns.push({ role: 'user', content: `${message.member?.displayName ?? message.author.username}: ${text}`, at: Date.now() });
  while (turns.length > MAX_TURNS) turns.shift();
  histories.set(key, turns);

  // Providers require alternating roles starting with "user": merge consecutive same-role turns.
  const msgs: ChatMessage[] = [];
  for (const t of turns) {
    const prev = msgs[msgs.length - 1];
    if (prev && prev.role === t.role) prev.content += `\n${t.content}`;
    else msgs.push({ role: t.role, content: t.content });
  }
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();

  try {
    if (message.channel.isSendable()) await message.channel.sendTyping().catch(() => undefined);
    const raw = await generate(buildSystemPrompt(message.guild.name), msgs);
    const out = sanitizeOutput(raw);
    if (!out) return;
    turns.push({ role: 'assistant', content: out, at: Date.now() });
    await reply(out);
  } catch (err) {
    logger.warn('AI reply failed', err as Error);
    turns.pop();
    await reply('My brain lagged for a sec. Try again in a moment.').catch(() => undefined);
  }
}
