use axum::{routing::get, Router};

use crate::config::AppContext;
use crate::http::{auth, chat, rooms, social, soundcloud, youtube};

pub fn api_router() -> Router<AppContext> {
    Router::new()
        .nest("/auth", auth::router())
        .nest("/social", social::router())
        .nest("/rooms", rooms::router())
        .nest("/chat", chat::router())
        .nest("/soundcloud", soundcloud::router())
        .nest("/youtube", youtube::router())
        .route("/health", get(health_check))
}

async fn health_check() -> &'static str {
    "OK"
}

