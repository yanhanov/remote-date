use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use mongodb::{
    bson::{doc, to_document},
    options::{ClientOptions, IndexOptions, ReplaceOptions},
    Client, Collection, IndexModel,
};
use uuid::Uuid;

use crate::auth::models::{User, VerificationCode, RefreshToken};

const USERS_COLLECTION: &str = "users";
const REFRESH_TOKENS_COLLECTION: &str = "refresh_tokens";
const VERIFICATION_CODES_COLLECTION: &str = "verification_codes";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RefreshTokenDoc {
    #[serde(rename = "_id")]
    token: String,
    user_id: String,
    expires_at: chrono::DateTime<Utc>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct VerificationCodeDoc {
    #[serde(rename = "_id")]
    email: String,
    code: String,
    expires_at: chrono::DateTime<Utc>,
}

#[derive(Clone)]
pub struct MongoAuthRepository {
    users: Collection<User>,
    refresh_tokens: Collection<RefreshTokenDoc>,
    verification_codes: Collection<VerificationCodeDoc>,
}

impl MongoAuthRepository {
    pub async fn connect(uri: &str) -> Result<Self> {
        let mut options = ClientOptions::parse(uri)
            .await
            .context("Failed to parse MongoDB URL")?;
        options.app_name = Some("remote-date".to_string());

        let client = Client::with_options(options).context("Failed to create MongoDB client")?;
        client
            .database("admin")
            .run_command(doc! { "ping": 1 })
            .await
            .context("Failed to ping MongoDB")?;

        let db = client.default_database().context(
            "MongoDB URL must include a database name, e.g. mongodb://localhost:27017/remote",
        )?;

        let repo = Self {
            users: db.collection(USERS_COLLECTION),
            refresh_tokens: db.collection(REFRESH_TOKENS_COLLECTION),
            verification_codes: db.collection(VERIFICATION_CODES_COLLECTION),
        };

        repo.ensure_indexes().await?;
        Ok(repo)
    }

    async fn ensure_indexes(&self) -> Result<()> {
        self.users
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "email": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .name(Some("users_email_unique".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .context("Failed to create users email index")?;

        self.refresh_tokens
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "expiresAt": 1 })
                    .options(
                        IndexOptions::builder()
                            .expire_after(std::time::Duration::from_secs(0))
                            .name(Some("refresh_tokens_ttl".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .context("Failed to create refresh token TTL index")?;

        self.verification_codes
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "expiresAt": 1 })
                    .options(
                        IndexOptions::builder()
                            .expire_after(std::time::Duration::from_secs(0))
                            .name(Some("verification_codes_ttl".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .context("Failed to create verification code TTL index")?;

        self.users
            .create_index(
                IndexModel::builder()
                    .keys(doc! { "username": 1 })
                    .options(
                        IndexOptions::builder()
                            .unique(true)
                            .sparse(true)
                            .name(Some("users_username_unique".to_string()))
                            .build(),
                    )
                    .build(),
            )
            .await
            .ok();

        Ok(())
    }

    pub async fn create_user(
        &self,
        email: String,
        username: String,
        password_hash: String,
        verified: bool,
    ) -> Result<User> {
        self.users
            .delete_one(doc! { "email": &email, "verified": false })
            .await?;

        let id = Uuid::new_v4().to_string();
        let user = User {
            id: id.clone(),
            email: email.clone(),
            username: Some(username),
            password_hash,
            created_at: Utc::now(),
            verified,
            first_name: None,
            last_name: None,
            birth_date: None,
            sex: None,
            avatar_url: None,
            last_youtube_room_id: None,
            last_soundcloud_room_id: None,
        };

        self.users.insert_one(&user).await?;
        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<User>> {
        Ok(self.users.find_one(doc! { "email": email }).await?)
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<User>> {
        Ok(self
            .users
            .find_one(doc! { "username": username })
            .await?)
    }

    pub async fn get_user_by_id(&self, id: &str) -> Result<Option<User>> {
        Ok(self.users.find_one(doc! { "_id": id }).await?)
    }

    pub async fn save_user(&self, user: &User) -> Result<()> {
        let filter = doc! { "_id": &user.id };
        let update = doc! { "$set": to_document(user)? };
        self.users.update_one(filter, update).await?;
        Ok(())
    }

    pub async fn save_verification_code(
        &self,
        email: String,
        code: String,
        minutes: i64,
    ) -> Result<()> {
        let doc = VerificationCodeDoc {
            email: email.clone(),
            code,
            expires_at: Utc::now() + Duration::minutes(minutes),
        };

        self.verification_codes
            .replace_one(doc! { "_id": &email }, &doc)
            .with_options(ReplaceOptions::builder().upsert(true).build())
            .await?;

        Ok(())
    }

    pub async fn take_verification_code(&self, email: &str) -> Result<Option<VerificationCode>> {
        let doc = self
            .verification_codes
            .find_one_and_delete(doc! { "_id": email })
            .await?;

        Ok(doc.map(|item| VerificationCode {
            code: item.code,
            expires_at: item.expires_at,
        }))
    }

    pub async fn store_refresh_token(
        &self,
        user_id: String,
        token: String,
        days: i64,
    ) -> Result<()> {
        let doc = RefreshTokenDoc {
            token: token.clone(),
            user_id,
            expires_at: Utc::now() + Duration::days(days),
        };

        self.refresh_tokens.insert_one(doc).await?;
        Ok(())
    }

    pub async fn get_refresh_token(&self, token: &str) -> Result<Option<RefreshToken>> {
        let doc = self.refresh_tokens.find_one(doc! { "_id": token }).await?;
        Ok(doc.map(|item| RefreshToken {
            user_id: item.user_id,
            expires_at: item.expires_at,
        }))
    }

    pub async fn delete_refresh_token(&self, token: &str) -> Result<()> {
        self.refresh_tokens
            .delete_one(doc! { "_id": token })
            .await?;
        Ok(())
    }

    pub async fn set_last_room_id(
        &self,
        user_id: &str,
        room_id: &str,
        room_type: &str,
    ) -> Result<()> {
        let field = match room_type {
            "youtube" => "lastYoutubeRoomId",
            "soundcloud" => "lastSoundcloudRoomId",
            _ => return Err(anyhow::anyhow!("Invalid room type")),
        };

        self.users
            .update_one(
                doc! { "_id": user_id },
                doc! { "$set": { field: room_id } },
            )
            .await?;
        Ok(())
    }

    pub async fn get_last_room_id(
        &self,
        user_id: &str,
        room_type: &str,
    ) -> Result<Option<String>> {
        let user = self.get_user_by_id(user_id).await?;
        Ok(match (user, room_type) {
            (Some(u), "youtube") => u.last_youtube_room_id,
            (Some(u), "soundcloud") => u.last_soundcloud_room_id,
            (Some(_), _) => return Err(anyhow::anyhow!("Invalid room type")),
            (None, _) => None,
        })
    }
}
