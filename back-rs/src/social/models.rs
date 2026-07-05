use chrono::{DateTime, Utc};
use mongodb::bson::Bson;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

mod flexible_datetime {
    use super::*;

    pub fn serialize<S>(value: &Option<DateTime<Utc>>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        match value {
            Some(dt) => serializer.serialize_some(&dt.to_rfc3339()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
    where
        D: Deserializer<'de>,
    {
        let value = Option::<Bson>::deserialize(deserializer)?;
        match value {
            None => Ok(None),
            Some(Bson::DateTime(dt)) => DateTime::from_timestamp_millis(dt.timestamp_millis())
                .ok_or_else(|| serde::de::Error::custom("invalid BSON datetime"))
                .map(Some),
            Some(Bson::String(raw)) => DateTime::parse_from_rfc3339(&raw)
                .map(|dt| Some(dt.with_timezone(&Utc)))
                .map_err(serde::de::Error::custom),
            Some(other) => Err(serde::de::Error::custom(format!(
                "unexpected BSON type for datetime: {other:?}"
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipStatus {
    SelfUser,
    None,
    Friend,
    PendingOutgoing,
    PendingIncoming,
}

impl RelationshipStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::SelfUser => "self",
            Self::None => "none",
            Self::Friend => "friend",
            Self::PendingOutgoing => "pending_outgoing",
            Self::PendingIncoming => "pending_incoming",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendRequest {
    #[serde(rename = "_id")]
    pub id: String,
    pub from_user_id: String,
    pub to_user_id: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Friendship {
    #[serde(rename = "_id")]
    pub id: String,
    pub user_id_1: String,
    pub user_id_2: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    #[serde(rename = "_id")]
    pub id: String,
    pub participant_ids: Vec<String>,
    #[serde(
        default,
        serialize_with = "flexible_datetime::serialize",
        deserialize_with = "flexible_datetime::deserialize"
    )]
    pub last_message_at: Option<DateTime<Utc>>,
    pub last_message_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectMessage {
    #[serde(rename = "_id")]
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub text: String,
    pub created_at: DateTime<Utc>,
    #[serde(
        default,
        serialize_with = "flexible_datetime::serialize",
        deserialize_with = "flexible_datetime::deserialize"
    )]
    pub delivered_at: Option<DateTime<Utc>>,
    #[serde(
        default,
        serialize_with = "flexible_datetime::serialize",
        deserialize_with = "flexible_datetime::deserialize"
    )]
    pub read_at: Option<DateTime<Utc>>,
}
