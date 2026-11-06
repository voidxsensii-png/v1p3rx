import { Events, GuildMember, PartialGuildMember } from 'discord.js';
import { getSettings } from '../database/db';
import { BotEvent } from '../types';
import { COLORS, embed } from '../utils/embeds';

const event: BotEvent = {
  name: Events.GuildMemberRemove,
  async execute(member: GuildMember | PartialGuildMember) {
    const s = getSettings(member.guild.id);
    if (!s.goodbye_channel) return;
    const ch = await member.guild.channels.fetch(s.goodbye_channel).catch(() => null);
    if (!ch?.isTextBased() || !('send' in ch)) return;
    const name = member.user?.tag ?? 'A member';
    await ch.send({
      embeds: [embed('Goodbye', `**${name}** left the server. We're now **${member.guild.memberCount}** members.`, COLORS.gray)],
      allowedMentions: { parse: [] },
    });
  },
};
export default event;
