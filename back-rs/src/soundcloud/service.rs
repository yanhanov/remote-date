use anyhow::{anyhow, Result};
use serde::Deserialize;

const SOUNDCLOUD_API_URL: &str = "https://api-v2.soundcloud.com";

#[derive(Debug, Deserialize)]
struct MediaTranscoding {
    url: String,
    format: Option<MediaFormat>,
}

#[derive(Debug, Deserialize)]
struct MediaFormat {
    protocol: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Media {
    transcodings: Option<Vec<MediaTranscoding>>,
}

#[derive(Debug, Deserialize)]
struct TrackUser {
    username: Option<String>,
    #[serde(rename = "avatar_url")]
    avatar_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Track {
    id: i64,
    title: String,
    user: Option<TrackUser>,
    #[serde(rename = "artwork_url")]
    artwork_url: Option<String>,
    #[serde(rename = "permalink_url")]
    permalink_url: Option<String>,
    duration: Option<i64>,
    media: Option<Media>,
}

#[derive(Debug, Deserialize)]
struct SearchResponse<T> {
    collection: Option<Vec<T>>,
}

#[derive(Debug, serde::Serialize)]
pub struct Item {
    pub id: i64,
    pub title: String,
    pub username: Option<String>,
    pub artwork_url: Option<String>,
    pub permalink_url: Option<String>,
    pub duration_ms: Option<i64>,
    pub stream_url: Option<String>,
}

pub async fn search_tracks(
    client: &reqwest::Client,
    client_id: &str,
    q: &str,
    limit: u32,
) -> Result<Vec<Item>> {
    let url = format!("{SOUNDCLOUD_API_URL}/search/tracks");
    let resp = client
        .get(&url)
        .query(&[
            ("q", q),
            ("client_id", client_id),
            ("limit", &limit.to_string()),
        ])
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let detail = if text.trim().is_empty() {
            format!("HTTP {status}")
        } else {
            text
        };
        return Err(anyhow!("SoundCloud search failed ({detail})"));
    }

    let data: SearchResponse<Track> = resp.json().await?;
    let collection = data.collection.unwrap_or_default();

    let mut items = Vec::new();
    for track in collection {
        let stream_url = match resolve_stream_url_from_media(client, &track.media, client_id).await
        {
            Ok(url) => url,
            Err(err) => {
                tracing::warn!("Failed to resolve SoundCloud stream for track {}: {err}", track.id);
                None
            }
        };
        items.push(track_to_item(track, stream_url));
    }

    Ok(items)
}

pub async fn get_track(
    client: &reqwest::Client,
    client_id: &str,
    track_id: i64,
) -> Result<Item> {
    let url = format!("{SOUNDCLOUD_API_URL}/tracks/{track_id}");
    let resp = client
        .get(&url)
        .query(&[("client_id", client_id)])
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let detail = if text.trim().is_empty() {
            format!("HTTP {status}")
        } else {
            text
        };
        return Err(anyhow!("SoundCloud track fetch failed ({detail})"));
    }

    let track: Track = resp.json().await?;
    let stream_url = match resolve_stream_url_from_media(client, &track.media, client_id).await {
        Ok(url) => url,
        Err(err) => {
            tracing::warn!(
                "Failed to resolve SoundCloud stream for track {track_id}: {err}"
            );
            None
        }
    };
    Ok(track_to_item(track, stream_url))
}

async fn resolve_stream_url_from_media(
    client: &reqwest::Client,
    media: &Option<Media>,
    client_id: &str,
) -> Result<Option<String>> {
    let Some(media) = media else {
        return Ok(None);
    };
    let Some(transcodings) = &media.transcodings else {
        return Ok(None);
    };

    let progressive = transcodings
        .iter()
        .find(|t| t.format.as_ref().and_then(|f| f.protocol.as_deref()) == Some("progressive"));

    let Some(prog) = progressive else {
        return Ok(None);
    };

    let mut url = reqwest::Url::parse(&prog.url)?;
    url.query_pairs_mut().append_pair("client_id", client_id);

    let resp = client.get(url).send().await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        let detail = if text.trim().is_empty() {
            format!("HTTP {status}")
        } else {
            text
        };
        return Err(anyhow!("SoundCloud stream resolve failed ({detail})"));
    }

    #[derive(Deserialize)]
    struct ProgressiveResponse {
        url: Option<String>,
    }

    let data: ProgressiveResponse = resp.json().await?;
    Ok(data.url)
}

fn track_to_item(track: Track, stream_url: Option<String>) -> Item {
    Item {
        id: track.id,
        title: track.title,
        username: track.user.as_ref().and_then(|u| u.username.clone()),
        artwork_url: track
            .artwork_url
            .or_else(|| track.user.as_ref().and_then(|u| u.avatar_url.clone())),
        permalink_url: track.permalink_url,
        duration_ms: track.duration,
        stream_url,
    }
}

