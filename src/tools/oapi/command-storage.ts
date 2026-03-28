/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * Quick command storage for the bot.
 * Stores and recalls frequently used commands.
 */

import type { ClawdbotConfig, OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import { registerTool, formatToolResult, json } from './helpers';

const json_fmt = formatToolResult;

// In-memory command storage (per account)
const commandStorage = new Map<string, Map<string, string>>();

/**
 * Get or create storage for an account
 */
function getAccountStorage(accountId: string): Map<string, string> {
  let storage = commandStorage.get(accountId);
  if (!storage) {
    storage = new Map();
    commandStorage.set(accountId, storage);
  }
  return storage;
}

// Schema
const CommandStorageSchema = Type.Object({
  action: Type.Union([
    Type.Literal('store'),
    Type.Literal('recall'),
    Type.Literal('list'),
    Type.Literal('delete'),
  ], {
    description: 'Action: store (save command), recall (get command), list (list all), delete (remove)',
  }),
  name: Type.Optional(Type.String({
    description: 'Name for the stored command (required for store/recall/delete)',
  })),
  command: Type.Optional(Type.String({
    description: 'The command text to store (required for store action)',
  })),
}, {
  description: 'Quick command storage tool for storing and recalling frequently used commands',
});

type CommandStorageParams = {
  action: 'store' | 'recall' | 'list' | 'delete';
  name?: string;
  command?: string;
};

/**
 * Register the command storage tool
 */
export function registerCommandStorageTool(api: OpenClawPluginApi): void {
  if (!api.config) return;

  const cfg = api.config;

  registerTool(
    api,
    {
      name: 'feishu_command_storage',
      label: 'Command Storage',
      description: 'Store and recall frequently used commands. Use store to save a command with a name, recall to retrieve it, list to see all stored commands, and delete to remove a command.',
      parameters: CommandStorageSchema,

      async execute(toolCallId: string, params: unknown) {
        const p = params as CommandStorageParams;
        const accountId = 'default'; // Could be made dynamic in multi-account setups

        const storage = getAccountStorage(accountId);

        switch (p.action) {
          case 'store': {
            if (!p.name || !p.command) {
              return json_fmt({ error: 'name and command are required for store action' });
            }
            storage.set(p.name, p.command);
            return json_fmt({ success: true, message: `Command "${p.name}" stored` });
          }

          case 'recall': {
            if (!p.name) {
              return json_fmt({ error: 'name is required for recall action' });
            }
            const command = storage.get(p.name);
            if (!command) {
              return json_fmt({ error: `Command "${p.name}" not found` });
            }
            return json_fmt({ name: p.name, command });
          }

          case 'list': {
            const commands: Record<string, string> = {};
            for (const [name, cmd] of storage.entries()) {
              commands[name] = cmd;
            }
            return json_fmt({ commands });
          }

          case 'delete': {
            if (!p.name) {
              return json_fmt({ error: 'name is required for delete action' });
            }
            const deleted = storage.delete(p.name);
            if (!deleted) {
              return json_fmt({ error: `Command "${p.name}" not found` });
            }
            return json_fmt({ success: true, message: `Command "${p.name}" deleted` });
          }

          default:
            return json_fmt({ error: `Unknown action: ${(p as any).action}` });
        }
      },
    },
    { name: 'feishu_command_storage' },
  );

  api.logger.debug?.('feishu_command_storage: Registered command storage tool');
}
