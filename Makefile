.PHONY: help dev dev-api dev-front dev-mobile dev-ios dev-ios-native dev-android dev-android-native dev-mongo dev-mongo-down install check build build-android build-ios install-android-ndk

ifneq (,$(wildcard .env))
  include .env
  export
endif

# На macOS порт 5000 часто занят AirPlay Receiver (Control Center).
PORT ?= 5001
JWT_SECRET ?= super-secret-dev
JWT_EXPIRES_IN ?= 7d
MONGO_URL ?= mongodb://localhost:27017/remote
EXPO_PUBLIC_API_URL ?= http://localhost:$(PORT)/api
EXPO_PUBLIC_SOCKET_URL ?= ws://localhost:$(PORT)/ws
EXPO_PUBLIC_API_URL_ANDROID ?= http://10.0.2.2:$(PORT)/api
EXPO_PUBLIC_SOCKET_URL_ANDROID ?= ws://10.0.2.2:$(PORT)/ws
ANDROID_HOME ?= $(HOME)/Library/Android/sdk

help: ## Показать команды
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Установить зависимости фронтенда
	cd front && npm install

dev-mongo: ## Поднять MongoDB в Docker
	docker compose up -d mongo --wait

dev-mongo-down: ## Остановить MongoDB в Docker
	docker compose stop mongo

dev: ## Запустить API и фронтенд
	@trap 'kill 0' INT TERM; \
	$(MAKE) dev-api & \
	$(MAKE) dev-front & \
	wait

dev-api: dev-mongo ## Запустить Rust API (порт $(PORT))
	cd back-rs && \
	PORT=$(PORT) \
	MONGO_URL=$(MONGO_URL) \
	JWT_SECRET=$(JWT_SECRET) \
	JWT_EXPIRES_IN=$(JWT_EXPIRES_IN) \
	SOUNDCLOUD_CLIENT_ID=$(SOUNDCLOUD_CLIENT_ID) \
	cargo run

dev-front: ## Запустить Vite dev-сервер (порт 5173)
	cd front && VITE_API_PORT=$(PORT) npm run dev

dev-mobile: ## Запустить Expo (Metro). Web: w, iOS: i, Android: make dev-android
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL) npm start

dev-ios: ## Metro + iOS Simulator (Expo Go) — удобнее браузера на Mac
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL) npx expo start --ios

dev-ios-native: ## Собрать и установить iOS dev build в симулятор (WebView, без Expo Go)
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL) npx expo run:ios

dev-android: ## Metro (Expo Go) + открыть на Android emulator
	@chmod +x rn/scripts/open-android-expo.sh
	@trap 'kill 0' INT TERM; \
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL_ANDROID) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL_ANDROID) npx expo start --go & \
	sleep 4; \
	rn/scripts/open-android-expo.sh; \
	wait

dev-android-native: ## Собрать и установить dev build (WebView/Belet, без Expo Go)
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL_ANDROID) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL_ANDROID) npx expo run:android

check: ## Проверить TypeScript на фронте
	cd front && npm run check

build: ## Собрать фронтенд
	cd front && npm run build

build-android: ## Собрать Android APK (release)
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL) npm run build:android:full

build-ios: ## Собрать iOS app для симулятора (release)
	cd rn && EXPO_PUBLIC_API_URL=$(EXPO_PUBLIC_API_URL) EXPO_PUBLIC_SOCKET_URL=$(EXPO_PUBLIC_SOCKET_URL) npm run build:ios:full

install-android-ndk: ## Установить Android NDK 27 (если Gradle не может скачать)
	rm -rf "$(ANDROID_HOME)/ndk/27.1.12297006"
	yes | "$(ANDROID_HOME)/cmdline-tools/latest/bin/sdkmanager" "ndk;27.1.12297006"

.DEFAULT_GOAL := help
