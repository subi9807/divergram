#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const compiler = path.join(
  __dirname,
  '..',
  'node_modules',
  'hermes-compiler',
  'hermesc',
  process.platform === 'darwin' ? 'osx-bin' : 'linux64-bin',
  'hermesc'
);

if (!fs.existsSync(compiler)) {
  throw new Error(`Hermes compiler was not installed at ${compiler}`);
}

fs.chmodSync(compiler, 0o755);
console.log(`[ensure-hermes-executable] Ready: ${compiler}`);
