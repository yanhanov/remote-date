use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post},
    Json, Router,
};

use crate::auth::extractor::AuthUser;
use crate::config::AppContext;
use crate::social::mongo::MongoSocialRepository;
use crate::social::service::SocialService;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SearchQuery {
    q: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendFriendRequestDto {
    to_user_id: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendMessageDto {
    text: String,
}

pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/users/search", get(search_users))
        .route("/users/{id}", get(get_user_profile))
        .route("/friends", get(list_friends))
        .route("/friends/requests", get(list_friend_requests).post(send_friend_request))
        .route("/friends/requests/{id}/accept", post(accept_friend_request))
        .route("/friends/requests/{id}", delete(reject_friend_request))
        .route("/messages/conversations", get(list_conversations))
        .route("/messages/with/{user_id}", get(get_thread).post(send_message))
}

async fn search_users(
    State(state): State<AppContext>,
    user: AuthUser,
    Query(query): Query<SearchQuery>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match state
        .social_repo
        .search_users(&query.q, &user.user_id, 20)
        .await
    {
        Ok(users) => {
            let mut results = Vec::new();
            for target in users {
                let relationship =
                    match SocialService::relationship_status(&state.social_repo, &user.user_id, &target.id)
                        .await
                    {
                        Ok(status) => status.as_str().to_string(),
                        Err(_) => "none".to_string(),
                    };

                results.push(serde_json::json!({
                    "userId": target.id,
                    "username": target.username,
                    "firstName": target.first_name,
                    "lastName": target.last_name,
                    "avatarUrl": target.avatar_url,
                    "displayName": SocialService::display_name(&target),
                    "relationship": relationship,
                }));
            }

            (axum::http::StatusCode::OK, Json(serde_json::json!({ "users": results })))
        }
        Err(err) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn get_user_profile(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let target = match state.social_repo.get_user_by_id(&id).await {
        Ok(Some(user)) => user,
        Ok(None) => {
            return (
                axum::http::StatusCode::NOT_FOUND,
                Json(serde_json::json!({ "error": "User not found" })),
            )
        }
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let relationship = match SocialService::relationship_status(&state.social_repo, &user.user_id, &id)
        .await
    {
        Ok(status) => status.as_str().to_string(),
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let incoming_request_id = if relationship == "pending_incoming" {
        state
            .social_repo
            .find_friend_request_between(&user.user_id, &id)
            .await
            .ok()
            .flatten()
            .map(|request| request.id)
    } else {
        None
    };

    let friends_since = if relationship == "friend" {
        state
            .social_repo
            .get_friendship(&user.user_id, &id)
            .await
            .ok()
            .flatten()
            .map(|friendship| friendship.created_at)
    } else {
        None
    };

    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({
            "userId": target.id,
            "username": target.username,
            "firstName": target.first_name,
            "lastName": target.last_name,
            "avatarUrl": target.avatar_url,
            "birthDate": target.birth_date,
            "sex": target.sex,
            "createdAt": target.created_at,
            "displayName": SocialService::display_name(&target),
            "relationship": relationship,
            "incomingRequestId": incoming_request_id,
            "friendsSince": friends_since,
        })),
    )
}

async fn list_friends(
    State(state): State<AppContext>,
    user: AuthUser,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match state.social_repo.list_friendships(&user.user_id).await {
        Ok(friendships) => {
            let mut friends = Vec::new();
            for friendship in friendships {
                let other_id = SocialService::other_user_id(&friendship, &user.user_id);
                if let Ok(Some(other)) = state.social_repo.get_user_by_id(&other_id).await {
                    friends.push(serde_json::json!({
                        "userId": other.id,
                        "username": other.username,
                        "firstName": other.first_name,
                        "lastName": other.last_name,
                        "avatarUrl": other.avatar_url,
                        "displayName": SocialService::display_name(&other),
                        "friendsSince": friendship.created_at,
                    }));
                }
            }

            (axum::http::StatusCode::OK, Json(serde_json::json!({ "friends": friends })))
        }
        Err(err) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn list_friend_requests(
    State(state): State<AppContext>,
    user: AuthUser,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let incoming = match state.social_repo.list_incoming_requests(&user.user_id).await {
        Ok(items) => items,
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let outgoing = match state.social_repo.list_outgoing_requests(&user.user_id).await {
        Ok(items) => items,
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let incoming_items = build_request_items(&state.social_repo, incoming, true).await;
    let outgoing_items = build_request_items(&state.social_repo, outgoing, false).await;

    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({
            "incoming": incoming_items,
            "outgoing": outgoing_items,
        })),
    )
}

async fn build_request_items(
    repo: &MongoSocialRepository,
    requests: Vec<crate::social::models::FriendRequest>,
    incoming: bool,
) -> Vec<serde_json::Value> {
    let mut items = Vec::new();

    for request in requests {
        let other_id = if incoming {
            request.from_user_id.clone()
        } else {
            request.to_user_id.clone()
        };

        if let Ok(Some(other)) = repo.get_user_by_id(&other_id).await {
            items.push(serde_json::json!({
                "requestId": request.id,
                "userId": other.id,
                "username": other.username,
                "firstName": other.first_name,
                "lastName": other.last_name,
                "avatarUrl": other.avatar_url,
                "displayName": SocialService::display_name(&other),
                "createdAt": request.created_at,
            }));
        }
    }

    items
}

async fn send_friend_request(
    State(state): State<AppContext>,
    user: AuthUser,
    Json(dto): Json<SendFriendRequestDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match SocialService::send_friend_request(
        &state.social_repo,
        user.user_id,
        dto.to_user_id,
    )
    .await
    {
        Ok(request) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({
                "requestId": request.id,
                "message": "Friend request sent",
            })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn accept_friend_request(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match SocialService::accept_friend_request(&state.social_repo, &id, &user.user_id).await {
        Ok(()) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({ "message": "Friend request accepted" })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn reject_friend_request(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match SocialService::reject_friend_request(&state.social_repo, &id, &user.user_id).await {
        Ok(()) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({ "message": "Friend request removed" })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn list_conversations(
    State(state): State<AppContext>,
    user: AuthUser,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match state.social_repo.list_conversations(&user.user_id).await {
        Ok(conversations) => {
            let mut items = Vec::new();

            for conversation in conversations {
                let other_id = conversation
                    .participant_ids
                    .iter()
                    .find(|id| **id != user.user_id)
                    .cloned()
                    .unwrap_or_default();

                if let Ok(Some(other)) = state.social_repo.get_user_by_id(&other_id).await {
                    items.push(serde_json::json!({
                        "conversationId": conversation.id,
                        "userId": other.id,
                        "username": other.username,
                        "displayName": SocialService::display_name(&other),
                        "avatarUrl": other.avatar_url,
                        "lastMessageText": conversation.last_message_text,
                        "lastMessageAt": conversation.last_message_at,
                    }));
                }
            }

            (axum::http::StatusCode::OK, Json(serde_json::json!({ "conversations": items })))
        }
        Err(err) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn get_thread(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(user_id): Path<String>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    if state.social_repo.get_friendship(&user.user_id, &user_id).await.ok().flatten().is_none() {
        return (
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "You can only message friends" })),
        );
    }

    let conversation = match state
        .social_repo
        .upsert_conversation(&user.user_id, &user_id)
        .await
    {
        Ok(conversation) => conversation,
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let messages = match state
        .social_repo
        .list_messages(&conversation.id, 200)
        .await
    {
        Ok(messages) => messages
            .into_iter()
            .map(|message| {
                serde_json::json!({
                    "id": message.id,
                    "senderId": message.sender_id,
                    "text": message.text,
                    "createdAt": message.created_at,
                    "isOwn": message.sender_id == user.user_id,
                })
            })
            .collect::<Vec<_>>(),
        Err(err) => {
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": err.to_string() })),
            )
        }
    };

    let other = state.social_repo.get_user_by_id(&user_id).await.ok().flatten();

    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({
            "conversationId": conversation.id,
            "userId": user_id,
            "displayName": other.as_ref().map(SocialService::display_name),
            "username": other.as_ref().and_then(|user| user.username.clone()),
            "avatarUrl": other.and_then(|user| user.avatar_url),
            "messages": messages,
        })),
    )
}

async fn send_message(
    State(state): State<AppContext>,
    user: AuthUser,
    Path(user_id): Path<String>,
    Json(dto): Json<SendMessageDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match SocialService::send_direct_message(
        &state.social_repo,
        &user.user_id,
        &user_id,
        dto.text,
    )
    .await
    {
        Ok(message) => (
            axum::http::StatusCode::OK,
            Json(serde_json::json!({
                "id": message.id,
                "senderId": message.sender_id,
                "text": message.text,
                "createdAt": message.created_at,
                "isOwn": true,
            })),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}
