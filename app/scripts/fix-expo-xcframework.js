#!/usr/bin/env node
/* global __dirname */
const fs = require('fs');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-autolinking',
  'scripts',
  'ios',
  'replace-xcframework.js'
);

const marker = "    console.error(`${LOG_PREFIX} ${moduleName}: Directory not found: ${xcframeworksDir}`);\n    process.exit(1);\n";
const replacement = "    console.log(`${LOG_PREFIX} ${moduleName}: Directory not found: ${xcframeworksDir}, skipping.`);\n    return;\n";

if (!fs.existsSync(target)) {
  console.error(`[fix-expo-xcframework] Target not found: ${target}`);
  process.exit(0);
}

const original = fs.readFileSync(target, 'utf8');
if (original.includes(replacement)) {
  console.log('[fix-expo-xcframework] Already patched.');
  process.exit(0);
}

if (!original.includes(marker)) {
  console.error('[fix-expo-xcframework] Marker not found; no changes made.');
  process.exit(1);
}

fs.writeFileSync(target, original.replace(marker, replacement));
console.log('[fix-expo-xcframework] Patched replace-xcframework.js to skip missing XCFramework directories.');
