import { SlashCommandBuilder, version as djsVersion } from 'discord.js';
import { formatDuration } from '../../systems/moderation';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('botinfo').setDescription('About V1p3rx'),
  async execute(i) {
    await i.reply({ embeds: [embed('V1p3rx', 'Custom clan bot for competitive Minecraft PvP.').addFields(
      { name: 'Servers', value: String(i.client.guilds.cache.size), inline: true },
      { name: 'Uptime', value: formatDuration(Math.floor(process.uptime())), inline: true },
      { name: 'Memory', value: `${(process.memoryUsage().rss / 1048576).toFixed(0)} MB`, inline: true },
      { name: 'Runtime', value: `Node ${process.version} • discord.js ${djsVersion}`, inline: false },
    )] });
  },
};
export default command;
