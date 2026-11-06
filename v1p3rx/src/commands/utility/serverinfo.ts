import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Info about this server'),
  async execute(i) {
    const g = i.guild!;
    const e = embed(g.name).addFields(
      { name: 'Owner', value: `<@${g.ownerId}>`, inline: true },
      { name: 'Members', value: String(g.memberCount), inline: true },
      { name: 'Channels', value: String(g.channels.cache.size), inline: true },
      { name: 'Roles', value: String(g.roles.cache.size), inline: true },
      { name: 'Boosts', value: String(g.premiumSubscriptionCount ?? 0), inline: true },
      { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
    );
    const icon = g.iconURL({ size: 256 });
    if (icon) e.setThumbnail(icon);
    await i.reply({ embeds: [e] });
  },
};
export default command;
