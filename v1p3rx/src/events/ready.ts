import { ActivityType, Client, Events } from 'discord.js';
import { getSettings } from '../database/db';
import { BotEvent } from '../types';
import { logger } from '../utils/logger';

const event: BotEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>) {
    client.guilds.cache.forEach((g) => getSettings(g.id));
    client.user.setPresence({ activities: [{ name: 'the clan • /help', type: ActivityType.Watching }], status: 'dnd' });
    logger.info(`V1p3rx online as ${client.user.tag} in ${client.guilds.cache.size} server(s)`);
  },
};
export default event;
