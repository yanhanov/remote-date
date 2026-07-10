use std::collections::HashMap;

use anyhow::{anyhow, Result};
use chrono::{DateTime, Duration, Utc};
use regex::Regex;
use uuid::Uuid;

use crate::chat::service::ChatStore;
use crate::rooms::models::{
    CreateRoomDto, RoomType, SoundcloudQueueItem, VideoRoom, VideoState,
};

pub const EMPTY_ROOM_TTL: Duration = Duration::hours(24);

#[derive(Debug, Clone)]
struct RoomEntry {
    room: VideoRoom,
    empty_since: Option<DateTime<Utc>>,
}

#[derive(Debug, Default)]
pub struct RoomStore {
    rooms: HashMap<String, RoomEntry>,
    states: HashMap<String, VideoState>,
}

impl RoomStore {
    pub fn new() -> Self {
        Self::default()
    }
}

pub struct RoomService;

impl RoomService {
    fn extract_video_id(url: &str) -> Option<String> {
        let patterns = [
            r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)",
            r"youtube\.com/watch\?.*v=([^&\n?#]+)",
        ];

        for pat in patterns {
            let re = Regex::new(pat).ok()?;
            if let Some(caps) = re.captures(url) {
                if let Some(m) = caps.get(1) {
                    return Some(m.as_str().to_string());
                }
            }
        }
        None
    }

    pub fn create_room(store: &mut RoomStore, dto: CreateRoomDto) -> Result<VideoRoom> {
        let (room_type, youtube_video_id) = if let Some(youtube_url) = &dto.youtube_url {
            let video_id = Self::extract_video_id(youtube_url)
                .ok_or_else(|| anyhow!("Invalid YouTube URL"))?;
            (RoomType::Youtube, Some(video_id))
        } else if dto.soundcloud_url.is_some()
            || matches!(dto.room_type, Some(RoomType::Soundcloud))
        {
            (RoomType::Soundcloud, None)
        } else if dto.belet_url.is_some() || matches!(dto.room_type, Some(RoomType::Belet)) {
            (RoomType::Belet, None)
        } else if matches!(dto.room_type, Some(RoomType::Youtube)) {
            (RoomType::Youtube, None)
        } else {
            return Err(anyhow!(
                "Either youtubeUrl, soundcloudUrl, beletUrl or type is required"
            ));
        };

        let id = Uuid::new_v4().to_string();
        let room = VideoRoom {
            id: id.clone(),
            room_type,
            youtube_url: dto.youtube_url.clone(),
            youtube_video_id,
            soundcloud_url: dto.soundcloud_url.clone(),
            soundcloud_title: None,
            soundcloud_artist: None,
            soundcloud_artwork_url: None,
            soundcloud_queue: None,
            soundcloud_queue_index: None,
            belet_url: dto.belet_url.clone(),
            belet_title: None,
            created_at: Utc::now(),
            current_time: 0.0,
            is_playing: false,
            participants: 0,
        };

        let state = VideoState {
            current_time: 0.0,
            is_playing: false,
            timestamp: chrono::Utc::now().timestamp_millis(),
        };

        store.rooms.insert(
            id.clone(),
            RoomEntry {
                room: room.clone(),
                empty_since: Some(Utc::now()),
            },
        );
        store.states.insert(id.clone(), state);

        Ok(room)
    }

    pub fn get_room(store: &RoomStore, room_id: &str) -> Option<VideoRoom> {
        store.rooms.get(room_id).map(|entry| entry.room.clone())
    }

    pub fn get_room_state(store: &RoomStore, room_id: &str) -> Option<VideoState> {
        store.states.get(room_id).cloned()
    }

    pub fn update_room_state(
        store: &mut RoomStore,
        room_id: &str,
        state: Option<VideoState>,
    ) -> Option<VideoState> {
        let current = store.states.get(room_id)?.clone();
        let mut new_state = current;
        if let Some(s) = state {
            new_state.current_time = s.current_time;
            new_state.is_playing = s.is_playing;
        }
        new_state.timestamp = chrono::Utc::now().timestamp_millis();
        store.states.insert(room_id.to_string(), new_state.clone());

        if let Some(entry) = store.rooms.get_mut(room_id) {
            entry.room.current_time = new_state.current_time;
            entry.room.is_playing = new_state.is_playing;
        }

        Some(new_state)
    }

    pub fn set_participants(store: &mut RoomStore, room_id: &str, count: u32) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            entry.room.participants = count;
        }
    }

    pub fn mark_empty(store: &mut RoomStore, room_id: &str) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            if entry.empty_since.is_none() {
                entry.empty_since = Some(Utc::now());
            }
        }
    }

    pub fn mark_active(store: &mut RoomStore, room_id: &str) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            entry.empty_since = None;
        }
    }

    pub fn delete_room(store: &mut RoomStore, room_id: &str) {
        store.rooms.remove(room_id);
        store.states.remove(room_id);
    }

    pub fn cleanup_stale_rooms(store: &mut RoomStore, chat_store: &mut ChatStore) -> usize {
        let cutoff = Utc::now() - EMPTY_ROOM_TTL;
        let stale_ids: Vec<String> = store
            .rooms
            .iter()
            .filter(|(_, entry)| {
                entry.room.participants == 0
                    && entry
                        .empty_since
                        .unwrap_or(entry.room.created_at)
                        < cutoff
            })
            .map(|(id, _)| id.clone())
            .collect();

        for room_id in &stale_ids {
            Self::delete_room(store, room_id);
            crate::chat::service::ChatService::clear_room(chat_store, room_id);
        }

        stale_ids.len()
    }

    pub fn update_soundcloud_metadata(
        store: &mut RoomStore,
        room_id: &str,
        url: &str,
        title: Option<String>,
        artist: Option<String>,
        artwork_url: Option<String>,
        queue: Option<Vec<SoundcloudQueueItem>>,
        queue_index: Option<u32>,
    ) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            let room = &mut entry.room;
            room.soundcloud_url = Some(url.to_string());
            room.soundcloud_title = title;
            room.soundcloud_artist = artist;
            room.soundcloud_artwork_url = artwork_url;
            if let Some(q) = queue {
                room.soundcloud_queue = Some(q);
            }
            if let Some(idx) = queue_index {
                room.soundcloud_queue_index = Some(idx);
            }
            room.current_time = 0.0;
            room.is_playing = false;
        }

        if let Some(state) = store.states.get_mut(room_id) {
            state.current_time = 0.0;
            state.is_playing = false;
            state.timestamp = chrono::Utc::now().timestamp_millis();
        }
    }

    pub fn update_youtube_metadata(
        store: &mut RoomStore,
        room_id: &str,
        video_id: &str,
        youtube_url: Option<String>,
    ) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            let room = &mut entry.room;
            room.youtube_video_id = Some(video_id.to_string());
            room.youtube_url = youtube_url.or_else(|| {
                Some(format!("https://www.youtube.com/watch?v={video_id}"))
            });
            room.current_time = 0.0;
            room.is_playing = false;
        }

        if let Some(state) = store.states.get_mut(room_id) {
            state.current_time = 0.0;
            state.is_playing = false;
            state.timestamp = chrono::Utc::now().timestamp_millis();
        }
    }

    pub fn update_belet_metadata(
        store: &mut RoomStore,
        room_id: &str,
        url: &str,
        title: Option<String>,
    ) {
        if let Some(entry) = store.rooms.get_mut(room_id) {
            let room = &mut entry.room;
            room.belet_url = Some(url.to_string());
            room.belet_title = title;
            room.current_time = 0.0;
            room.is_playing = false;
        }

        if let Some(state) = store.states.get_mut(room_id) {
            state.current_time = 0.0;
            state.is_playing = false;
            state.timestamp = chrono::Utc::now().timestamp_millis();
        }
    }
}
