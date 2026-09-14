const { withPodfile, withXcodeProject } = require('expo/config-plugins');

/**
 * Two generated build scripts break when the project lives in a directory with a space
 * ("Dog Better") because they expand paths without quotes. This plugin quotes them so the
 * native build works from any location and survives `expo prebuild --clean`.
 */

// expo-constants: `bash -l -c "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"` is unquoted,
// and the script itself runs `basename $PROJECT_DIR` unquoted, so we point at our own copy instead.
const PODFILE_RUBY = `
    installer.pods_project.targets.each do |target|
      target.shell_script_build_phases.each do |phase|
        next unless phase.shell_script.include?('get-app-config-ios.sh')
        phase.shell_script = phase.shell_script.gsub(
          '$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh',
          '\\"$PODS_ROOT/../../plugins/get-app-config-ios.sh\\"'
        )
      end
    end
`;

// App target "Bundle React Native code and images": the backtick substitution is word-split.
const BUNDLE_BEFORE = "`\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`";
const BUNDLE_AFTER = "\\\"$(\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\")\\\"";

module.exports = function withSpaceSafePods(config) {
  config = withPodfile(config, (cfg) => {
    const marker = 'post_install do |installer|';
    if (!cfg.modResults.contents.includes(PODFILE_RUBY.trim())) {
      cfg.modResults.contents = cfg.modResults.contents.replace(marker, `${marker}${PODFILE_RUBY}`);
    }
    return cfg;
  });

  config = withXcodeProject(config, (cfg) => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    for (const key of Object.keys(phases)) {
      const phase = phases[key];
      if (!phase || typeof phase !== 'object' || typeof phase.shellScript !== 'string') continue;
      if (phase.shellScript.includes(BUNDLE_BEFORE)) {
        phase.shellScript = phase.shellScript.replace(BUNDLE_BEFORE, BUNDLE_AFTER);
      }
    }
    return cfg;
  });

  return config;
};
