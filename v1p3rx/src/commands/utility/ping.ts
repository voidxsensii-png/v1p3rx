import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  async execute(i) {
    const sent = await i.reply({ embeds: [embed('Pinging…')], withResponse: true });
    const rtt = sent.resource!.message!.createdTimestamp - i.createdTimestamp;
    await i.editReply({ embeds: [embed('Pong', `**Round-trip:** \`${rtt}ms\`\n**API heartbeat:** \`${Math.round(i.client.ws.ping)}ms\``)] });
  },
};
export default command;
