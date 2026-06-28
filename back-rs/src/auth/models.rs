use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Sex {
    Male,
    Female,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    #[serde(rename = "_id")]
    pub id: String,
    pub email: String,
    pub username: Option<String>,
    #[serde(rename = "passwordHash")]
    pub password_hash: String,
    pub created_at: DateTime<Utc>,
    pub verified: bool,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub birth_date: Option<DateTime<Utc>>,
    pub sex: Option<Sex>,
    pub avatar_url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RefreshToken {
    pub user_id: String,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct VerificationCode {
    pub code: String,
    pub expires_at: DateTime<Utc>,
}
