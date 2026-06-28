.PHONY: help dev dev-api dev-front dev-mongo dev-mongo-down install check build

ifneq (,$(wildcard .env))
  include .env
  export
endif

# На macOS порт 5000 часто занят AirPlay Receiver (Control Center).
PORT ?= 5001
JWT_SECRET ?= super-secret-dev
JWT_EXPIRES_IN ?= 7d
MONGO_URL ?= mongodb://localhost:27017/remote

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

check: ## Проверить TypeScript на фронте
	cd front && npm run check

build: ## Собрать фронтенд
	cd front && npm run build

.DEFAULT_GOAL := help
