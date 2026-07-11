// Config plugin: limit the Android CPU architectures packaged into the build.
//
// The default RN build packages native libs for 4 ABIs
// (armeabi-v7a, arm64-v8a, x86, x86_64). x86/x86_64 exist only for emulators,
// so dropping them shrinks sideloaded APKs substantially with no impact on
// real phones. arm64-v8a alone covers every Android device from ~2017 onward.
//
// Add "armeabi-v7a" to ARCHS below if you need to support older 32-bit devices.
const { withGradleProperties } = require("@expo/config-plugins");

const ARCHS = "arm64-v8a";

module.exports = function withReleaseArchitectures(config) {
  return withGradleProperties(config, (cfg) => {
    const key = "reactNativeArchitectures";
    const existing = cfg.modResults.find(
      (item) => item.type === "property" && item.key === key,
    );
    if (existing) {
      existing.value = ARCHS;
    } else {
      cfg.modResults.push({ type: "property", key, value: ARCHS });
    }
    return cfg;
  });
};
