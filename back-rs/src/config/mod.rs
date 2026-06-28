use std::env;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::auth::MongoAuthRepository;
use crate::chat::service::ChatStore;
use crate::rooms::service::RoomStore;
use crate::social::mongo::MongoSocialRepository;

#[derive(Clone, Debug)]
pub struct Settings {
    pub port: u16,
    pub mongo_url: String,
    pub jwt_secret: String,
    pub jwt_expires_in: String,
    pub smtp_host: Option<String>,
    pub smtp_port: u16,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from: Option<String>,
}

#[derive(Clone)]
pub struct AppContext {
    pub settings: Settings,
    pub auth_repo: MongoAuthRepository,
    pub social_repo: MongoSocialRepository,
    pub room_store: Arc<RwLock<RoomStore>>,
    pub chat_store: Arc<RwLock<ChatStore>>,
}

impl Settings {
    pub fn from_env() -> Self {
        let port = env::var("PORT")
            .ok()
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(5000);

        let mongo_url = env::var("MONGO_URL")
            .unwrap_or_else(|_| "mongodb://localhost:27017/remote".to_string());

        let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| {
            "your-secret-key-change-in-production".to_string()
        });

        let jwt_expires_in =
            env::var("JWT_EXPIRES_IN").unwrap_or_else(|_| "7d".to_string());

        let smtp_port = env::var("SMTP_PORT")
            .ok()
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(587);

        Self {
            port,
            mongo_url,
            jwt_secret,
            jwt_expires_in,
            smtp_host: env::var("SMTP_HOST").ok().filter(|v| !v.trim().is_empty()),
            smtp_port,
            smtp_user: env::var("SMTP_USER").ok().filter(|v| !v.trim().is_empty()),
            smtp_password: env::var("SMTP_PASSWORD")
                .ok()
                .filter(|v| !v.trim().is_empty()),
            smtp_from: env::var("SMTP_FROM").ok().filter(|v| !v.trim().is_empty()),
        }
    }
}
