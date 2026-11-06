import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getLevel, LEVEL_NAMES, PermLevel } from '../../systems/permissions';
import { Command } from '../../types';
import { embed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('See what V1p3rx can do'),
  async execute(i) {
    const member = await i.guild!.members.fetch(i.user.id);
    const level = getLevel(member);
    const groups = new Map<string, string[]>();
    for (const c of i.client.commands.values()) {
      if ((c.minLevel ?? PermLevel.Guest) > level) continue;
      const line = `\`/${c.data.name}\` — ${c.data.description}`;
      groups.set(c.category, [...(groups.get(c.category) ?? []), line]);
    }
    const e = embed('V1p3rx • Command Center', `Showing commands available to **${LEVEL_NAMES[level]}**.`);
    for (const [cat, lines] of groups) e.addFields({ name: cat.toUpperCase(), value: lines.join('\n').slice(0, 1024) });
    e.addFields({ name: 'AI', value: 'Mention me or talk in an AI-enabled channel.' });
    await i.reply({ embeds: [e], flags: MessageFlags.Ephemeral });
  },
};
export default command;
