use axum::{
    extract::{Path, State},
    routing::get,
    routing::post,
    Json, Router,
};

use crate::auth::extractor::AuthUser;
use crate::config::AppContext;
use crate::rooms::models::CreateRoomDto;
use crate::rooms::mongo::PersistedRoom;
use crate::rooms::persist::ensure_in_memory;
use crate::rooms::service::RoomService;

/// Router for /api/rooms endpoints.
pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/", post(create_room))
        .route("/last/{room_type}", get(get_last_room))
        .route("/{id}", get(get_room))
        .route("/{id}/state", get(get_room_state))
}

async fn create_room(
    State(state): State<AppContext>,
    user: AuthUser,
    Json(dto): Json<CreateRoomDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let room = {
        let mut store = state.room_store.write().await;
        match RoomService::create_room(&mut store, dto) {
            Ok(room) => room,
            Err(err) => {
                return (
                    axum::http::StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": err.to_string() })),
                );
            }
        }
    };

    let room_type = match room.room_type {
        crate::rooms::models::RoomType::Youtube => "youtube",
        crate::rooms::models::RoomType::Soundcloud => "soundcloud",
        crate::rooms::models::RoomType::Belet => "belet",
    };
    let _ = state
        .auth_repo
        .set_last_room_id(&user.user_id, &room.id, room_type)
        .await;

    {
        let store = state.room_store.read().await;
        if let (Some(entry), Some(video_state)) = (store.entry(&room.id), store.state(&room.id)) {
            let doc = PersistedRoom::from_runtime(&entry.room, video_state, entry.empty_since);
            if let Err(err) = state.room_repo.upsert(&doc).await {
                tracing::warn!("Failed to persist new room {}: {err}", room.id);
            }
        }
    }

    (
        axum::http::StatusCode::CREATED,
        Json(serde_json::to_value(room).unwrap()),
    )
}

async fn get_last_room(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(room_type): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    if room_type != "youtube" && room_type != "soundcloud" && room_type != "belet" {
        return (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "Invalid room type" })),
        );
    }

    let room_id = match state
        .auth_repo
        .get_last_room_id(&user.user_id, &room_type)
        .await
    {
        Ok(id) => id,
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            );
        }
    };

    let Some(room_id) = room_id else {
        return (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "No recent room" })),
        );
    };

    let Some(room) = ensure_in_memory(&state.room_store, &state.room_repo, &room_id).await else {
        return (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Room expired or not found" })),
        );
    };

    let matches_type = match room.room_type {
        crate::rooms::models::RoomType::Youtube => room_type == "youtube",
        crate::rooms::models::RoomType::Soundcloud => room_type == "soundcloud",
        crate::rooms::models::RoomType::Belet => room_type == "belet",
    };

    if !matches_type {
        return (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "No recent room" })),
        );
    }

    (
        axum::http::StatusCode::OK,
        Json(serde_json::to_value(room).unwrap()),
    )
}

async fn get_room(
    State(state): State<AppContext>,
    Path(id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match ensure_in_memory(&state.room_store, &state.room_repo, &id).await {
        Some(room) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(room).unwrap()),
        ),
        None => (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Room not found" })),
        ),
    }
}

async fn get_room_state(
    State(state): State<AppContext>,
    Path(id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    if ensure_in_memory(&state.room_store, &state.room_repo, &id)
        .await
        .is_none()
    {
        return (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Room not found" })),
        );
    }

    let store = state.room_store.read().await;
    match RoomService::get_room_state(&store, &id) {
        Some(state_) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(state_).unwrap()),
        ),
        None => (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Room not found" })),
        ),
    }
}
