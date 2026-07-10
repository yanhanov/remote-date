const { withProjectBuildGradle } = require('expo/config-plugins');

const DEFAULT_NDK_VERSION = '28.2.13676358';

/**
 * Pins Android NDK before expo-root-project reads the default (27.1.12297006).
 */
function withAndroidNdk(config, props = {}) {
  const ndkVersion = props.ndkVersion ?? DEFAULT_NDK_VERSION;

  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      return gradleConfig;
    }

    const marker = 'apply plugin: "expo-root-project"';
    const injection = `ext {
    ndkVersion = "${ndkVersion}"
}

${marker}`;

    if (!gradleConfig.modResults.contents.includes('ndkVersion =')) {
      gradleConfig.modResults.contents = gradleConfig.modResults.contents.replace(
        marker,
        injection,
      );
    }

    return gradleConfig;
  });
}

module.exports = withAndroidNdk;
