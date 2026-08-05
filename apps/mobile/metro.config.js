const path = require("node:path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);
const packagesDirectory = `${path.resolve(__dirname, "../../packages")}${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isWorkspaceJavaScriptSpecifier =
    context.originModulePath.startsWith(packagesDirectory) &&
    moduleName.startsWith(".") &&
    moduleName.endsWith(".js");

  if (isWorkspaceJavaScriptSpecifier) {
    return context.resolveRequest(
      context,
      moduleName.slice(0, -".js".length),
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
