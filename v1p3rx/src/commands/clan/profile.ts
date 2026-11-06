import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database/db';
import { Command } from '../../types';
import { embed, errorEmbed } from '../../utils/embeds';

interface Row { ign: string; rank: string; registered_at: number; last_active: number | null; message_count: number }

const command: Command = {
  data: new SlashCommandBuilder().setName('profile').setDescription('View a clan member profile')
    .addUserOption((o) => o.setName('user').setDescription('Defaults to you')),
  async execute(i) {
    const user = i.options.getUser('user') ?? i.user;
    const row = db.prepare('SELECT ign, rank, registered_at, last_active, message_count FROM clan_members WHERE guild_id = ? AND user_id = ?').get(i.guildId, user.id) as Row | undefined;
    if (!row) return void (await i.reply({ embeds: [errorEmbed(`${user.username} hasn't registered. Use \`/register\`.`)], flags: MessageFlags.Ephemeral }));
    await i.reply({
      embeds: [embed(`${row.ign}`, `${user}`).setThumbnail(`https://mc-heads.net/avatar/${encodeURIComponent(row.ign)}/128`).addFields(
        { name: 'Rank', value: row.rank, inline: true },
        { name: 'Registered', value: `<t:${Math.floor(row.registered_at / 1000)}:R>`, inline: true },
        { name: 'Last active', value: row.last_active ? `<t:${Math.floor(row.last_active / 1000)}:R>` : 'No activity yet', inline: true },
        { name: 'Activity', value: `${row.message_count} tracked message-minute(s)`, inline: true },
      )],
    });
  },
};
export default command;
