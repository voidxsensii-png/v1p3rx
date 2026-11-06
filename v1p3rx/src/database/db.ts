import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { migrations } from './migrations';

fs.mkdirSync(env.dataDir, { recursive: true });
export const db = new Database(path.join(env.dataDir, 'v1p3rx.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate(): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const applied = new Set((db.prepare('SELECT version FROM schema_migrations').all() as { version: number }[]).map((r) => r.version));
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    db.transaction(() => {
      db.exec(m.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(m.version, Date.now());
    })();
    logger.info(`Applied migration ${m.version}: ${m.name}`);
  }
}

export interface GuildSettings {
  guild_id: string;
  log_channel: string | null;
  welcome_channel: string | null;
  goodbye_channel: string | null;
  welcome_role: string | null;
  welcome_message: string | null;
  warn_timeout_at: number;
  warn_timeout_minutes: number;
  warn_ban_at: number;
  automod_spam: number;
  automod_links: number;
  automod_mentions: number;
  mention_limit: number;
  antiraid: number;
  ai_enabled: number;
}

export function getSettings(guildId: string): GuildSettings {
  db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)').run(guildId);
  return db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId) as GuildSettings;
}

const EDITABLE = new Set<keyof GuildSettings>([
  'log_channel', 'welcome_channel', 'goodbye_channel', 'welcome_role', 'welcome_message',
  'warn_timeout_at', 'warn_timeout_minutes', 'warn_ban_at', 'automod_spam', 'automod_links',
  'automod_mentions', 'mention_limit', 'antiraid', 'ai_enabled',
]);

export function updateSetting(guildId: string, key: keyof GuildSettings, value: string | number | null): void {
  if (!EDITABLE.has(key)) throw new Error(`Setting not editable: ${key}`);
  getSettings(guildId);
  db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
}
