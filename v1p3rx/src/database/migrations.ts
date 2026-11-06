export interface Migration { version: number; name: string; sql: string }

// Append new migrations at the END. Never edit an applied migration.
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE guild_settings (
        guild_id TEXT PRIMARY KEY,
        log_channel TEXT,
        welcome_channel TEXT,
        goodbye_channel TEXT,
        welcome_role TEXT,
        welcome_message TEXT,
        warn_timeout_at INTEGER NOT NULL DEFAULT 3,
        warn_timeout_minutes INTEGER NOT NULL DEFAULT 60,
        warn_ban_at INTEGER NOT NULL DEFAULT 0,
        automod_spam INTEGER NOT NULL DEFAULT 1,
        automod_links INTEGER NOT NULL DEFAULT 0,
        automod_mentions INTEGER NOT NULL DEFAULT 1,
        mention_limit INTEGER NOT NULL DEFAULT 5,
        antiraid INTEGER NOT NULL DEFAULT 1,
        ai_enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE guild_roles (
        guild_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        role_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, level)
      );
      CREATE TABLE ai_channels (
        guild_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        PRIMARY KEY (guild_id, channel_id)
      );
      CREATE TABLE mod_cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        case_no INTEGER NOT NULL,
        type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        duration_seconds INTEGER,
        created_at INTEGER NOT NULL,
        UNIQUE (guild_id, case_no)
      );
      CREATE INDEX idx_cases_target ON mod_cases (guild_id, target_id);
      CREATE TABLE clan_members (
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        ign TEXT NOT NULL,
        rank TEXT NOT NULL DEFAULT 'Recruit',
        registered_at INTEGER NOT NULL,
        last_active INTEGER,
        message_count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
      );
      CREATE UNIQUE INDEX idx_clan_ign ON clan_members (guild_id, lower(ign));
    `,
  },
];
