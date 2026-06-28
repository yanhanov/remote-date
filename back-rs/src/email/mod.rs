use anyhow::{Context, Result};
use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::config::Settings;

pub struct EmailService;

impl EmailService {
    pub async fn send_verification_code(
        settings: &Settings,
        to: &str,
        code: &str,
    ) -> Result<()> {
        let host = settings
            .smtp_host
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());

        let Some(host) = host else {
            tracing::info!(
                "SMTP not configured — verification code for {to}: {code}"
            );
            return Ok(());
        };

        let from = settings
            .smtp_from
            .as_deref()
            .filter(|value| !value.is_empty())
            .unwrap_or("Remote Date <noreply@localhost>");

        let body = format!(
            "Your Remote Date verification code is: {code}\n\n\
             The code expires in 15 minutes.\n\n\
             If you did not request this, you can ignore this email.\n\n\
             — Remote Date"
        );

        let message = Message::builder()
            .from(from.parse().context("Invalid SMTP_FROM address")?)
            .to(to
                .parse()
                .context("Invalid recipient email address")?)
            .subject("Your Remote Date verification code")
            .header(ContentType::TEXT_PLAIN)
            .body(body)?;

        let mailer = if settings
            .smtp_user
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .is_some()
        {
            let user = settings.smtp_user.as_deref().unwrap_or_default();
            let password = settings.smtp_password.as_deref().unwrap_or_default();
            let creds = Credentials::new(user.to_string(), password.to_string());

            AsyncSmtpTransport::<Tokio1Executor>::relay(host)?
                .port(settings.smtp_port)
                .credentials(creds)
                .build()
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(host)
                .port(settings.smtp_port)
                .build()
        };

        mailer
            .send(message)
            .await
            .context("Failed to send verification email")?;

        tracing::info!("Verification email sent to {to}");
        Ok(())
    }
}
