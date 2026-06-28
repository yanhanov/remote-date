use std::net::SocketAddr;

use axum::{routing::get, Router};
use dotenvy::dotenv;
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod auth;
mod chat;
mod email;
mod rooms;
mod social;
mod soundcloud;
mod youtube;
mod ws;
mod http;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    dotenvy::from_path("../.env").ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "back_rs=debug,axum=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let settings = config::Settings::from_env();

    let auth_repo = auth::MongoAuthRepository::connect(&settings.mongo_url).await?;
    let social_repo = social::mongo::MongoSocialRepository::connect(&settings.mongo_url).await?;
    tracing::info!("Connected to MongoDB at {}", settings.mongo_url);

    let app_state = config::AppContext {
        settings: settings.clone(),
        auth_repo,
        social_repo,
        room_store: std::sync::Arc::new(RwLock::new(rooms::service::RoomStore::new())),
        chat_store: std::sync::Arc::new(RwLock::new(chat::service::ChatStore::new())),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app: Router<_> = http::build_router()
        .route("/ws", get(ws::ws_handler))
        .layer(cors)
        .with_state(app_state);

    let addr: SocketAddr = format!("0.0.0.0:{}", settings.port).parse()?;
    tracing::info!("🚀 Rust backend listening on {}", addr);

    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
