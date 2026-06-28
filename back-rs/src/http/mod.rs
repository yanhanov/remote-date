use axum::Router;

use crate::config::AppContext;

pub mod auth;
pub mod chat;
pub mod rooms;
pub mod routes;
pub mod social;
pub mod soundcloud;
pub mod youtube;

pub fn build_router() -> Router<AppContext> {
    Router::new().nest("/api", routes::api_router())
}

