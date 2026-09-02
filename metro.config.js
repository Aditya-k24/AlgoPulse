// Metro watches the whole project root, so `server/` having its own
// package.json does NOT isolate it from the app bundle. Without this,
// Metro indexes server/node_modules — including @temporalio/core-bridge,
// which ships ~151 MB of prebuilt .node binaries — and can try to resolve
// kafkajs and pg into the React Native bundle.
//
// blockList is the supported way to keep a directory out of the module
// graph and the file watcher.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  // Backend: Node-only deps, native bindings, and Temporal workflow bundles.
  /[/\\]server[/\\].*/,
  // Load-test harness: k6 scripts are not valid RN modules.
  /[/\\]bench[/\\].*/,
  // Superseded screens kept for reference; their imports are intentionally broken.
  /[/\\]archive[/\\].*/,
];

module.exports = config;
