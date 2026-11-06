import { Message } from 'discord.js';
import { getSettings } from '../database/db';
import { logger } from '../utils/logger';
import { embed } from '../utils/embeds';
import { createCase, sendLog } from './moderation';
import { getLevel, PermLevel } from './permissions';

const spamWindow = new Map<string, number[]>();
const SPAM_COUNT = 5;
const SPAM_MS = 5_000;
const LINK_RE = /(https?:\/\/\S+|discord\.gg\/\S+|discord\.com\/invite\/\S+)/i;

setInterval(() => {
  const cutoff = Date.now() - SPAM_MS;
  for (const [k, v] of spamWindow) {
    const kept = v.filter((t) => t > cutoff);
    if (kept.length) spamWindow.set(k, kept); else spamWindow.delete(k);
  }
}, 30_000).unref();

/** Returns true if the message was removed by auto-moderation. */
export async function runAutomod(message: Message): Promise<boolean> {
  if (!message.guild || !message.member) return false;
  const s = getSettings(message.guild.id);
  if (!s.automod_spam && !s.automod_links && !s.automod_mentions) return false;
  if (getLevel(message.member) >= PermLevel.TrialModerator) return false; // staff are exempt

  let reason: string | null = null;
  let timeoutSec = 0;

  if (s.automod_mentions && message.mentions.users.size + message.mentions.roles.size >= s.mention_limit) {
    reason = `Mention spam (${message.mentions.users.size + message.mentions.roles.size} mentions)`;
    timeoutSec = 600;
  } else if (s.automod_links && LINK_RE.test(message.content)) {
    reason = 'Posting links is not allowed';
  } else if (s.automod_spam) {
    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();
    const arr = (spamWindow.get(key) ?? []).filter((t) => t > now - SPAM_MS);
    arr.push(now);
    spamWindow.set(key, arr);
    if (arr.length >= SPAM_COUNT) {
      reason = 'Spam (too many messages too fast)';
      timeoutSec = 300;
      spamWindow.delete(key);
    }
  }
  if (!reason) return false;

  try {
    await message.delete().catch(() => undefined);
    let applied = '';
    if (timeoutSec && message.member.moderatable) {
      await message.member.timeout(timeoutSec * 1000, `Automod: ${reason}`);
      applied = ` • timed out ${timeoutSec / 60}m`;
    }
    const caseNo = createCase(message.guild.id, 'automod', message.author.id, message.client.user.id, reason, timeoutSec || undefined);
    if (message.channel.isSendable()) {
      const notice = await message.channel.send({ embeds: [embed('Automod', `${message.author}, ${reason.toLowerCase()}${applied}.`)], allowedMentions: { users: [message.author.id] } });
      setTimeout(() => notice.delete().catch(() => undefined), 6_000).unref();
    }
    await sendLog(message.guild, embed(`Automod • Case #${caseNo}`, `**User:** ${message.author} \`${message.author.id}\`\n**Channel:** ${message.channel}\n**Reason:** ${reason}${applied}`), s);
  } catch (err) {
    logger.warn('Automod action failed', err as Error);
  }
  return true;
}
