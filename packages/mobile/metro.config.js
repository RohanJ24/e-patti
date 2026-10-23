const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const sharedRoot = path.resolve(projectRoot, "../shared");
const mobileModules = path.resolve(projectRoot, "node_modules");

const aliases = {
  "@e-patti/shared": sharedRoot,
  react: path.join(mobileModules, "react"),
  "react-native": path.join(mobileModules, "react-native")
};

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.nodeModulesPaths = [
  mobileModules,
  path.resolve(sharedRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
// Nested React Native packages (scheduler, promise, etc.) live under
// react-native/node_modules. Hierarchical lookup must stay enabled.
config.resolver.disableHierarchicalLookup = false;
config.resolver.extraNodeModules = new Proxy(aliases, {
  get(target, name) {
    if (typeof name !== "string") return undefined;
    if (Object.prototype.hasOwnProperty.call(target, name)) {
      return target[name];
    }
    const fromMobile = path.join(mobileModules, name);
    return fs.existsSync(fromMobile) ? fromMobile : undefined;
  }
});

module.exports = config;
