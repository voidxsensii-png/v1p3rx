import { ChatInputCommandInteraction, Collection, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { PermLevel } from './systems/permissions';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
  /** Minimum V1p3rx permission level (default: Guest). */
  minLevel?: PermLevel;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
export interface LoadedCommand extends Command {
  category: string;
}
export interface BotEvent {
  name: string;
  once?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(...args: any[]): Promise<void> | void;
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, LoadedCommand>;
  }
}
