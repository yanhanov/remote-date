use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RoomType {
    Youtube,
    Soundcloud,
    Belet,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SoundcloudQueueItem {
    pub id: serde_json::Value,
    pub stream_url: String,
    pub title: Option<String>,
    pub username: Option<String>,
    pub artwork_url: Option<String>,
    pub permalink_url: Option<String>,
    pub duration_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRoom {
    pub id: String,
    #[serde(rename = "type")]
    pub room_type: RoomType,
    pub youtube_url: Option<String>,
    pub youtube_video_id: Option<String>,
    pub soundcloud_url: Option<String>,
    pub soundcloud_title: Option<String>,
    pub soundcloud_artist: Option<String>,
    pub soundcloud_artwork_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soundcloud_queue: Option<Vec<SoundcloudQueueItem>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soundcloud_queue_index: Option<u32>,
    pub belet_url: Option<String>,
    pub belet_title: Option<String>,
    pub created_at: DateTime<Utc>,
    pub current_time: f64,
    pub is_playing: bool,
    pub participants: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoState {
    pub current_time: f64,
    pub is_playing: bool,
    pub timestamp: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomDto {
    pub youtube_url: Option<String>,
    pub soundcloud_url: Option<String>,
    pub belet_url: Option<String>,
    #[serde(rename = "type")]
    pub room_type: Option<RoomType>,
}

