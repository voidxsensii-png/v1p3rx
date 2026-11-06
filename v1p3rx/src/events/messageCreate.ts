import { Events, Message } from 'discord.js';
import { handleAiMessage, shouldRespond } from '../ai/chat';
import { db } from '../database/db';
import { runAutomod } from '../systems/automod';
import { BotEvent } from '../types';
import { alreadySeen } from '../utils/dedupe';

const lastActivityWrite = new Map<string, number>();
const WRITE_EVERY_MS = 60_000;
setInterval(() => {
  const cutoff = Date.now() - WRITE_EVERY_MS;
  for (const [k, t] of lastActivityWrite) if (t < cutoff) lastActivityWrite.delete(k);
}, 120_000).unref();

const event: BotEvent = {
  name: Events.MessageCreate,
  async execute(message: Message) {
    if (message.author.bot || !message.guild || !message.member) return;
    if (alreadySeen(message.id)) return;

    if (await runAutomod(message)) return;

    // Activity tracking for registered clan members (throttled to one DB write per minute per user)
    const key = `${message.guild.id}:${message.author.id}`;
    if (!lastActivityWrite.has(key)) {
      lastActivityWrite.set(key, Date.now());
      db.prepare('UPDATE clan_members SET last_active = ?, message_count = message_count + 1 WHERE guild_id = ? AND user_id = ?')
        .run(Date.now(), message.guild.id, message.author.id);
    }

    if (shouldRespond(message)) await handleAiMessage(message);
  },
};
export default event;
