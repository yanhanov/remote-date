use anyhow::{anyhow, Result};
use bcrypt::{hash, verify};

use crate::auth::dto::{
    LoginDto, LoginResponse, RegisterCheckDto, RegisterCheckResponse, RegisterDto,
    RegisterResponse, RefreshTokenResponse, UpdateProfileDto, UsernameCheckResponse,
};
use crate::auth::jwt;
use crate::auth::models::{Sex, User};
use crate::auth::mongo::MongoAuthRepository;
use crate::config::Settings;
use crate::email::EmailService;

const CODE_EXPIRY_MINUTES: i64 = 15;
const REFRESH_TOKEN_EXPIRY_DAYS: i64 = 30;

pub struct AuthService;

fn normalize_username(raw: &str) -> Result<String> {
    let username = raw.trim().to_lowercase();
    let username_regex =
        regex::Regex::new(r"^[a-z][a-z0-9_]{2,29}$").unwrap();

    if !username_regex.is_match(&username) {
        return Err(anyhow!(
            "Username must be 3-30 characters, start with a letter, and use only letters, numbers, or underscores"
        ));
    }

    Ok(username)
}

impl AuthService {
    pub async fn register(
        settings: &Settings,
        repo: &MongoAuthRepository,
        dto: RegisterDto,
    ) -> Result<RegisterResponse> {
        let email = dto.email.trim().to_lowercase();
        let password = dto.password;
        let username = normalize_username(&dto.username)?;

        let email_regex =
            regex::Regex::new(r"^[^\s@]+@[^\s@]+\.[^\s@]+$").unwrap();
        if !email_regex.is_match(&email) {
            return Err(anyhow!("Invalid email format"));
        }

        if password.len() < 6 {
            return Err(anyhow!("Password must be at least 6 characters"));
        }

        if let Some(existing) = repo.get_user_by_username(&username).await? {
            if existing.email != email {
                return Err(anyhow!("Username is already taken"));
            }
        }

        if let Some(existing) = repo.get_user_by_email(&email).await? {
            if existing.verified {
                return Err(anyhow!("User with this email already exists"));
            }
        }

        let hashed_password = hash(password, 10)?;
        repo.create_user(email.clone(), username, hashed_password, false)
            .await?;

        let code = format!("{:06}", fastrand::u32(0..1_000_000));
        repo.save_verification_code(email.clone(), code.clone(), CODE_EXPIRY_MINUTES)
            .await?;

        EmailService::send_verification_code(settings, &email, &code).await?;

        Ok(RegisterResponse {
            message: "Verification code sent to your email".to_string(),
            email,
        })
    }

    pub async fn check_username(
        repo: &MongoAuthRepository,
        raw: &str,
    ) -> Result<UsernameCheckResponse> {
        match normalize_username(raw) {
            Ok(username) => {
                if repo.get_user_by_username(&username).await?.is_some() {
                    Ok(UsernameCheckResponse {
                        available: false,
                        reason: Some("Username is already taken".to_string()),
                    })
                } else {
                    Ok(UsernameCheckResponse {
                        available: true,
                        reason: None,
                    })
                }
            }
            Err(err) => Ok(UsernameCheckResponse {
                available: false,
                reason: Some(err.to_string()),
            }),
        }
    }

    pub async fn register_check(
        settings: &Settings,
        repo: &MongoAuthRepository,
        dto: RegisterCheckDto,
    ) -> Result<RegisterCheckResponse> {
        let email = dto.email.trim().to_lowercase();
        let code = dto.code.trim().to_string();

        let vc = repo
            .take_verification_code(&email)
            .await?
            .ok_or_else(|| anyhow!("Verification code not found or expired"))?;

        if chrono::Utc::now() > vc.expires_at {
            return Err(anyhow!("Verification code has expired"));
        }

        if vc.code != code {
            return Err(anyhow!("Invalid verification code"));
        }

        let mut user = repo
            .get_user_by_email(&email)
            .await?
            .ok_or_else(|| anyhow!("User not found"))?;
        user.verified = true;
        repo.save_user(&user).await?;

        let access_token =
            jwt::generate_access_token(settings, user.id.clone(), user.email.clone())?;
        let refresh_token = uuid::Uuid::new_v4().to_string();
        repo.store_refresh_token(
            user.id.clone(),
            refresh_token.clone(),
            REFRESH_TOKEN_EXPIRY_DAYS,
        )
        .await?;

        Ok(RegisterCheckResponse {
            message: "Registration successful".to_string(),
            user_id: user.id,
            access_token,
            refresh_token,
        })
    }

    pub async fn login(
        settings: &Settings,
        repo: &MongoAuthRepository,
        dto: LoginDto,
    ) -> Result<LoginResponse> {
        let login = dto.login.trim();
        let password = dto.password;

        let user = if login.contains('@') {
            repo.get_user_by_email(&login.to_lowercase()).await?
        } else {
            repo.get_user_by_username(&login.to_lowercase()).await?
        }
        .ok_or_else(|| anyhow!("Invalid email, username or password"))?;

        if !user.verified {
            return Err(anyhow!("Please verify your email first"));
        }

        if !verify(password, &user.password_hash)? {
            return Err(anyhow!("Invalid email, username or password"));
        }

        let access_token =
            jwt::generate_access_token(settings, user.id.clone(), user.email.clone())?;
        let refresh_token = uuid::Uuid::new_v4().to_string();
        repo.store_refresh_token(
            user.id.clone(),
            refresh_token.clone(),
            REFRESH_TOKEN_EXPIRY_DAYS,
        )
        .await?;

        Ok(LoginResponse {
            message: "Login successful".to_string(),
            user_id: user.id,
            email: user.email,
            access_token,
            refresh_token,
        })
    }

    pub async fn refresh_access_token(
        settings: &Settings,
        repo: &MongoAuthRepository,
        refresh_token: String,
    ) -> Result<RefreshTokenResponse> {
        let token_doc = repo
            .get_refresh_token(&refresh_token)
            .await?
            .ok_or_else(|| anyhow!("Invalid refresh token"))?;

        if chrono::Utc::now() > token_doc.expires_at {
            repo.delete_refresh_token(&refresh_token).await?;
            return Err(anyhow!("Refresh token has expired"));
        }

        let user = repo
            .get_user_by_id(&token_doc.user_id)
            .await?
            .ok_or_else(|| anyhow!("User not found or not verified"))?;

        if !user.verified {
            return Err(anyhow!("User not found or not verified"));
        }

        let new_access =
            jwt::generate_access_token(settings, user.id.clone(), user.email.clone())?;
        let new_refresh = uuid::Uuid::new_v4().to_string();

        repo.delete_refresh_token(&refresh_token).await?;
        repo.store_refresh_token(
            user.id.clone(),
            new_refresh.clone(),
            REFRESH_TOKEN_EXPIRY_DAYS,
        )
        .await?;

        Ok(RefreshTokenResponse {
            access_token: new_access,
            refresh_token: new_refresh,
        })
    }

    pub async fn logout(repo: &MongoAuthRepository, refresh_token: String) -> Result<()> {
        repo.delete_refresh_token(&refresh_token).await?;
        Ok(())
    }

    pub async fn update_profile(
        repo: &MongoAuthRepository,
        user_id: String,
        dto: UpdateProfileDto,
    ) -> Result<User> {
        let mut user = repo
            .get_user_by_id(&user_id)
            .await?
            .ok_or_else(|| anyhow!("User not found"))?;

        if let Some(raw) = dto.username {
            if raw.trim().is_empty() {
                user.username = None;
            } else {
                let username = normalize_username(&raw)?;
                if let Some(other) = repo.get_user_by_username(&username).await? {
                    if other.id != user.id {
                        return Err(anyhow!("Username is already taken"));
                    }
                }
                user.username = Some(username);
            }
        }
        if let Some(first) = dto.first_name {
            user.first_name = if first.trim().is_empty() {
                None
            } else {
                Some(first.trim().to_string())
            };
        }
        if let Some(last) = dto.last_name {
            user.last_name = if last.trim().is_empty() {
                None
            } else {
                Some(last.trim().to_string())
            };
        }
        if let Some(url) = dto.avatar_url {
            user.avatar_url = if url.is_empty() { None } else { Some(url) };
        }
        if let Some(sex) = dto.sex {
            user.sex = match sex.as_str() {
                "male" => Some(Sex::Male),
                "female" => Some(Sex::Female),
                "other" => Some(Sex::Other),
                "" => None,
                _ => user.sex,
            };
        }
        if let Some(birth) = dto.birth_date {
            if birth.is_empty() {
                user.birth_date = None;
            } else if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(&birth) {
                user.birth_date = Some(dt.with_timezone(&chrono::Utc));
            } else if let Ok(date) = chrono::NaiveDate::parse_from_str(&birth, "%Y-%m-%d") {
                user.birth_date = date.and_hms_opt(0, 0, 0).map(|dt| dt.and_utc());
            }
        }

        repo.save_user(&user).await?;
        Ok(user)
    }
}
