#!/usr/bin/env bash
# Space-safe copy of node_modules/expo-constants/scripts/get-app-config-ios.sh.
# Upstream expands $PROJECT_DIR unquoted in `basename`, which makes it exit early when the
# project path contains a space, so the app.config manifest never lands in EXConstants.bundle.
# Wired in by plugins/withSpaceSafePods.js.

set -eo pipefail

DEST="$CONFIGURATION_BUILD_DIR"
RESOURCE_BUNDLE_NAME="EXConstants.bundle"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
EXPO_CONSTANTS_PACKAGE_DIR="$(cd "$PLUGIN_DIR/../node_modules/expo-constants" && pwd -P)"

# Only run for the Pods project (new-style integration), never for the classic main project.
PROJECT_DIR_BASENAME="$(basename "$PROJECT_DIR")"
if [ "x$PROJECT_DIR_BASENAME" != "xPods" ]; then
  exit 0
fi

PROJECT_ROOT="${PROJECT_ROOT:-"$PROJECT_DIR/../.."}"
cd "$PROJECT_ROOT" || exit

if [ "$BUNDLE_FORMAT" == "shallow" ]; then
  RESOURCE_DEST="$DEST/$RESOURCE_BUNDLE_NAME"
elif [ "$BUNDLE_FORMAT" == "deep" ]; then
  RESOURCE_DEST="$DEST/$RESOURCE_BUNDLE_NAME/Contents/Resources"
  mkdir -p "$RESOURCE_DEST"
else
  echo "Unsupported bundle format: $BUNDLE_FORMAT"
  exit 1
fi

"${EXPO_CONSTANTS_PACKAGE_DIR}/scripts/with-node.sh" "${EXPO_CONSTANTS_PACKAGE_DIR}/scripts/getAppConfig.js" "$PROJECT_ROOT" "$RESOURCE_DEST"
