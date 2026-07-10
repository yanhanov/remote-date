use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use mongodb::{
    bson::doc,
    options::{ClientOptions, ReplaceOptions},
    Client, Collection,
};

use crate::rooms::models::{RoomType, SoundcloudQueueItem, VideoRoom, VideoState};

const ROOMS_COLLECTION: &str = "rooms";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedRoom {
    #[serde(rename = "_id")]
    pub id: String,
    #[serde(rename = "type")]
    pub room_type: RoomType,
    pub youtube_url: Option<String>,
    pub youtube_video_id: Option<String>,
    pub soundcloud_url: Option<String>,
    pub soundcloud_title: Option<String>,
    pub soundcloud_artist: Option<String>,
    pub soundcloud_artwork_url: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub soundcloud_queue: Option<Vec<SoundcloudQueueItem>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub soundcloud_queue_index: Option<u32>,
    pub belet_url: Option<String>,
    pub belet_title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub current_time: f64,
    pub is_playing: bool,
    pub participants: u32,
    pub empty_since: Option<DateTime<Utc>>,
    pub state: VideoState,
}

impl PersistedRoom {
    pub fn from_runtime(room: &VideoRoom, state: &VideoState, empty_since: Option<DateTime<Utc>>) -> Self {
        Self {
            id: room.id.clone(),
            room_type: room.room_type.clone(),
            youtube_url: room.youtube_url.clone(),
            youtube_video_id: room.youtube_video_id.clone(),
            soundcloud_url: room.soundcloud_url.clone(),
            soundcloud_title: room.soundcloud_title.clone(),
            soundcloud_artist: room.soundcloud_artist.clone(),
            soundcloud_artwork_url: room.soundcloud_artwork_url.clone(),
            soundcloud_queue: room.soundcloud_queue.clone(),
            soundcloud_queue_index: room.soundcloud_queue_index,
            belet_url: room.belet_url.clone(),
            belet_title: room.belet_title.clone(),
            created_at: room.created_at,
            current_time: room.current_time,
            is_playing: room.is_playing,
            participants: room.participants,
            empty_since,
            state: state.clone(),
        }
    }

    pub fn into_room(self) -> (VideoRoom, VideoState, Option<DateTime<Utc>>) {
        let empty_since = self.empty_since;
        let state = self.state;
        let room = VideoRoom {
            id: self.id,
            room_type: self.room_type,
            youtube_url: self.youtube_url,
            youtube_video_id: self.youtube_video_id,
            soundcloud_url: self.soundcloud_url,
            soundcloud_title: self.soundcloud_title,
            soundcloud_artist: self.soundcloud_artist,
            soundcloud_artwork_url: self.soundcloud_artwork_url,
            soundcloud_queue: self.soundcloud_queue,
            soundcloud_queue_index: self.soundcloud_queue_index,
            belet_url: self.belet_url,
            belet_title: self.belet_title,
            created_at: self.created_at,
            current_time: self.current_time,
            is_playing: self.is_playing,
            participants: self.participants,
        };
        (room, state, empty_since)
    }
}

#[derive(Clone)]
pub struct MongoRoomRepository {
    rooms: Collection<PersistedRoom>,
}

impl MongoRoomRepository {
    pub async fn connect(uri: &str) -> Result<Self> {
        let mut options = ClientOptions::parse(uri)
            .await
            .context("Failed to parse MongoDB URL")?;
        options.app_name = Some("remote-date-rooms".to_string());

        let client = Client::with_options(options).context("Failed to create MongoDB client")?;
        let db = client.default_database().context(
            "MongoDB URL must include a database name, e.g. mongodb://localhost:27017/remote",
        )?;

        Ok(Self {
            rooms: db.collection(ROOMS_COLLECTION),
        })
    }

    pub async fn upsert(&self, doc: &PersistedRoom) -> Result<()> {
        self.rooms
            .replace_one(doc! { "_id": &doc.id }, doc)
            .with_options(ReplaceOptions::builder().upsert(true).build())
            .await
            .context("Failed to upsert room")?;
        Ok(())
    }

    pub async fn get(&self, room_id: &str) -> Result<Option<PersistedRoom>> {
        self.rooms
            .find_one(doc! { "_id": room_id })
            .await
            .context("Failed to load room")
    }

    pub async fn delete(&self, room_id: &str) -> Result<()> {
        self.rooms
            .delete_one(doc! { "_id": room_id })
            .await
            .context("Failed to delete room")?;
        Ok(())
    }
}
