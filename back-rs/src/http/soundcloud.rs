use axum::{
    extract::{Path, Query, State},
    routing::get,
    Json, Router,
};
use serde::Deserialize;

use crate::config::AppContext;
use crate::soundcloud::service;

/// Router for /api/soundcloud endpoints.
pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/search", get(search_tracks))
        .route("/tracks/{id}", get(get_track))
        .route("/playlist/{id}", get(get_playlist))
}

#[derive(Debug, Deserialize)]
struct SearchParams {
    q: Option<String>,
    limit: Option<u32>,
    filter: Option<String>,
}

async fn search_tracks(
    State(_state): State<AppContext>,
    Query(params): Query<SearchParams>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let q = params.q.unwrap_or_default();
    let limit = params.limit.unwrap_or(5);
    let filter = params.filter.unwrap_or_else(|| "tracks".to_string());

    if q.trim().is_empty() {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Query q is required" })),
        );
    }

    let client_id =
        match std::env::var("SOUNDCLOUD_CLIENT_ID") {
            Ok(v) => v,
            Err(_) => {
                return (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": "SOUNDCLOUD_CLIENT_ID is not configured on the server"
                    })),
                )
            }
        };

    let client = reqwest::Client::new();

    if filter == "playlists" {
        match service::search_playlists(&client, &client_id, &q, limit).await {
            Ok(items) => {
                return (
                    axum::http::StatusCode::OK,
                    Json(serde_json::json!({ "items": items, "kind": "playlists" })),
                );
            }
            Err(err) => {
                return (
                    axum::http::StatusCode::BAD_GATEWAY,
                    Json(serde_json::json!({ "error": err.to_string() })),
                );
            }
        }
    }

    match service::search_tracks(&client, &client_id, &q, limit).await {
        Ok(items) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({ "items": items, "kind": "tracks" })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({
                "error": err.to_string()
            })),
        ),
    }
}

async fn get_track(
    State(_state): State<AppContext>,
    Path(id): Path<i64>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let client_id = match std::env::var("SOUNDCLOUD_CLIENT_ID") {
        Ok(v) => v,
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "SOUNDCLOUD_CLIENT_ID is not configured on the server"
                })),
            );
        }
    };

    let client = reqwest::Client::new();
    match service::get_track(&client, &client_id, id).await {
        Ok(item) => (axum::http::StatusCode::OK, Json(serde_json::json!(item))),
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn get_playlist(
    State(_state): State<AppContext>,
    Path(id): Path<i64>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let client_id = match std::env::var("SOUNDCLOUD_CLIENT_ID") {
        Ok(v) => v,
        Err(_) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "SOUNDCLOUD_CLIENT_ID is not configured on the server"
                })),
            );
        }
    };

    let client = reqwest::Client::new();
    match service::get_playlist_tracks(&client, &client_id, id).await {
        Ok(items) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({ "items": items })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_GATEWAY,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}


