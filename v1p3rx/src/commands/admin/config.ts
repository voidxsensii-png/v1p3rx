import { ChannelType, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { db, getSettings, GuildSettings, updateSetting } from '../../database/db';
import { getLevel, LEVEL_NAMES, PermLevel } from '../../systems/permissions';
import { Command } from '../../types';
import { embed, errorEmbed, successEmbed } from '../../utils/embeds';

const TEXT = [ChannelType.GuildText, ChannelType.GuildAnnouncement] as const;
const levelChoices = [PermLevel.Member, PermLevel.TrialModerator, PermLevel.Moderator, PermLevel.Admin, PermLevel.Manager, PermLevel.CoOwner, PermLevel.Owner]
  .map((l) => ({ name: LEVEL_NAMES[l], value: l }));

const command: Command = {
  minLevel: PermLevel.Admin,
  data: new SlashCommandBuilder().setName('config').setDescription('Configure V1p3rx for this server')
    .addSubcommand((s) => s.setName('view').setDescription('Show current configuration'))
    .addSubcommand((s) => s.setName('role').setDescription('Map a Discord role to a V1p3rx permission level (Owner only)')
      .addIntegerOption((o) => o.setName('level').setDescription('Permission level').setRequired(true).addChoices(...levelChoices))
      .addRoleOption((o) => o.setName('role').setDescription('Discord role').setRequired(true)))
    .addSubcommand((s) => s.setName('channel').setDescription('Set a channel for logs / welcome / goodbye')
      .addStringOption((o) => o.setName('type').setDescription('Which channel').setRequired(true).addChoices(
        { name: 'Mod logs', value: 'log_channel' }, { name: 'Welcome', value: 'welcome_channel' }, { name: 'Goodbye', value: 'goodbye_channel' }))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel (leave empty to clear)').addChannelTypes(...TEXT)))
    .addSubcommand((s) => s.setName('welcome').setDescription('Set auto-role and welcome text')
      .addRoleOption((o) => o.setName('role').setDescription('Role given to new members'))
      .addStringOption((o) => o.setName('message').setDescription('Placeholders: {user} {server} {count}').setMaxLength(500)))
    .addSubcommand((s) => s.setName('ai-channel').setDescription('Enable/disable AI chat in a channel')
      .addStringOption((o) => o.setName('action').setDescription('Add or remove').setRequired(true).addChoices({ name: 'Add', value: 'add' }, { name: 'Remove', value: 'remove' }))
      .addChannelOption((o) => o.setName('channel').setDescription('Channel').setRequired(true).addChannelTypes(...TEXT)))
    .addSubcommand((s) => s.setName('toggle').setDescription('Turn a module on or off')
      .addStringOption((o) => o.setName('module').setDescription('Module').setRequired(true).addChoices(
        { name: 'Anti-spam', value: 'automod_spam' }, { name: 'Anti-link', value: 'automod_links' },
        { name: 'Anti-mention spam', value: 'automod_mentions' }, { name: 'Anti-raid', value: 'antiraid' }, { name: 'AI chat', value: 'ai_enabled' }))
      .addBooleanOption((o) => o.setName('enabled').setDescription('On or off').setRequired(true)))
    .addSubcommand((s) => s.setName('thresholds').setDescription('Warning punishment thresholds & mention limit')
      .addIntegerOption((o) => o.setName('timeout_at').setDescription('Auto-timeout at N warnings (0 = off)').setMinValue(0).setMaxValue(50))
      .addIntegerOption((o) => o.setName('timeout_minutes').setDescription('Auto-timeout length in minutes').setMinValue(1).setMaxValue(40320))
      .addIntegerOption((o) => o.setName('ban_at').setDescription('Auto-ban at N warnings (0 = off)').setMinValue(0).setMaxValue(50))
      .addIntegerOption((o) => o.setName('mention_limit').setDescription('Mentions per message before automod acts').setMinValue(2).setMaxValue(50))),
  async execute(i) {
    const gid = i.guildId!;
    const sub = i.options.getSubcommand();
    const ok = (m: string) => i.reply({ embeds: [successEmbed(m, 'Saved')], flags: MessageFlags.Ephemeral });

    if (sub === 'view') {
      const s = getSettings(gid);
      const roles = db.prepare('SELECT level, role_id FROM guild_roles WHERE guild_id = ? ORDER BY level DESC').all(gid) as { level: number; role_id: string }[];
      const ai = db.prepare('SELECT channel_id FROM ai_channels WHERE guild_id = ?').all(gid) as { channel_id: string }[];
      const ch = (id: string | null) => (id ? `<#${id}>` : '`not set`');
      const on = (v: number) => (v ? 'on' : 'off');
      const e = embed('V1p3rx • Configuration').addFields(
        { name: 'Permission roles', value: roles.map((r) => `**${LEVEL_NAMES[r.level]}** → <@&${r.role_id}>`).join('\n') || '`none (server owner only)`' },
        { name: 'Channels', value: `Logs: ${ch(s.log_channel)}\nWelcome: ${ch(s.welcome_channel)}\nGoodbye: ${ch(s.goodbye_channel)}`, inline: true },
        { name: 'Welcome', value: `Auto-role: ${s.welcome_role ? `<@&${s.welcome_role}>` : '`none`'}\nCustom text: ${s.welcome_message ? 'yes' : 'default'}`, inline: true },
        { name: 'Automod', value: `Spam: ${on(s.automod_spam)} • Links: ${on(s.automod_links)} • Mentions: ${on(s.automod_mentions)} (limit ${s.mention_limit}) • Anti-raid: ${on(s.antiraid)}` },
        { name: 'Warn thresholds', value: `Timeout at ${s.warn_timeout_at || 'off'} (${s.warn_timeout_minutes}m) • Ban at ${s.warn_ban_at || 'off'}` },
        { name: 'AI', value: `${on(s.ai_enabled)} • channels: ${ai.map((a) => `<#${a.channel_id}>`).join(' ') || '`none (mention only)`'}` },
      );
      return void (await i.reply({ embeds: [e], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }));
    }

    if (sub === 'role') {
      const mod = await i.guild!.members.fetch(i.user.id);
      if (getLevel(mod) < PermLevel.Owner) return void (await i.reply({ embeds: [errorEmbed('Only the **Owner** can map permission roles.')], flags: MessageFlags.Ephemeral }));
      const level = i.options.getInteger('level', true);
      const role = i.options.getRole('role', true);
      if (role.id === gid) return void (await i.reply({ embeds: [errorEmbed('You cannot map @everyone.')], flags: MessageFlags.Ephemeral }));
      db.prepare('INSERT INTO guild_roles (guild_id, level, role_id) VALUES (?, ?, ?) ON CONFLICT (guild_id, level) DO UPDATE SET role_id = excluded.role_id').run(gid, level, role.id);
      return void (await ok(`**${LEVEL_NAMES[level]}** is now mapped to <@&${role.id}>.`));
    }
    if (sub === 'channel') {
      const key = i.options.getString('type', true) as keyof GuildSettings;
      const ch = i.options.getChannel('channel');
      updateSetting(gid, key, ch?.id ?? null);
      return void (await ok(ch ? `Set to ${ch}.` : 'Cleared.'));
    }
    if (sub === 'welcome') {
      const role = i.options.getRole('role');
      const msg = i.options.getString('message');
      if (!role && !msg) return void (await i.reply({ embeds: [errorEmbed('Provide a role and/or a message.')], flags: MessageFlags.Ephemeral }));
      if (role) updateSetting(gid, 'welcome_role', role.id);
      if (msg) updateSetting(gid, 'welcome_message', msg);
      return void (await ok('Welcome settings updated.'));
    }
    if (sub === 'ai-channel') {
      const ch = i.options.getChannel('channel', true);
      if (i.options.getString('action', true) === 'add') db.prepare('INSERT OR IGNORE INTO ai_channels (guild_id, channel_id) VALUES (?, ?)').run(gid, ch.id);
      else db.prepare('DELETE FROM ai_channels WHERE guild_id = ? AND channel_id = ?').run(gid, ch.id);
      return void (await ok(`AI channel list updated for ${ch}.`));
    }
    if (sub === 'toggle') {
      const key = i.options.getString('module', true) as keyof GuildSettings;
      const on = i.options.getBoolean('enabled', true);
      updateSetting(gid, key, on ? 1 : 0);
      return void (await ok(`Module is now **${on ? 'enabled' : 'disabled'}**.`));
    }
    if (sub === 'thresholds') {
      const map: [string, keyof GuildSettings][] = [['timeout_at', 'warn_timeout_at'], ['timeout_minutes', 'warn_timeout_minutes'], ['ban_at', 'warn_ban_at'], ['mention_limit', 'mention_limit']];
      let changed = 0;
      for (const [opt, key] of map) {
        const v = i.options.getInteger(opt);
        if (v !== null) { updateSetting(gid, key, v); changed++; }
      }
      return void (changed ? await ok('Thresholds updated.') : await i.reply({ embeds: [errorEmbed('Provide at least one value.')], flags: MessageFlags.Ephemeral }));
    }
  },
};
export default command;
