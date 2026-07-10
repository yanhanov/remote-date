#!/usr/bin/env bash
set -euo pipefail

PORT="${EXPO_PORT:-8081}"
HOST="${EXPO_DEV_HOST:-}"

# Android emulator reaches the host machine via 10.0.2.2, not the Mac LAN IP.
is_emulator=0
if adb devices | awk 'NR>1 && $1 ~ /^emulator-/ && $2=="device" {found=1} END {exit !found}'; then
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

if ! adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit !found}'; then
  echo "No Android device/emulator connected. Start an emulator first."
  exit 1
fi

# Reverse Metro so Expo Go can also use localhost if needed.
adb reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null || true

URL="exp://${HOST}:${PORT}"
echo "Opening Expo Go: ${URL}"
adb shell am start -a android.intent.action.VIEW -d "${URL}" host.exp.exponent >/dev/null
