use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};

use crate::auth::dto::{
    LoginDto, RegisterCheckDto, RegisterDto, RefreshTokenRequest, UpdateProfileDto,
};
use crate::auth::extractor::AuthUser;
use crate::auth::service::AuthService;
use crate::config::AppContext;

/// Router for /api/auth endpoints.
pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/register", post(register))
        .route("/register-check", post(register_check))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/me", get(get_me).patch(update_me))
}

async fn register(
    State(state): State<AppContext>,
    Json(dto): Json<RegisterDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match AuthService::register(&state.settings, &state.auth_repo, dto).await {
        Ok(resp) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(resp).unwrap()),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn register_check(
    State(state): State<AppContext>,
    Json(dto): Json<RegisterCheckDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match AuthService::register_check(&state.settings, &state.auth_repo, dto).await {
        Ok(resp) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(resp).unwrap()),
        ),
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn login(
    State(state): State<AppContext>,
    Json(dto): Json<LoginDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match AuthService::login(&state.settings, &state.auth_repo, dto).await {
        Ok(resp) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(resp).unwrap()),
        ),
        Err(err) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn refresh(
    State(state): State<AppContext>,
    Json(dto): Json<RefreshTokenRequest>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match AuthService::refresh_access_token(
        &state.settings,
        &state.auth_repo,
        dto.refresh_token,
    )
    .await
    {
        Ok(resp) => (
            axum::http::StatusCode::OK,
            Json(serde_json::to_value(resp).unwrap()),
        ),
        Err(err) => (
            axum::http::StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn logout(
    State(state): State<AppContext>,
    Json(dto): Json<RefreshTokenRequest>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    let _ = AuthService::logout(&state.auth_repo, dto.refresh_token).await;
    (
        axum::http::StatusCode::OK,
        Json(serde_json::json!({ "message": "Logged out successfully" })),
    )
}

async fn get_me(
    State(state): State<AppContext>,
    user: AuthUser,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match state.auth_repo.get_user_by_id(&user.user_id).await {
        Ok(Some(u)) => {
            let body = serde_json::json!({
                "userId": u.id,
                "email": u.email,
                "firstName": u.first_name,
                "lastName": u.last_name,
                "birthDate": u.birth_date,
                "sex": u.sex,
                "avatarUrl": u.avatar_url,
                "verified": u.verified,
                "createdAt": u.created_at,
            });
            (axum::http::StatusCode::OK, Json(body))
        }
        Ok(None) => (
            axum::http::StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "User not found" })),
        ),
        Err(err) => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}

async fn update_me(
    State(state): State<AppContext>,
    user: AuthUser,
    Json(dto): Json<UpdateProfileDto>,
) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    match AuthService::update_profile(&state.auth_repo, user.user_id, dto).await {
        Ok(u) => {
            let body = serde_json::json!({
                "userId": u.id,
                "email": u.email,
                "firstName": u.first_name,
                "lastName": u.last_name,
                "birthDate": u.birth_date,
                "sex": u.sex,
                "avatarUrl": u.avatar_url,
                "verified": u.verified,
                "createdAt": u.created_at,
            });
            (axum::http::StatusCode::OK, Json(body))
        }
        Err(err) => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err.to_string() })),
        ),
    }
}
