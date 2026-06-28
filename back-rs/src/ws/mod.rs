use std::collections::{HashMap, HashSet};

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde::Deserialize;
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

use crate::chat::models::ChatMessage;
use crate::chat::service::ChatService;
use crate::config::AppContext;
use crate::rooms::service::RoomService;

type Tx = mpsc::UnboundedSender<Message>;

#[derive(Default)]
struct WsState {
    // room_id -> set of connection ids
    rooms: HashMap<String, HashSet<Uuid>>,
    // connection id -> sender
    peers: HashMap<Uuid, Tx>,
}

static WS_STATE: Lazy<RwLock<WsState>> = Lazy::new(|| RwLock::new(WsState::default()));

#[derive(Debug, Deserialize)]
#[serde(tag = "event")]
#[serde(rename_all = "camelCase")]
enum IncomingEvent {
    #[serde(rename_all = "camelCase")]
    RoomJoin { room_id: String },
    #[serde(rename_all = "camelCase")]
    RoomLeave { room_id: String },
    #[serde(rename_all = "camelCase")]
    VideoPlay { room_id: String, current_time: Option<f64> },
    #[serde(rename_all = "camelCase")]
    VideoPause { room_id: String, current_time: Option<f64> },
    #[serde(rename_all = "camelCase")]
    VideoSeek { room_id: String, current_time: f64 },
    #[serde(rename_all = "camelCase")]
    VideoSyncRequest { room_id: String },
    #[serde(rename_all = "camelCase")]
    AudioTrackChange {
        room_id: String,
        track_url: String,
        title: Option<String>,
        artist: Option<String>,
        artwork_url: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    VideoChange {
        room_id: String,
        video_id: String,
        youtube_url: Option<String>,
        title: Option<String>,
        channel_title: Option<String>,
        thumbnail_url: Option<String>,
    },
    #[serde(rename_all = "camelCase")]
    ChatSend {
        room: String,
        text: String,
        author: String,
        time: i64,
        track_url: Option<String>,
        image_url: Option<String>,
    },
}

pub async fn ws_handler(
    State(state): State<AppContext>,
    ws: WebSocketUpgrade,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(state, socket))
}

async fn handle_socket(state: AppContext, socket: WebSocket) {
    let (mut sender, mut receiver) = socket.split();

    let (tx, mut rx) = mpsc::unbounded_channel::<Message>();
    let conn_id = Uuid::new_v4();

    {
        let mut ws_state = WS_STATE.write().await;
        ws_state.peers.insert(conn_id, tx);
    }

    // Task: forward messages from channel to real socket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Task: read from socket and handle
    let recv_task = {
        let state = state.clone();
        tokio::spawn(async move {
            while let Some(Ok(msg)) = receiver.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(event) = serde_json::from_str::<IncomingEvent>(&text) {
                        handle_event(&state, conn_id, event).await;
                    }
                }
            }
        })
    };

    // Wait for either task to finish
    tokio::select! {
        _ = send_task => {}
        _ = recv_task => {}
    }

    // Cleanup on disconnect
    cleanup_connection(conn_id, &state).await;
}

async fn handle_event(
    app_state: &AppContext,
    conn_id: Uuid,
    event: IncomingEvent,
) {
    match event {
        IncomingEvent::RoomJoin { room_id } => {
            let mut rooms = app_state.room_store.write().await;
            if RoomService::get_room(&rooms, &room_id).is_none() {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "Room not found"
                    }),
                )
                .await;
                return;
            }

            RoomService::add_participant(&mut rooms, &room_id);

            {
                let mut ws_state = WS_STATE.write().await;
                ws_state
                    .rooms
                    .entry(room_id.clone())
                    .or_default()
                    .insert(conn_id);
            }

            // send current video state to new participant
            if let Some(state) = RoomService::get_room_state(&rooms, &room_id) {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "video:state",
                        "payload": state
                    }),
                )
                .await;
            }

            if let Some(room) = RoomService::get_room(&rooms, &room_id) {
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({
                        "event": "room:user_joined",
                        "roomId": room_id,
                        "participants": room.participants,
                    }),
                )
                .await;
            }
        }
        IncomingEvent::RoomLeave { room_id } => {
            let mut rooms = app_state.room_store.write().await;
            RoomService::remove_participant(&mut rooms, &room_id);
            if let Some(room) = RoomService::get_room(&rooms, &room_id) {
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({
                        "event": "room:user_left",
                        "roomId": room_id,
                        "participants": room.participants,
                    }),
                )
                .await;
            }

            let mut ws_state = WS_STATE.write().await;
            if let Some(set) = ws_state.rooms.get_mut(&room_id) {
                set.remove(&conn_id);
                if set.is_empty() {
                    ws_state.rooms.remove(&room_id);

                    // when last user leaves, clear chat history
                    let mut chat_store = app_state.chat_store.write().await;
                    ChatService::clear_room(&mut chat_store, &room_id);
                }
            }
        }
        IncomingEvent::VideoPlay {
            room_id,
            current_time,
        } => {
            let mut rooms = app_state.room_store.write().await;
            let room = match RoomService::get_room(&rooms, &room_id) {
                Some(r) => r,
                None => {
                    send_room_not_found(conn_id).await;
                    return;
                }
            };

            let new_state = RoomService::update_room_state(
                &mut rooms,
                &room_id,
                Some(crate::rooms::models::VideoState {
                    current_time: current_time.unwrap_or(room.current_time),
                    is_playing: true,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                }),
            );

            if let Some(st) = new_state {
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({
                        "event": "video:play",
                        "currentTime": st.current_time,
                        "timestamp": st.timestamp,
                    }),
                )
                .await;
            }
        }
        IncomingEvent::VideoPause {
            room_id,
            current_time,
        } => {
            let mut rooms = app_state.room_store.write().await;
            let room = match RoomService::get_room(&rooms, &room_id) {
                Some(r) => r,
                None => {
                    send_room_not_found(conn_id).await;
                    return;
                }
            };

            let new_state = RoomService::update_room_state(
                &mut rooms,
                &room_id,
                Some(crate::rooms::models::VideoState {
                    current_time: current_time.unwrap_or(room.current_time),
                    is_playing: false,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                }),
            );

            if let Some(st) = new_state {
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({
                        "event": "video:pause",
                        "currentTime": st.current_time,
                        "timestamp": st.timestamp,
                    }),
                )
                .await;
            }
        }
        IncomingEvent::VideoSeek {
            room_id,
            current_time,
        } => {
            if current_time < 0.0 {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "Invalid currentTime"
                    }),
                )
                .await;
                return;
            }

            let mut rooms = app_state.room_store.write().await;
            if RoomService::get_room(&rooms, &room_id).is_none() {
                send_room_not_found(conn_id).await;
                return;
            }

            let new_state = RoomService::update_room_state(
                &mut rooms,
                &room_id,
                Some(crate::rooms::models::VideoState {
                    current_time,
                    is_playing: false,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                }),
            );

            if let Some(st) = new_state {
                let payload = serde_json::json!({
                    "currentTime": st.current_time,
                    "timestamp": st.timestamp,
                });
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({ "event": "video:seek", "payload": payload }),
                )
                .await;
                broadcast_to_room_except(
                    &room_id,
                    conn_id,
                    serde_json::json!({ "event": "video:pause", "payload": payload }),
                )
                .await;
            }
        }
        IncomingEvent::VideoSyncRequest { room_id } => {
            let rooms = app_state.room_store.read().await;
            if let Some(state) = RoomService::get_room_state(&rooms, &room_id) {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "video:sync",
                        "payload": state
                    }),
                )
                .await;
            } else {
                send_room_not_found(conn_id).await;
            }
        }
        IncomingEvent::AudioTrackChange {
            room_id,
            track_url,
            title,
            artist,
            artwork_url,
        } => {
            let mut rooms = app_state.room_store.write().await;
            let room = match RoomService::get_room(&rooms, &room_id) {
                Some(r) => r,
                None => {
                    send_room_not_found(conn_id).await;
                    return;
                }
            };

            if !matches!(room.room_type, crate::rooms::models::RoomType::Soundcloud) {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "Not a SoundCloud room"
                    }),
                )
                .await;
                return;
            }

            if track_url.is_empty() {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "trackUrl is required"
                    }),
                )
                .await;
                return;
            }

            RoomService::update_soundcloud_metadata(
                &mut rooms,
                &room_id,
                &track_url,
                title.clone(),
                artist.clone(),
                artwork_url.clone(),
            );

            broadcast_to_room_except(
                &room_id,
                conn_id,
                serde_json::json!({
                    "event": "audio:track_change",
                    "trackUrl": track_url,
                    "title": title,
                    "artist": artist,
                    "artworkUrl": artwork_url
                }),
            )
            .await;
        }
        IncomingEvent::VideoChange {
            room_id,
            video_id,
            youtube_url,
            title,
            channel_title,
            thumbnail_url,
        } => {
            let mut rooms = app_state.room_store.write().await;
            let room = match RoomService::get_room(&rooms, &room_id) {
                Some(r) => r,
                None => {
                    send_room_not_found(conn_id).await;
                    return;
                }
            };

            if !matches!(room.room_type, crate::rooms::models::RoomType::Youtube) {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "Not a YouTube room"
                    }),
                )
                .await;
                return;
            }

            if video_id.is_empty() {
                send_to_conn(
                    conn_id,
                    serde_json::json!({
                        "event": "room:error",
                        "message": "videoId is required"
                    }),
                )
                .await;
                return;
            }

            RoomService::update_youtube_metadata(
                &mut rooms,
                &room_id,
                &video_id,
                youtube_url.clone(),
            );

            broadcast_to_room_except(
                &room_id,
                conn_id,
                serde_json::json!({
                    "event": "video:change",
                    "videoId": video_id,
                    "youtubeUrl": youtube_url,
                    "title": title,
                    "channelTitle": channel_title,
                    "thumbnailUrl": thumbnail_url
                }),
            )
            .await;
        }
        IncomingEvent::ChatSend {
            room,
            text,
            author,
            time,
            track_url,
            image_url,
        } => {
            let mut store = app_state.chat_store.write().await;
            let msg = ChatMessage {
                room: room.clone(),
                text,
                author,
                time,
                track_url,
                image_url,
            };
            ChatService::save_message(&mut store, msg.clone()).await;

            broadcast_to_room(
                &room,
                serde_json::json!({
                    "event": "chat:message",
                    "payload": msg
                }),
            )
            .await;
        }
    }
}

async fn cleanup_connection(conn_id: Uuid, app_state: &AppContext) {
    let mut ws_state = WS_STATE.write().await;

    let mut affected_rooms = Vec::new();
    for (room_id, set) in ws_state.rooms.iter_mut() {
        if set.remove(&conn_id) {
            affected_rooms.push(room_id.clone());
        }
    }

    ws_state.peers.remove(&conn_id);
    ws_state.rooms.retain(|_, set| !set.is_empty());

    drop(ws_state);

    // For each room where this connection was present, decrease participant counter
    let mut rooms_store = app_state.room_store.write().await;
    for room_id in affected_rooms {
        RoomService::remove_participant(&mut rooms_store, &room_id);
    }
}

async fn send_to_conn(conn_id: Uuid, value: serde_json::Value) {
    let text = match serde_json::to_string(&value) {
        Ok(t) => t,
        Err(_) => return,
    };

    let ws_state = WS_STATE.read().await;
    if let Some(tx) = ws_state.peers.get(&conn_id) {
        let _ = tx.send(Message::Text(text.into()));
    }
}

async fn broadcast_to_room(room_id: &str, value: serde_json::Value) {
    let text = match serde_json::to_string(&value) {
        Ok(t) => t,
        Err(_) => return,
    };

    let ws_state = WS_STATE.read().await;
    if let Some(conns) = ws_state.rooms.get(room_id) {
        for conn_id in conns {
            if let Some(tx) = ws_state.peers.get(conn_id) {
                let _ = tx.send(Message::Text(text.clone().into()));
            }
        }
    }
}

async fn broadcast_to_room_except(
    room_id: &str,
    except: Uuid,
    value: serde_json::Value,
) {
    let text = match serde_json::to_string(&value) {
        Ok(t) => t,
        Err(_) => return,
    };

    let ws_state = WS_STATE.read().await;
    if let Some(conns) = ws_state.rooms.get(room_id) {
        for conn_id in conns {
            if *conn_id == except {
                continue;
            }
            if let Some(tx) = ws_state.peers.get(conn_id) {
                let _ = tx.send(Message::Text(text.clone().into()));
            }
        }
    }
}

async fn send_room_not_found(conn_id: Uuid) {
    send_to_conn(
        conn_id,
        serde_json::json!({
            "event": "room:error",
            "message": "Room not found"
        }),
    )
    .await;
}

