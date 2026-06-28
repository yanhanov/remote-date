use std::env;
use std::sync::Arc;

use tokio::sync::RwLock;

use crate::auth::MongoAuthRepository;
use crate::chat::service::ChatStore;
use crate::rooms::service::RoomStore;

#[derive(Clone, Debug)]
pub struct Settings {
    pub port: u16,
    pub mongo_url: String,
    pub jwt_secret: String,
    pub jwt_expires_in: String,
}

#[derive(Clone)]
pub struct AppContext {
    pub settings: Settings,
    pub auth_repo: MongoAuthRepository,
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

        Self {
            port,
            mongo_url,
            jwt_secret,
            jwt_expires_in,
        }
    }
}
