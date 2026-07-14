#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const platformDir = process.platform === 'darwin' ? 'osx-bin' : 'linux64-bin';
const linkedCompiler = path.join(
  __dirname,
  '..',
  'node_modules',
  'hermes-compiler',
  'hermesc',
  platformDir,
  'hermesc'
);

const pnpmStore = path.join(__dirname, '..', 'node_modules', '.pnpm');
const storedCompiler = fs.existsSync(pnpmStore)
  ? fs
      .readdirSync(pnpmStore)
      .filter((entry) => entry.startsWith('hermes-compiler@'))
      .map((entry) =>
        path.join(pnpmStore, entry, 'node_modules', 'hermes-compiler', 'hermesc', platformDir, 'hermesc')
      )
      .find((candidate) => fs.existsSync(candidate))
  : undefined;
const compiler = fs.existsSync(linkedCompiler) ? linkedCompiler : storedCompiler;

if (!compiler) {
  throw new Error('Hermes compiler was not installed in the linked or pnpm store paths');
}

fs.chmodSync(compiler, 0o755);
console.log(`[ensure-hermes-executable] Ready: ${compiler}`);
