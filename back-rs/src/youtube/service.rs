use anyhow::{anyhow, Result};
use serde::Deserialize;

const YOUTUBE_API_URL: &str = "https://www.googleapis.com/youtube/v3";

#[derive(Debug, Deserialize)]
struct SearchListResponse {
    items: Option<Vec<SearchResultItem>>,
}

#[derive(Debug, Deserialize)]
struct SearchResultItem {
    id: SearchResultId,
    snippet: SearchSnippet,
}

#[derive(Debug, Deserialize)]
struct SearchResultId {
    #[serde(rename = "videoId")]
    video_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SearchSnippet {
    title: String,
    #[serde(rename = "channelTitle")]
    channel_title: Option<String>,
    thumbnails: Thumbnails,
}

#[derive(Debug, Deserialize)]
struct Thumbnails {
    default: Option<Thumbnail>,
    medium: Option<Thumbnail>,
    high: Option<Thumbnail>,
}

#[derive(Debug, Deserialize)]
struct Thumbnail {
    url: String,
}

#[derive(Debug, serde::Serialize)]
pub struct VideoItem {
    pub video_id: String,
    pub title: String,
    pub channel_title: Option<String>,
    pub thumbnail_url: Option<String>,
}

pub async fn search_videos(
    client: &reqwest::Client,
    api_key: &str,
    q: &str,
    limit: u32,
) -> Result<Vec<VideoItem>> {
    let resp = client
        .get(format!("{YOUTUBE_API_URL}/search"))
        .query(&[
            ("part", "snippet"),
            ("type", "video"),
            ("q", q),
            ("maxResults", &limit.to_string()),
            ("key", api_key),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(anyhow!("Failed to fetch videos from YouTube: {text}"));
    }

    let data: SearchListResponse = resp.json().await?;
    let items = data.items.unwrap_or_default();

    Ok(items
        .into_iter()
        .filter_map(|item| {
            let video_id = item.id.video_id?;
            let thumbnail_url = item
                .snippet
                .thumbnails
                .medium
                .or(item.snippet.thumbnails.high)
                .or(item.snippet.thumbnails.default)
                .map(|t| t.url);

            Some(VideoItem {
                video_id,
                title: item.snippet.title,
                channel_title: item.snippet.channel_title,
                thumbnail_url,
            })
        })
        .collect())
}
