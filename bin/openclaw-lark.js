#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

// --tools-version <ver> lets the user pin a specific version
const args = process.argv.slice(2);
let version = 'latest';

const vIdx = args.indexOf('--tools-version');
if (vIdx !== -1) {
  version = args[vIdx + 1];
  // Remove --tools-version <ver> from forwarded args
  args.splice(vIdx, 2);
}

// Check for --silent flag to suppress interactive prompts
const silentIdx = args.indexOf('--silent');
const silent = silentIdx !== -1;
if (silentIdx !== -1) {
  args.splice(silentIdx, 1);
}

const baseArgs = ['--prefer-online', `@larksuite/openclaw-lark-tools@${version}`];
// Add --yes only if not silent (--silent handles prompts differently)
const allArgs = silent ? baseArgs : ['--yes', ...baseArgs, ...args];

try {
  if (process.platform === 'win32') {
    // On Windows, npx is a .cmd shim that can be broken or trigger
    // DEP0190. Bypass it entirely: run node with the npx-cli.js
    // script located next to the running node binary.
    const npxCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
    execFileSync(process.execPath, [npxCli, ...allArgs], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '--disable-warning=DEP0190'].filter(Boolean).join(' '),
      },
    });
  } else {
    execFileSync('npx', silent ? [...allArgs, '--quiet'] : allArgs, { stdio: 'inherit' });
  }
} catch (error) {
  process.exit(error.status ?? 1);
}
