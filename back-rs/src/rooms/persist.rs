use std::sync::Arc;

use tokio::sync::RwLock;

use crate::rooms::models::VideoRoom;
use crate::rooms::mongo::{MongoRoomRepository, PersistedRoom};
use crate::rooms::service::{RoomService, RoomStore};

pub async fn ensure_in_memory(
    store: &Arc<RwLock<RoomStore>>,
    repo: &MongoRoomRepository,
    room_id: &str,
) -> Option<VideoRoom> {
    {
        let guard = store.read().await;
        if let Some(room) = RoomService::get_room(&guard, room_id) {
            return Some(room);
        }
    }

    let persisted = match repo.get(room_id).await {
        Ok(doc) => doc?,
        Err(err) => {
            tracing::warn!("Failed to load room {room_id} from MongoDB: {err}");
            return None;
        }
    };

    let (room, state, empty_since) = persisted.into_room();
    let mut guard = store.write().await;
    if let Some(existing) = RoomService::get_room(&guard, room_id) {
        return Some(existing);
    }
    RoomService::hydrate(&mut guard, room, state, empty_since);
    RoomService::get_room(&guard, room_id)
}

pub async fn persist_room(
    store: &Arc<RwLock<RoomStore>>,
    repo: &MongoRoomRepository,
    room_id: &str,
) {
    let doc = {
        let guard = store.read().await;
        let entry = match guard.entry(room_id) {
            Some(entry) => entry,
            None => return,
        };
        let state = match guard.state(room_id) {
            Some(state) => state.clone(),
            None => return,
        };
        PersistedRoom::from_runtime(&entry.room, &state, entry.empty_since)
    };

    if let Err(err) = repo.upsert(&doc).await {
        tracing::warn!("Failed to persist room {room_id}: {err}");
    }
}

pub async fn delete_persisted(repo: &MongoRoomRepository, room_id: &str) {
    if let Err(err) = repo.delete(room_id).await {
        tracing::warn!("Failed to delete persisted room {room_id}: {err}");
    }
}
