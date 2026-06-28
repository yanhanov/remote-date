use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;

use crate::config::AppContext;
use crate::youtube::service;

pub fn router() -> Router<AppContext> {
    Router::new().route("/search", get(search_videos))
}

#[derive(Debug, Deserialize)]
struct SearchParams {
    q: Option<String>,
    limit: Option<u32>,
}

async fn search_videos(
    State(_state): State<AppContext>,
    Query(params): Query<SearchParams>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let q = params.q.unwrap_or_default();
    let limit = params.limit.unwrap_or(10).clamp(1, 25);

    if q.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Query q is required" })),
        );
    }

    let api_key = match std::env::var("YOUTUBE_API_KEY") {
        Ok(v) => v,
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "YOUTUBE_API_KEY is not configured on the server"
                })),
            )
        }
    };

    let client = reqwest::Client::new();
    match service::search_videos(&client, &api_key, &q, limit).await {
        Ok(items) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({ "items": items })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "error": format!("Failed to fetch videos from YouTube: {err}")
            })),
        ),
    }
}
