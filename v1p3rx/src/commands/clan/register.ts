import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db } from '../../database/db';
import { Command } from '../../types';
import { errorEmbed, successEmbed } from '../../utils/embeds';

const command: Command = {
  data: new SlashCommandBuilder().setName('register').setDescription('Register (or update) your Minecraft IGN')
    .addStringOption((o) => o.setName('ign').setDescription('Your Minecraft username').setRequired(true).setMinLength(3).setMaxLength(16)),
  async execute(i) {
    const ign = i.options.getString('ign', true).trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(ign)) {
      return void (await i.reply({ embeds: [errorEmbed('That is not a valid Minecraft username (3-16 letters, numbers or underscores).')], flags: MessageFlags.Ephemeral }));
    }
    const taken = db.prepare('SELECT user_id FROM clan_members WHERE guild_id = ? AND lower(ign) = lower(?) AND user_id != ?').get(i.guildId, ign, i.user.id);
    if (taken) return void (await i.reply({ embeds: [errorEmbed('That IGN is already registered by another member.')], flags: MessageFlags.Ephemeral }));
    db.prepare(`INSERT INTO clan_members (guild_id, user_id, ign, registered_at) VALUES (?, ?, ?, ?)
      ON CONFLICT (guild_id, user_id) DO UPDATE SET ign = excluded.ign`).run(i.guildId, i.user.id, ign, Date.now());
    await i.reply({ embeds: [successEmbed(`You're registered as \`${ign}\`.`, 'Registered')], flags: MessageFlags.Ephemeral });
  },
};
export default command;
