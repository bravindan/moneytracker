// Dynamic Expo config layered on top of app.json.
// app.json provides the static base config (passed in as `config`).
// When APP_VARIANT=development, we build a separate "dev" app that installs
// ALONGSIDE the live app (different package id + name), so testing never
// touches the production install or its data.
const IS_DEV = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => ({
  ...config,
  name: IS_DEV ? "Money Tracker (Dev)" : config.name,
  plugins: ["expo-secure-store"],
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? "com.alkebu.moneytracker.dev"
      : config.ios.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: IS_DEV
      ? "com.alkebu.moneytracker.dev"
      : config.android.package,
  },
});
