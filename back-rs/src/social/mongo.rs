use anyhow::{Context, Result};
use chrono::Utc;
use mongodb::{
    bson::doc,
    options::{ClientOptions, FindOptions, IndexOptions},
    Client, Collection, IndexModel,
};
use uuid::Uuid;

use crate::auth::models::User;
use crate::social::models::{Conversation, DirectMessage, FriendRequest, Friendship};

const USERS_COLLECTION: &str = "users";
const FRIEND_REQUESTS_COLLECTION: &str = "friend_requests";
const FRIENDSHIPS_COLLECTION: &str = "friendships";
const CONVERSATIONS_COLLECTION: &str = "conversations";
const DIRECT_MESSAGES_COLLECTION: &str = "direct_messages";

pub fn pair_id(user_a: &str, user_b: &str) -> String {
    if user_a <= user_b {
        format!("{}:{}", user_a, user_b)
    } else {
        format!("{}:{}", user_b, user_a)
    }
}

#[derive(Clone)]
pub struct MongoSocialRepository {
    users: Collection<User>,
    friend_requests: Collection<FriendRequest>,
    friendships: Collection<Friendship>,
    conversations: Collection<Conversation>,
    messages: Collection<DirectMessage>,
}

impl MongoSocialRepository {
    pub async fn connect(uri: &str) -> Result<Self> {
        let mut options = ClientOptions::parse(uri)
            .await
            .context("Failed to parse MongoDB URL")?;
        options.app_name = Some("remote-date-social".to_string());

        let client = Client::with_options(options).context("Failed to create MongoDB client")?;
        let db = client.default_database().context(
            "MongoDB URL must include a database name, e.g. mongodb://localhost:27017/remote",
        )?;

        let repo = Self {
            users: db.collection(USERS_COLLECTION),
            friend_requests: db.collection(FRIEND_REQUESTS_COLLECTION),
            friendships: db.collection(FRIENDSHIPS_COLLECTION),
            conversations: db.collection(CONVERSATIONS_COLLECTION),
            messages: db.collection(DIRECT_MESSAGES_COLLECTION),
        };

        repo.ensure_indexes().await?;
        Ok(repo)
    }

    async fn ensure_indexes(&self) -> Result<()> {
        self.friend_requests
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "fromUserId": 1, "toUserId": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .name(Some("friend_requests_pair_unique".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .ok();

        self.friendships
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "_id": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .name(Some("friendships_id_unique".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .ok();

        self.messages
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "conversationId": 1, "createdAt": 1 })
                    .options(
                        IndexOptions::builder()
                            .name(Some("direct_messages_conversation_created".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .ok();

        Ok(())
    }

    pub async fn get_user_by_id(&self, id: &str) -> Result<Option<User>> {
        Ok(self.users.find_one(doc! { "_id": id }).await?)
    }

    pub async fn search_users(&self, query: &str, exclude_id: &str, limit: i64) -> Result<Vec<User>> {
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(vec![]);
        }

        let regex = format!("{}", regex::escape(trimmed));
        let filter = doc! {
            "_id": { "$ne": exclude_id },
            "verified": true,
            "$or": [
                { "firstName": { "$regex": &regex, "$options": "i" } },
                { "lastName": { "$regex": &regex, "$options": "i" } },
                { "username": { "$regex": &regex, "$options": "i" } },
                { "email": { "$regex": &regex, "$options": "i" } },
            ]
        };

        let options = FindOptions::builder().limit(limit).build();
        let mut cursor = self.users.find(filter).with_options(options).await?;
        let mut users = Vec::new();
        while cursor.advance().await? {
            users.push(cursor.deserialize_current()?);
        }
        Ok(users)
    }

    pub async fn get_friendship(&self, user_a: &str, user_b: &str) -> Result<Option<Friendship>> {
        let id = pair_id(user_a, user_b);
        Ok(self.friendships.find_one(doc! { "_id": id }).await?)
    }

    pub async fn list_friendships(&self, user_id: &str) -> Result<Vec<Friendship>> {
        let filter = doc! {
            "$or": [
                { "userId1": user_id },
                { "userId2": user_id },
            ]
        };
        let mut cursor = self.friendships.find(filter).await?;
        let mut items = Vec::new();
        while cursor.advance().await? {
            items.push(cursor.deserialize_current()?);
        }
        Ok(items)
    }

    pub async fn create_friendship(&self, user_a: &str, user_b: &str) -> Result<Friendship> {
        let (user_id_1, user_id_2) = if user_a <= user_b {
            (user_a.to_string(), user_b.to_string())
        } else {
            (user_b.to_string(), user_a.to_string())
        };

        let friendship = Friendship {
            id: pair_id(user_a, user_b),
            user_id_1,
            user_id_2,
            created_at: Utc::now(),
        };

        self.friendships.insert_one(&friendship).await?;
        Ok(friendship)
    }

    pub async fn find_friend_request_between(
        &self,
        user_a: &str,
        user_b: &str,
    ) -> Result<Option<FriendRequest>> {
        Ok(self
            .friend_requests
            .find_one(doc! {
                "$or": [
                    { "fromUserId": user_a, "toUserId": user_b },
                    { "fromUserId": user_b, "toUserId": user_a },
                ]
            })
            .await?)
    }

    pub async fn get_friend_request_by_id(&self, id: &str) -> Result<Option<FriendRequest>> {
        Ok(self.friend_requests.find_one(doc! { "_id": id }).await?)
    }

    pub async fn list_incoming_requests(&self, user_id: &str) -> Result<Vec<FriendRequest>> {
        let mut cursor = self
            .friend_requests
            .find(doc! { "toUserId": user_id })
            .await?;
        let mut items = Vec::new();
        while cursor.advance().await? {
            items.push(cursor.deserialize_current()?);
        }
        Ok(items)
    }

    pub async fn list_outgoing_requests(&self, user_id: &str) -> Result<Vec<FriendRequest>> {
        let mut cursor = self
            .friend_requests
            .find(doc! { "fromUserId": user_id })
            .await?;
        let mut items = Vec::new();
        while cursor.advance().await? {
            items.push(cursor.deserialize_current()?);
        }
        Ok(items)
    }

    pub async fn create_friend_request(
        &self,
        from_user_id: String,
        to_user_id: String,
    ) -> Result<FriendRequest> {
        let request = FriendRequest {
            id: Uuid::new_v4().to_string(),
            from_user_id,
            to_user_id,
            created_at: Utc::now(),
        };
        self.friend_requests.insert_one(&request).await?;
        Ok(request)
    }

    pub async fn delete_friend_request(&self, id: &str) -> Result<()> {
        self.friend_requests
            .delete_one(doc! { "_id": id })
            .await?;
        Ok(())
    }

    pub async fn get_conversation(&self, id: &str) -> Result<Option<Conversation>> {
        Ok(self.conversations.find_one(doc! { "_id": id }).await?)
    }

    pub async fn list_conversations(&self, user_id: &str) -> Result<Vec<Conversation>> {
        let filter = doc! { "participantIds": user_id };
        let options = FindOptions::builder()
            .sort(doc! { "lastMessageAt": -1 })
            .build();
        let mut cursor = self.conversations.find(filter).with_options(options).await?;
        let mut items = Vec::new();
        while cursor.advance().await? {
            items.push(cursor.deserialize_current()?);
        }
        Ok(items)
    }

    pub async fn upsert_conversation(&self, user_a: &str, user_b: &str) -> Result<Conversation> {
        let id = pair_id(user_a, user_b);
        if let Some(existing) = self.get_conversation(&id).await? {
            return Ok(existing);
        }

        let conversation = Conversation {
            id: id.clone(),
            participant_ids: vec![user_a.to_string(), user_b.to_string()],
            last_message_at: None,
            last_message_text: None,
        };

        self.conversations.insert_one(&conversation).await?;
        Ok(conversation)
    }

    pub async fn update_conversation_preview(
        &self,
        conversation_id: &str,
        text: &str,
        at: chrono::DateTime<Utc>,
    ) -> Result<()> {
        let last_message_at = at.to_rfc3339();

        self.conversations
            .update_one(
                doc! { "_id": conversation_id },
                doc! {
                    "$set": {
                        "lastMessageAt": last_message_at,
                        "lastMessageText": text,
                    }
                },
            )
            .await?;

        Ok(())
    }

    pub async fn list_messages(
        &self,
        conversation_id: &str,
        limit: i64,
    ) -> Result<Vec<DirectMessage>> {
        let filter = doc! { "conversationId": conversation_id };
        let options = FindOptions::builder()
            .sort(doc! { "createdAt": 1 })
            .limit(limit)
            .build();
        let mut cursor = self.messages.find(filter).with_options(options).await?;
        let mut items = Vec::new();
        while cursor.advance().await? {
            items.push(cursor.deserialize_current()?);
        }
        Ok(items)
    }

    pub async fn insert_message(
        &self,
        conversation_id: String,
        sender_id: String,
        text: String,
    ) -> Result<DirectMessage> {
        let message = DirectMessage {
            id: Uuid::new_v4().to_string(),
            conversation_id: conversation_id.clone(),
            sender_id,
            text: text.clone(),
            created_at: Utc::now(),
        };

        self.messages.insert_one(&message).await?;
        self.update_conversation_preview(&conversation_id, &text, message.created_at)
            .await?;

        Ok(message)
    }
}
