# Настройка SMTP для писем с кодом верификации

Сейчас без SMTP код подтверждения пишется в лог API:

```
SMTP not configured — verification code for user@example.com: 123456
```

После настройки письма будут уходить на почту пользователя.

---

## 1. Создать файл окружения

```bash
cp back-rs/.env.example back-rs/.env
```

Бэкенд читает переменные из:
- `back-rs/.env` (основной вариант)
- `.env` в корне проекта (тоже подхватывается)

---

## 2. Добавить переменные в `back-rs/.env`

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=Remote Date <your@gmail.com>
```

| Переменная | Описание |
|------------|----------|
| `SMTP_HOST` | Адрес SMTP-сервера |
| `SMTP_PORT` | Порт (обычно `587` для STARTTLS) |
| `SMTP_USER` | Логин SMTP |
| `SMTP_PASSWORD` | Пароль или API key |
| `SMTP_FROM` | От кого приходит письмо (формат: `Name <email@domain.com>`) |

Если `SMTP_HOST` не задан — письма не отправляются, код только в логе (удобно для локальной разработки).

---

## 3. Gmail (рекомендуется для личного аккаунта)

Gmail **не принимает обычный пароль** — нужен **App Password**.

1. Включить [двухфакторную аутентификацию](https://myaccount.google.com/security)
2. Создать пароль приложения: [App Passwords](https://myaccount.google.com/apppasswords)
   - Тип: Mail
   - Устройство: Other (Remote Date)
3. Скопировать 16-символьный пароль в `SMTP_PASSWORD`
4. `SMTP_USER` и адрес в `SMTP_FROM` должны совпадать с Gmail-аккаунтом

Пример:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yanhanow@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=Remote Date <yanhanow@gmail.com>
```

---

## 4. Альтернативные сервисы

### Resend
```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxxxxxx
SMTP_FROM=Remote Date <onboarding@resend.dev>
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxx
SMTP_FROM=Remote Date <verified@yourdomain.com>
```

### Mailtrap (только для dev — письма не уходят наружу)
Взять данные из [mailtrap.io](https://mailtrap.io) → Inbox → SMTP Settings.

---

## 5. Перезапустить API

```bash
# Остановить текущий make dev-api (Ctrl+C), затем:
make dev-api
```

Успешная отправка в логе:

```
Verification email sent to user@example.com
```

Ошибка:

```
Failed to send verification email
```

---

## 6. Проверка

1. Зарегистрировать новый аккаунт или повторно отправить код
2. Проверить почту (и папку Spam)
3. Код действует **15 минут**

---

## Troubleshooting

- **Код только в логе** — `SMTP_HOST` пустой или `.env` не в `back-rs/.env`
- **Gmail: authentication failed** — используется обычный пароль вместо App Password
- **Invalid SMTP_FROM** — проверить формат: `Remote Date <email@domain.com>`
- **Порт 465** — в проекте настроен `587` (STARTTLS); для Gmail используйте 587
- После изменения `.env` всегда перезапускать `make dev-api`

---

## Связанные файлы в коде

- `back-rs/src/email/mod.rs` — отправка письма
- `back-rs/src/config/mod.rs` — чтение env-переменных
- `back-rs/.env.example` — шаблон переменных
