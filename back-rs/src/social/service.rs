use anyhow::{anyhow, Result};

use crate::auth::models::User;
use crate::social::models::{DirectMessage, FriendRequest, RelationshipStatus};
use crate::social::mongo::MongoSocialRepository;

pub struct SocialService;

impl SocialService {
    pub async fn relationship_status(
        repo: &MongoSocialRepository,
        viewer_id: &str,
        target_id: &str,
    ) -> Result<RelationshipStatus> {
        if viewer_id == target_id {
            return Ok(RelationshipStatus::SelfUser);
        }

        if repo.get_friendship(viewer_id, target_id).await?.is_some() {
            return Ok(RelationshipStatus::Friend);
        }

        if let Some(request) = repo.find_friend_request_between(viewer_id, target_id).await? {
            if request.from_user_id == viewer_id {
                return Ok(RelationshipStatus::PendingOutgoing);
            }
            return Ok(RelationshipStatus::PendingIncoming);
        }

        Ok(RelationshipStatus::None)
    }

    pub async fn send_friend_request(
        repo: &MongoSocialRepository,
        from_user_id: String,
        to_user_id: String,
    ) -> Result<FriendRequest> {
        if from_user_id == to_user_id {
            return Err(anyhow!("Cannot send a friend request to yourself"));
        }

        if repo.get_user_by_id(&to_user_id).await?.is_none() {
            return Err(anyhow!("User not found"));
        }

        if repo
            .get_friendship(&from_user_id, &to_user_id)
            .await?
            .is_some()
        {
            return Err(anyhow!("Already friends"));
        }

        if let Some(existing) = repo
            .find_friend_request_between(&from_user_id, &to_user_id)
            .await?
        {
            if existing.from_user_id == from_user_id {
                return Err(anyhow!("Friend request already sent"));
            }
            return Err(anyhow!("This user already sent you a friend request"));
        }

        repo.create_friend_request(from_user_id, to_user_id).await
    }

    pub async fn accept_friend_request(
        repo: &MongoSocialRepository,
        request_id: &str,
        user_id: &str,
    ) -> Result<()> {
        let request = repo
            .get_friend_request_by_id(request_id)
            .await?
            .ok_or_else(|| anyhow!("Friend request not found"))?;

        if request.to_user_id != user_id {
            return Err(anyhow!("Not allowed to accept this request"));
        }

        repo.create_friendship(&request.from_user_id, &request.to_user_id)
            .await?;
        repo.delete_friend_request(request_id).await?;
        let _ = repo
            .upsert_conversation(&request.from_user_id, &request.to_user_id)
            .await;

        Ok(())
    }

    pub async fn reject_friend_request(
        repo: &MongoSocialRepository,
        request_id: &str,
        user_id: &str,
    ) -> Result<()> {
        let request = repo
            .get_friend_request_by_id(request_id)
            .await?
            .ok_or_else(|| anyhow!("Friend request not found"))?;

        if request.to_user_id != user_id && request.from_user_id != user_id {
            return Err(anyhow!("Not allowed to reject this request"));
        }

        repo.delete_friend_request(request_id).await?;
        Ok(())
    }

    pub async fn send_direct_message(
        repo: &MongoSocialRepository,
        sender_id: &str,
        recipient_id: &str,
        text: String,
    ) -> Result<DirectMessage> {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() {
            return Err(anyhow!("Message cannot be empty"));
        }

        if sender_id == recipient_id {
            return Err(anyhow!("Cannot message yourself"));
        }

        if repo.get_user_by_id(recipient_id).await?.is_none() {
            return Err(anyhow!("User not found"));
        }

        if repo.get_friendship(sender_id, recipient_id).await?.is_none() {
            return Err(anyhow!("You can only message friends"));
        }

        let conversation = repo.upsert_conversation(sender_id, recipient_id).await?;
        repo.insert_message(conversation.id, sender_id.to_string(), trimmed)
            .await
    }

    pub fn other_user_id(friendship: &crate::social::models::Friendship, self_id: &str) -> String {
        if friendship.user_id_1 == self_id {
            friendship.user_id_2.clone()
        } else {
            friendship.user_id_1.clone()
        }
    }

    pub fn display_name(user: &User) -> String {
        match (&user.first_name, &user.last_name) {
            (Some(first), Some(last)) => format!("{} {}", first, last),
            (Some(first), None) => first.clone(),
            (None, Some(last)) => last.clone(),
            (None, None) => user
                .username
                .clone()
                .unwrap_or_else(|| user.email.clone()),
        }
    }
}
