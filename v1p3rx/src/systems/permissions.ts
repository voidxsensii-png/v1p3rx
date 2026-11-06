import { GuildMember } from 'discord.js';
import { db } from '../database/db';

export enum PermLevel {
  Guest = 0,
  Member = 1,
  TrialModerator = 2,
  Moderator = 3,
  Admin = 4,
  Manager = 5,
  CoOwner = 6,
  Owner = 7,
}

export const LEVEL_NAMES: Record<number, string> = {
  [PermLevel.Guest]: 'Guest',
  [PermLevel.Member]: 'Member',
  [PermLevel.TrialModerator]: 'Trial Moderator',
  [PermLevel.Moderator]: 'Moderator',
  [PermLevel.Admin]: 'Admin',
  [PermLevel.Manager]: 'Manager',
  [PermLevel.CoOwner]: 'Co-Owner',
  [PermLevel.Owner]: 'Owner',
};

/**
 * Highest configured level among the member's roles. The Discord server owner is always Owner.
 * Discord "Administrator" does NOT grant bot permissions on its own — roles must be mapped via /config role.
 */
export function getLevel(member: GuildMember): PermLevel {
  if (member.id === member.guild.ownerId) return PermLevel.Owner;
  const rows = db.prepare('SELECT level, role_id FROM guild_roles WHERE guild_id = ?').all(member.guild.id) as { level: number; role_id: string }[];
  let best = PermLevel.Guest;
  for (const r of rows) if (member.roles.cache.has(r.role_id) && r.level > best) best = r.level;
  return best;
}
