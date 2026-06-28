use anyhow::anyhow;
use axum::{
    extract::FromRequestParts,
    http::request::Parts,
    response::IntoResponse,
};

use crate::auth::jwt;
use crate::config::AppContext;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: String,
}

impl FromRequestParts<AppContext> for AuthUser {
    type Rejection = axum::response::Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppContext,
    ) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .unwrap_or("");

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| anyhow!("Authorization token required"))
            .and_then(|t| if t.is_empty() { Err(anyhow!("Authorization token required")) } else { Ok(t.to_string()) });

        let token = match token {
            Ok(t) => t,
            Err(err) => {
                let body = axum::Json(serde_json::json!({
                    "error": err.to_string()
                }));
                return Err((axum::http::StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        let payload = match jwt::verify_token(&state.settings, &token) {
            Some(p) => p,
            None => {
                let body = axum::Json(serde_json::json!({
                    "error": "Invalid or expired token"
                }));
                return Err((axum::http::StatusCode::UNAUTHORIZED, body).into_response());
            }
        };

        Ok(AuthUser {
            user_id: payload.user_id,
        })
    }
}

