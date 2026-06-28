use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RoomType {
    Youtube,
    Soundcloud,
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
    #[serde(rename = "type")]
    pub room_type: Option<RoomType>,
}

