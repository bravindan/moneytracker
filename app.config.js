// Dynamic Expo config layered on top of app.json.
// app.json provides the static base config (passed in as `config`).
// When APP_VARIANT=development, we build a separate "dev" app that installs
// ALONGSIDE the live app (different package id + name), so testing never
// touches the production install or its data.
const IS_DEV = process.env.APP_VARIANT === "development";

// @expo/vector-icons fetches its font over the network the first time an icon
// renders, which surfaces as an unhandled "ExpoAsset.downloadAsync has been
// rejected" whenever the dev server is unreachable. Registering the font here
// makes `Font.isLoaded("ionicons")` true from startup, so that download is
// skipped entirely. Android-only because this object form registers an explicit
// family name (the file is Ionicons.ttf, but the icon set asks for "ionicons").
const VECTOR_ICONS_FONTS =
  "./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts";

module.exports = ({ config }) => ({
  ...config,
  name: IS_DEV ? "Money Tracker (Dev)" : config.name,
  plugins: [
    ...(config.plugins ?? []),
    "expo-secure-store",
    [
      "expo-font",
      {
        android: {
          fonts: [
            {
              fontFamily: "ionicons",
              fontDefinitions: [
                {
                  path: `${VECTOR_ICONS_FONTS}/Ionicons.ttf`,
                  weight: 400,
                  style: "normal",
                },
              ],
            },
          ],
        },
      },
    ],
  ],
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV
      ? "com.alkebu.moneytracker.dev"
      : config.ios.bundleIdentifier,
  },
  android: {
    ...config.android,
    package: IS_DEV ? "com.alkebu.moneytracker.dev" : config.android.package,
  },
});
