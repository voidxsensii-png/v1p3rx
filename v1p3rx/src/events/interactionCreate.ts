import { Events, GuildMember, Interaction } from 'discord.js';
import { getSettings } from '../database/db';
import { getLevel, LEVEL_NAMES, PermLevel } from '../systems/permissions';
import { BotEvent } from '../types';
import { alreadySeen } from '../utils/dedupe';
import { friendlyError, replyError } from '../utils/embeds';
import { logger } from '../utils/logger';

const event: BotEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;
    if (alreadySeen(interaction.id)) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;
    if (!interaction.inGuild() || !interaction.guild) {
      await replyError(interaction, 'V1p3rx commands only work inside a server.');
      return;
    }

    try {
      getSettings(interaction.guild.id);
      const member = (await interaction.guild.members.fetch(interaction.user.id)) as GuildMember;
      const required = command.minLevel ?? PermLevel.Guest;
      if (getLevel(member) < required) {
        await replyError(interaction, `You need **${LEVEL_NAMES[required]}** or higher to use \`/${command.data.name}\`.`);
        return;
      }
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Command /${interaction.commandName} failed`, err as Error);
      await replyError(interaction, friendlyError(err)).catch(() => undefined);
    }
  },
};
export default event;
