import { Collection, REST, Routes } from 'discord.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { LoadedCommand } from '../types';
import { logger } from '../utils/logger';

export function loadCommands(): Collection<string, LoadedCommand> {
  const commands = new Collection<string, LoadedCommand>();
  const root = path.join(__dirname, '..', 'commands');
  for (const dir of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const files = fs.readdirSync(path.join(root, dir.name)).filter((f) => /\.(js|ts)$/.test(f) && !f.endsWith('.d.ts'));
    for (const file of files) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(path.join(root, dir.name, file));
      const cmd = mod.default ?? mod;
      if (!cmd?.data || typeof cmd.execute !== 'function') {
        logger.warn(`Skipping ${dir.name}/${file}: missing "data" or "execute"`);
        continue;
      }
      if (commands.has(cmd.data.name)) throw new Error(`Duplicate command name: ${cmd.data.name}`);
      commands.set(cmd.data.name, { ...cmd, category: dir.name });
    }
  }
  return commands;
}

/** Registers slash commands. Skips the API call if nothing changed since the last registration. */
export async function registerCommands(commands: Collection<string, LoadedCommand>, force = false): Promise<void> {
  const body = commands.map((c) => c.data.toJSON());
  const scope = env.devGuildId ? `guild:${env.devGuildId}` : 'global';
  const hash = crypto.createHash('sha256').update(scope + JSON.stringify(body)).digest('hex');
  const hashFile = path.join(env.dataDir, 'commands.hash');
  fs.mkdirSync(env.dataDir, { recursive: true });
  if (!force && fs.existsSync(hashFile) && fs.readFileSync(hashFile, 'utf8') === hash) {
    logger.info('Slash commands unchanged — skipping registration');
    return;
  }
  const rest = new REST({ version: '10' }).setToken(env.token);
  const route = env.devGuildId ? Routes.applicationGuildCommands(env.clientId, env.devGuildId) : Routes.applicationCommands(env.clientId);
  await rest.put(route, { body });
  fs.writeFileSync(hashFile, hash);
  logger.info(`Registered ${body.length} slash commands (${scope})`);
}
