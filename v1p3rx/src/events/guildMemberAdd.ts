import { Events, GuildMember } from 'discord.js';
import { getSettings } from '../database/db';
import { checkRaid } from '../systems/antiraid';
import { renderTemplate } from '../systems/welcome';
import { BotEvent } from '../types';
import { COLORS, embed } from '../utils/embeds';
import { logger } from '../utils/logger';

const event: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(member: GuildMember) {
    const s = getSettings(member.guild.id);
    await checkRaid(member);

    if (s.welcome_role) {
      await member.roles.add(s.welcome_role, 'V1p3rx auto-role').catch((e) => logger.warn(`Auto-role failed in ${member.guild.id}`, e as Error));
    }
    if (!s.welcome_channel) return;
    const ch = await member.guild.channels.fetch(s.welcome_channel).catch(() => null);
    if (!ch?.isTextBased() || !('send' in ch)) return;
    const text = renderTemplate(s.welcome_message ?? 'Welcome {user} to **{server}**. You are member **#{count}**. Register your IGN with `/register`.', member);
    await ch.send({
      content: `${member}`,
      embeds: [embed(`Welcome to ${member.guild.name}`, text, COLORS.primary).setThumbnail(member.displayAvatarURL({ size: 256 }))],
      allowedMentions: { users: [member.id] },
    });
  },
};
export default event;
