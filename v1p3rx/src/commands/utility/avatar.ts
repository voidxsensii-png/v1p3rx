import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('avatar').setDescription("Show a user's avatar")
    .addUserOption((o) => o.setName('user').setDescription('Defaults to you')),
  async execute(i) {
    const u = i.options.getUser('user') ?? i.user;
    await i.reply({ embeds: [embed(`${u.username}'s avatar`).setImage(u.displayAvatarURL({ size: 1024 }))] });
  },
};
export default command;
