import { SlashCommandBuilder } from 'discord.js';
import { db } from '../../database/db';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

export const RANKS = ['Leader', 'Co-Leader', 'Officer', 'Elite', 'Member', 'Recruit'];

const command: Command = {
  data: new SlashCommandBuilder().setName('roster').setDescription('Show the clan roster'),
  async execute(i) {
    const rows = db.prepare('SELECT user_id, ign, rank FROM clan_members WHERE guild_id = ? ORDER BY lower(ign)').all(i.guildId) as { user_id: string; ign: string; rank: string }[];
    const e = embed('Clan Roster', rows.length ? `**${rows.length}** registered member(s)` : 'Nobody has registered yet. Use `/register`.');
    for (const rank of RANKS) {
      const list = rows.filter((r) => r.rank === rank);
      if (!list.length) continue;
      const shown = list.slice(0, 20).map((r) => `<@${r.user_id}> — \`${r.ign}\``);
      if (list.length > 20) shown.push(`…and ${list.length - 20} more`);
      e.addFields({ name: `${rank} (${list.length})`, value: shown.join('\n').slice(0, 1024) });
    }
    await i.reply({ embeds: [e], allowedMentions: { parse: [] } });
  },
};
export default command;
