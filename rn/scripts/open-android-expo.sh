#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_PORT:-8081}"
HOST="${EXPO_DEV_HOST:-}"
AVD_NAME="${ANDROID_AVD:-Pixel_8}"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
EMULATOR_BIN="${ANDROID_HOME}/emulator/emulator"

has_device() {
  adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'
}

has_emulator() {
  adb devices | awk 'NR>1 && $1 ~ /^emulator-/ && $2=="device" {found=1} END {exit !found}'
}

# Boot an AVD when nothing is connected.
if ! has_device; then
  if [[ ! -x "$EMULATOR_BIN" ]]; then
    echo "No Android device/emulator connected, and emulator binary not found at:"
    echo "  $EMULATOR_BIN"
    exit 1
  fi

  echo "No Android device connected. Starting emulator: ${AVD_NAME}"
  "$EMULATOR_BIN" -avd "$AVD_NAME" >/dev/null 2>&1 &

  echo "Waiting for emulator to come online..."
  adb wait-for-device
  # Wait until boot completed (max ~2 min).
  for _ in $(seq 1 60); do
    boot="$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)"
    if [[ "$boot" == "1" ]]; then
      break
    fi
    sleep 2
  done

  if ! has_device; then
    echo "Emulator did not become ready. Open Android Studio → Device Manager and start ${AVD_NAME}."
    exit 1
  fi
fi

is_emulator=0
if has_emulator; then
  is_emulator=1
fi

if [[ -z "$HOST" ]]; then
  if [[ "$is_emulator" -eq 1 ]]; then
    HOST="10.0.2.2"
  else
    HOST="$(ipconfig getifaddr en0 2>/dev/null || true)"
    if [[ -z "$HOST" ]]; then
      HOST="$(ipconfig getifaddr en1 2>/dev/null || true)"
    fi
    if [[ -z "$HOST" ]]; then
      HOST="127.0.0.1"
    fi
  fi
fi

# Reverse Metro so Expo Go can also use localhost if needed.
adb reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null || true

URL="exp://${HOST}:${PORT}"
echo "Opening Expo Go: ${URL}"
adb shell am start -a android.intent.action.VIEW -d "${URL}" host.exp.exponent >/dev/null
