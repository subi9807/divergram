// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  { ignores: ["dist/**", ".expo/**", ".codex-artifacts/**", "ios/**", "android/**", "node_modules/**"] },
  expoConfig,
  {
    ignores: ["dist/**", ".expo/**", "ios/build-simulator/**", "android/app/build/**"],
    // React Compiler is not enabled for this Expo app; keep runtime lint rules
    // without treating compiler-only optimization guidance as build failures.
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  }
]);
