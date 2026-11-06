import { SlashCommandBuilder } from 'discord.js';
import { db } from '../../database/db';
import { getLevel, LEVEL_NAMES } from '../../systems/permissions';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('userinfo').setDescription('Info about a member')
    .addUserOption((o) => o.setName('user').setDescription('Defaults to you')),
  async execute(i) {
    const user = i.options.getUser('user') ?? i.user;
    const member = await i.guild!.members.fetch(user.id).catch(() => null);
    const clan = db.prepare('SELECT ign, rank FROM clan_members WHERE guild_id = ? AND user_id = ?').get(i.guildId, user.id) as { ign: string; rank: string } | undefined;
    const e = embed(user.username).setThumbnail(user.displayAvatarURL({ size: 256 })).addFields(
      { name: 'ID', value: `\`${user.id}\``, inline: true },
      { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
    );
    if (member) {
      const roles = member.roles.cache.filter((r) => r.id !== i.guildId).sort((a, b) => b.position - a.position).map((r) => `${r}`);
      e.addFields(
        { name: 'Joined server', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
        { name: 'V1p3rx level', value: LEVEL_NAMES[getLevel(member)], inline: true },
        { name: `Roles (${roles.length})`, value: roles.slice(0, 15).join(' ') || 'None' },
      );
    }
    if (clan) e.addFields({ name: 'Clan', value: `IGN \`${clan.ign}\` • ${clan.rank}`, inline: true });
    await i.reply({ embeds: [e] });
  },
};
export default command;
