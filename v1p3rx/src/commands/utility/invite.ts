import { MessageFlags, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const P = PermissionsBitField.Flags;
const PERMS = new PermissionsBitField([P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ReadMessageHistory, P.ManageMessages, P.ManageChannels, P.ManageRoles, P.KickMembers, P.BanMembers, P.ModerateMembers]);

const command: Command = {
  data: new SlashCommandBuilder().setName('invite').setDescription('Get the bot invite link'),
  async execute(i) {
    const url = `https://discord.com/oauth2/authorize?client_id=${i.client.user.id}&permissions=${PERMS.bitfield}&scope=bot%20applications.commands`;
    await i.reply({ embeds: [embed('Invite V1p3rx', `[Click here to add V1p3rx to a server](${url})`)], flags: MessageFlags.Ephemeral });
  },
};
export default command;
