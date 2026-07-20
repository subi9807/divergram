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
const logHandlersTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'ios',
  'Core',
  'Logging',
  'LogHandlers.swift'
);
const loggerTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'ios',
  'Core',
  'Logging',
  'Logger.swift'
);
const locationModuleTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-location',
  'ios',
  'LocationModule.swift'
);
const expoSqliteCompatibilitySource = path.join(__dirname, 'templates', 'ExpoSQLiteCompatibility.swift');
const expoSqliteCompatibilityTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-sqlite',
  'ios',
  'ExpoSQLiteCompatibility.swift'
);
const expoSqliteCompatTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-sqlite',
  'ios',
  'SQLiteCompat.swift'
);
const expoSqliteVendorSourceDir = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'vendor', 'sqlite3');
const expoSqliteIosSourceDir = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'ios');
const googleMobileAdsModuleTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-google-mobile-ads',
  'ios',
  'RNGoogleMobileAds',
  'RNGoogleMobileAdsModule.mm'
);
const linuxHermesCompilerTarget = path.join(
  __dirname,
  '..',
  'node_modules',
  'hermes-compiler',
  'hermesc',
  'linux64-bin',
  'hermesc'
);

if (fs.existsSync(linuxHermesCompilerTarget)) {
  fs.chmodSync(linuxHermesCompilerTarget, 0o755);
  console.log('[fix-expo-xcframework] Restored executable permission for the Linux Hermes compiler.');
}

const marker = "    console.error(`${LOG_PREFIX} ${moduleName}: Directory not found: ${xcframeworksDir}`);\n    process.exit(1);\n";
const replacement = "    console.log(`${LOG_PREFIX} ${moduleName}: Directory not found: ${xcframeworksDir}, skipping.`);\n    return;\n";

if (!fs.existsSync(target)) {
  console.error(`[fix-expo-xcframework] Target not found: ${target}`);
  process.exit(0);
}

const original = fs.readFileSync(target, 'utf8');
if (original.includes(replacement)) {
  console.log('[fix-expo-xcframework] replace-xcframework.js already patched.');
} else if (!original.includes(marker)) {
  console.error('[fix-expo-xcframework] Marker not found; no changes made.');
  process.exit(1);
} else {
  fs.writeFileSync(target, original.replace(marker, replacement));
  console.log('[fix-expo-xcframework] Patched replace-xcframework.js to skip missing XCFramework directories.');
}

if (fs.existsSync(logHandlersTarget)) {
  const logHandlersSource = fs.readFileSync(logHandlersTarget, 'utf8');
  const logHandlersMarker = "public func createOSLogHandler(category: String) -> LogHandler {\n";
  const logHandlersPatch = "public func createOSLogHandler(category: String) -> LogHandler {\n  #if targetEnvironment(simulator)\n  return PrintLogHandler()\n  #endif\n";

  if (logHandlersSource.includes("#if targetEnvironment(simulator)")) {
    console.log('[fix-expo-xcframework] LogHandlers.swift already patched for simulator logging.');
  } else if (logHandlersSource.includes(logHandlersMarker)) {
    fs.writeFileSync(logHandlersTarget, logHandlersSource.replace(logHandlersMarker, logHandlersPatch));
    console.log('[fix-expo-xcframework] Patched LogHandlers.swift to use PrintLogHandler on simulator.');
  } else {
    console.error('[fix-expo-xcframework] LogHandlers.swift marker not found; no simulator logging patch applied.');
    process.exit(1);
  }
}

if (fs.existsSync(loggerTarget)) {
  let loggerSource = fs.readFileSync(loggerTarget, 'utf8');
  const importMarker = "import Dispatch\n";
  const importPatch = "import Dispatch\n#if os(iOS)\nimport UIKit\n#endif\n";
  const minLevelMarker = "  #if DEBUG || EXPO_CONFIGURATION_DEBUG\n  private var minLevel: LogType = .trace\n  #else\n  private var minLevel: LogType = .info\n  #endif\n";
  const minLevelPatch = "  #if targetEnvironment(simulator)\n  private var minLevel: LogType = .warn\n  #elseif DEBUG || EXPO_CONFIGURATION_DEBUG\n  private var minLevel: LogType = .trace\n  #else\n  private var minLevel: LogType = .info\n  #endif\n";

  if (!loggerSource.includes("#if os(iOS)\nimport UIKit\n#endif")) {
    if (!loggerSource.includes(importMarker)) {
      console.error('[fix-expo-xcframework] Logger.swift import marker not found; no import patch applied.');
      process.exit(1);
    }
    loggerSource = loggerSource.replace(importMarker, importPatch);
  }

  if (loggerSource.includes("private var minLevel: LogType = .warn")) {
    console.log('[fix-expo-xcframework] Logger.swift already patched for simulator minLevel.');
  } else if (loggerSource.includes(minLevelMarker)) {
    loggerSource = loggerSource.replace(minLevelMarker, minLevelPatch);
    fs.writeFileSync(loggerTarget, loggerSource);
    console.log('[fix-expo-xcframework] Patched Logger.swift to reduce simulator log volume.');
  } else {
    console.error('[fix-expo-xcframework] Logger.swift minLevel marker not found; no simulator minLevel patch applied.');
    process.exit(1);
  }
}

if (fs.existsSync(locationModuleTarget)) {
  const locationSource = fs.readFileSync(locationModuleTarget, 'utf8');
  const requesterLine = '          MotionActivityPermissionRequester(),\n';
  if (locationSource.includes(requesterLine)) {
    fs.writeFileSync(locationModuleTarget, locationSource.replace(requesterLine, ''));
    console.log('[fix-expo-xcframework] Patched LocationModule.swift to skip MotionActivityPermissionRequester registration.');
  } else {
    console.log('[fix-expo-xcframework] LocationModule.swift already patched for MotionActivityPermissionRequester.');
  }
}

if (fs.existsSync(expoSqliteCompatibilitySource)) {
  const compatibilitySource = fs.readFileSync(expoSqliteCompatibilitySource, 'utf8');
  const sqliteModuleTarget = path.join(
    __dirname,
    '..',
    'node_modules',
    'expo-sqlite',
    'ios',
    'SQLiteModule.swift'
  );
  if (fs.existsSync(sqliteModuleTarget)) {
    let sqliteModuleSource = fs.readFileSync(sqliteModuleTarget, 'utf8');
    const expoSQLiteImportLine = 'import ExpoSQLite\n';
    if (!sqliteModuleSource.includes(expoSQLiteImportLine)) {
      const updated = sqliteModuleSource.replace(
        'import ExpoModulesCore\n',
        'import ExpoModulesCore\nimport ExpoSQLite\n'
      );
      if (updated !== sqliteModuleSource) {
        fs.writeFileSync(sqliteModuleTarget, updated);
        sqliteModuleSource = updated;
        console.log('[fix-expo-xcframework] Injected import ExpoSQLite into SQLiteModule.swift.');
      }
    }

    const injectedCompatibilitySource = `${expoSQLiteImportLine}\n${compatibilitySource}\n`;
    if (sqliteModuleSource.includes(injectedCompatibilitySource)) {
      const updated = sqliteModuleSource.replace(injectedCompatibilitySource, expoSQLiteImportLine);
      fs.writeFileSync(sqliteModuleTarget, updated);
      sqliteModuleSource = updated;
      console.log('[fix-expo-xcframework] Removed obsolete ExpoSQLite compatibility declarations from SQLiteModule.swift.');
    }

    const legacyCompatibilityPattern =
      /\ntypealias ExpoSQLiteUpdateHookCallback = @convention\(c\)[\s\S]*?\n@_silgen_name\("exsqlite3_next_stmt"\)\nfunc exsqlite3_next_stmt\(_ db: OpaquePointer\?, _ statement: OpaquePointer\?\) -> OpaquePointer\?\n/;
    if (legacyCompatibilityPattern.test(sqliteModuleSource)) {
      const updated = sqliteModuleSource.replace(legacyCompatibilityPattern, '\n');
      fs.writeFileSync(sqliteModuleTarget, updated);
      sqliteModuleSource = updated;
      console.log('[fix-expo-xcframework] Removed legacy inline ExpoSQLite compatibility declarations from SQLiteModule.swift.');
    } else {
      console.log('[fix-expo-xcframework] SQLiteModule.swift does not contain inline ExpoSQLite compatibility declarations.');
    }

    const inlineCoreCompatibilityPattern =
      /import ExpoSQLite\n[\s\S]*?\nprivate typealias SQLiteColumnNames/;
    if (inlineCoreCompatibilityPattern.test(sqliteModuleSource)) {
      const updated = sqliteModuleSource.replace(
        inlineCoreCompatibilityPattern,
        'import ExpoSQLite\n\nprivate typealias SQLiteColumnNames'
      );
      fs.writeFileSync(sqliteModuleTarget, updated);
      sqliteModuleSource = updated;
      console.log('[fix-expo-xcframework] Removed inline ExpoSQLite bridge declarations; using ExpoSQLite module exports.');
    } else {
      console.log('[fix-expo-xcframework] SQLiteModule.swift has no inline ExpoSQLite bridge declarations.');
    }

    const vendoredSymbols = 'exsqlite3_backup_finish exsqlite3_backup_init exsqlite3_backup_step exsqlite3_bind_blob exsqlite3_bind_double exsqlite3_bind_int exsqlite3_bind_int64 exsqlite3_bind_null exsqlite3_bind_parameter_index exsqlite3_bind_text exsqlite3_changes exsqlite3_clear_bindings exsqlite3_close exsqlite3_column_blob exsqlite3_column_bytes exsqlite3_column_count exsqlite3_column_double exsqlite3_column_int64 exsqlite3_column_name exsqlite3_column_text exsqlite3_column_type exsqlite3_db_filename exsqlite3_deserialize exsqlite3_enable_load_extension exsqlite3_errcode exsqlite3_errmsg exsqlite3_exec exsqlite3_finalize exsqlite3_free exsqlite3_get_autocommit exsqlite3_last_insert_rowid exsqlite3_load_extension exsqlite3_malloc64 exsqlite3_next_stmt exsqlite3_open exsqlite3_prepare_v2 exsqlite3_reset exsqlite3_serialize exsqlite3_step exsqlite3_update_hook exsqlite3changeset_apply exsqlite3changeset_invert exsqlite3session_attach exsqlite3session_changeset exsqlite3session_create exsqlite3session_delete exsqlite3session_enable'.split(' ');
    let vendoredSQLiteModuleSource = sqliteModuleSource;
    for (const vendoredSymbol of vendoredSymbols) {
      const systemSymbol = vendoredSymbol.slice(2);
      vendoredSQLiteModuleSource = vendoredSQLiteModuleSource.replace(
        new RegExp(`\\b${systemSymbol}\\b`, 'g'),
        vendoredSymbol
      );
    }
    if (vendoredSQLiteModuleSource !== sqliteModuleSource) {
      fs.writeFileSync(sqliteModuleTarget, vendoredSQLiteModuleSource);
      sqliteModuleSource = vendoredSQLiteModuleSource;
      console.log('[fix-expo-xcframework] Patched SQLiteModule.swift to use vendored exsqlite3 symbols.');
    } else {
      console.log('[fix-expo-xcframework] SQLiteModule.swift already uses vendored exsqlite3 symbols.');
    }
  }

  if (!fs.existsSync(expoSqliteCompatibilityTarget)) {
    fs.writeFileSync(expoSqliteCompatibilityTarget, compatibilitySource);
    console.log('[fix-expo-xcframework] Restored ExpoSQLiteCompatibility.swift from template.');
  } else {
    const targetContents = fs.readFileSync(expoSqliteCompatibilityTarget, 'utf8');
    if (targetContents !== compatibilitySource) {
      fs.writeFileSync(expoSqliteCompatibilityTarget, compatibilitySource);
      console.log('[fix-expo-xcframework] Updated ExpoSQLiteCompatibility.swift from template.');
    } else {
      console.log('[fix-expo-xcframework] ExpoSQLiteCompatibility.swift already matches template.');
    }
  }
}

if (fs.existsSync(expoSqliteCompatTarget)) {
  let sqliteCompatSource = fs.readFileSync(expoSqliteCompatTarget, 'utf8');
  const sessionSymbols = [
    'sqlite3session_create',
    'sqlite3session_attach',
    'sqlite3session_enable',
    'sqlite3session_delete',
    'sqlite3session_changeset',
    'sqlite3changeset_apply',
    'sqlite3changeset_invert',
  ];

  for (const symbol of sessionSymbols) {
    sqliteCompatSource = sqliteCompatSource.replace(
      `@_silgen_name("${symbol}")`,
      `@_silgen_name("ex${symbol}")`
    );
  }

  const originalSqliteCompatSource = fs.readFileSync(expoSqliteCompatTarget, 'utf8');
  if (sqliteCompatSource !== originalSqliteCompatSource) {
    fs.writeFileSync(expoSqliteCompatTarget, sqliteCompatSource);
    console.log('[fix-expo-xcframework] Patched ExpoSQLite session bindings to use vendored exsqlite3 symbols.');
  } else {
    console.log('[fix-expo-xcframework] ExpoSQLite session bindings already use vendored symbols.');
  }
}

if (fs.existsSync(expoSqliteVendorSourceDir) && fs.existsSync(expoSqliteIosSourceDir)) {
  for (const file of ['sqlite3.c', 'sqlite3.h']) {
    const source = path.join(expoSqliteVendorSourceDir, file);
    const target = path.join(expoSqliteIosSourceDir, file);
    if (!fs.existsSync(source)) {
      continue;
    }
    const sourceContents = fs.readFileSync(source, 'utf8');
    if (!fs.existsSync(target)) {
      fs.writeFileSync(target, sourceContents);
      console.log(`[fix-expo-xcframework] Restored ExpoSQLite ${file} from vendor sources.`);
      continue;
    }
    const targetContents = fs.readFileSync(target, 'utf8');
    if (targetContents !== sourceContents) {
      fs.writeFileSync(target, sourceContents);
      console.log(`[fix-expo-xcframework] Updated ExpoSQLite ${file} from vendor sources.`);
    }
  }
}

if (fs.existsSync(googleMobileAdsModuleTarget)) {
  const googleMobileAdsSource = fs.readFileSync(googleMobileAdsModuleTarget, 'utf8');
  const ageRestrictedBlock = `  if (requestConfiguration[@"ageRestrictedTreatment"]) {
    NSString *ageRestrictedTreatment = requestConfiguration[@"ageRestrictedTreatment"];
    if ([ageRestrictedTreatment isEqualToString:@"child"]) {
      GADMobileAds.sharedInstance.requestConfiguration.ageRestrictedTreatment =
          GADAgeRestrictedTreatmentChild;
    } else if ([ageRestrictedTreatment isEqualToString:@"teen"]) {
      GADMobileAds.sharedInstance.requestConfiguration.ageRestrictedTreatment =
          GADAgeRestrictedTreatmentTeen;
    } else if ([ageRestrictedTreatment isEqualToString:@"unspecified"]) {
      GADMobileAds.sharedInstance.requestConfiguration.ageRestrictedTreatment =
          GADAgeRestrictedTreatmentUnspecified;
    }
  }
`;
  if (googleMobileAdsSource.includes(ageRestrictedBlock)) {
    fs.writeFileSync(googleMobileAdsModuleTarget, googleMobileAdsSource.replace(ageRestrictedBlock, ''));
    console.log('[fix-expo-xcframework] Patched RNGoogleMobileAdsModule.mm to skip unsupported ageRestrictedTreatment API.');
  } else {
    console.log('[fix-expo-xcframework] RNGoogleMobileAdsModule.mm already patched for ageRestrictedTreatment API.');
  }
}
