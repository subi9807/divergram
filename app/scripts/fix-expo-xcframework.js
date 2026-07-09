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
  }

  if (fs.existsSync(expoSqliteCompatibilityTarget)) {
    fs.rmSync(expoSqliteCompatibilityTarget);
    console.log('[fix-expo-xcframework] Removed obsolete ExpoSQLiteCompatibility.swift.');
  } else {
    console.log('[fix-expo-xcframework] ExpoSQLiteCompatibility.swift is already absent.');
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
