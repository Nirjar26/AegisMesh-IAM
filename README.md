<div align="center">

<img src="https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white" />
<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white" />
<img src="https://img.shields.io/badge/Auth-JWT%20%2B%20TOTP%20MFA-FF6B35?style=flat-square" />
<img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />

<br/><br/>

# AegisMesh

### Production-Grade Identity & Access Management Platform

**Multi-tenant RBAC · JWT + TOTP MFA · OAuth 2.0 · Magic-link Invitations · Audit Logging · Session Control**

</div>

---

## Overview

Full-stack IAM platform built from scratch — comparable in scope to Auth0 or the AWS IAM Console. Handles the complete identity lifecycle: provisioning, access control, MFA, OAuth federation, session management, and security observability in a single self-hosted system.

---

## Features

### Authentication
- Email/password registration with email verification and password reset
- JWT access tokens (15min) + refresh tokens (7 days) with automatic rotation
- TOTP MFA with QR code setup — Google Authenticator / Authy compatible; backup recovery codes on enrollment
- OAuth 2.0 via Google and GitHub with account linking
- Account lockout after 5 failed attempts (30min cooldown)
- Sensitive action re-auth — disabling MFA or rotating secrets requires password re-verification

### Access Control
- Multi-tenant RBAC — organizations, users, roles, and permissions as first-class entities
- AWS-style JSON policies with `Allow` / `Deny` effects and wildcard resource matching (`users:*`)
- Explicit `Deny` always overrides `Allow`, evaluated dynamically at request time
- Group-inherited roles — permissions attached to a group apply to all members
- Role templates for rapid provisioning (Admin, Read-Only, Developer)
- Bulk operations — org-wide assignments executed as atomic transactions with rollback
- Permission simulator — test what a user can and cannot do before deploying policy changes

### Sessions & API Access
- Active session listing with device fingerprint, IP, and last-seen timestamp
- Remote session revocation — invalidate any session from the console instantly
- Scoped API keys with expiration dates, last-used tracking, and one-click revocation
- Magic-link user invitations — time-boxed signed tokens with tracking dashboard and resend/revoke controls

### Security & Observability
- bcrypt password hashing (12 rounds)
- Rate limiting — 10 login / 5 register attempts per window
- Helmet.js security headers on all responses
- Append-only audit log — all auth events, permission changes, and admin actions with actor + timestamp
- Activity charts — login events, MFA usage, and failed attempts over time
- Notification center with read/unread state and per-user preferences
- Winston structured logging throughout the backend

---

## Architecture

```
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│  React Frontend │───────▶│ Express Backend  │───────▶│  PostgreSQL DB  │
│  (Vite + TW)    │  REST  │  (JWT + RBAC)   │ Prisma │  (Prisma ORM)   │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

```
aegismesh/
├── backend/
│   ├── app.js                          # Express entry — middleware, CORS, routes
│   ├── prisma/
│   │   ├── schema.prisma               # Users, roles, sessions, audit, API keys
│   │   └── seed.js                     # Default roles, policies, admin user
│   └── src/
│       ├── config/
│       │   ├── passport.js             # Google + GitHub OAuth strategies
│       │   └── validationSchemas.js    # Joi request schemas
│       ├── controllers/                # auth.controller.js · mfa.controller.js
│       ├── middleware/
│       │   ├── authenticate.js         # JWT verification
│       │   ├── reauth.middleware.js    # Sensitive action gate
│       │   ├── rateLimiter.js          # Per-route rate limiting
│       │   └── errorHandler.js         # Global error handler
│       ├── routes/                     # auth · users · roles · sessions · audit · api-keys
│       ├── services/
│       │   ├── auth.service.js         # Core auth logic
│       │   ├── token.service.js        # JWT and session management
│       │   ├── mfa.service.js          # TOTP and QR generation
│       │   └── email.service.js        # Magic-link and verification emails
│       └── utils/
│           ├── auditLog.js             # Append-only event logger
│           └── logger.js               # Winston structured logging
│
└── frontend/
    └── src/
        ├── App.jsx                     # Route tree and auth guards
        ├── context/AuthContext.jsx     # Global auth state
        ├── pages/                      # Dashboard · Users · Roles · Sessions · Audit · Settings
        └── components/                 # Modals · tables · MFA wizard · notification center
```

**Key decisions:**
- Refresh token rotation — every refresh invalidates the previous token, limiting blast radius on theft
- Re-auth middleware — sensitive operations gated at middleware layer, not per route handler
- Deny-override engine — explicit `Deny` always wins, changes take effect immediately
- Append-only audit log — no updates or deletes; single write path for consistent event schema
- Service layer isolation — business logic in `/services`, route handlers stay thin

---

## Getting Started

### Prerequisites
Node.js 18+ · PostgreSQL 14+ · npm

### Setup

```bash
cd backend && npm install
cd frontend && npm install
```

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:password@localhost:5432/aegismesh_db"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
FRONTEND_URL="http://localhost:5173"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
```

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed

cd backend && npm run dev   # port 5000
cd frontend && npm run dev  # port 5173
```

### Default Credentials

| Field | Value |
|---|---|
| Email | `admin@northbridge.io` |
| Password | `Northbridge!2026` |
| Role | `SuperAdmin` — full unrestricted access |
| MFA | Disabled — intentionally for initial setup |
| Status | Active · Email verified |

---

## API Reference

### Auth & Sessions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register new user |
| `POST` | `/api/auth/login` | No | Login — returns access + refresh tokens |
| `POST` | `/api/auth/logout` | Yes | Invalidate session |
| `POST` | `/api/auth/refresh-token` | No | Rotate refresh token |
| `POST` | `/api/auth/forgot-password` | No | Send password reset email |
| `POST` | `/api/auth/reset-password` | No | Reset password with token |
| `POST` | `/api/auth/verify-email` | No | Verify email address |
| `GET` | `/api/auth/me` | Yes | Current user profile |
| `GET` | `/api/auth/sessions` | Yes | List active sessions |
| `DELETE` | `/api/auth/sessions/:id` | Yes | Revoke session |
| `POST` | `/api/auth/mfa/setup` | Yes | Generate TOTP secret + QR |
| `POST` | `/api/auth/mfa/verify-setup` | Yes | Activate MFA |
| `POST` | `/api/auth/mfa/disable` | Yes | Disable MFA (re-auth required) |
| `GET` | `/api/auth/oauth/google` | No | Google OAuth redirect |
| `GET` | `/api/auth/oauth/github` | No | GitHub OAuth redirect |

### RBAC & Access

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET/POST` | `/api/roles` | `roles:read/write` | List / create roles |
| `POST` | `/api/roles/:id/policies` | `roles:write` | Attach policy to role |
| `GET/POST` | `/api/policies` | `policies:read/write` | List / create policies |
| `POST` | `/api/policies/simulate` | `policies:read` | Test permission engine |
| `GET` | `/api/users/:id/permissions` | Auth | View effective permissions |
| `POST` | `/api/groups/:id/members` | `groups:write` | Add user to group |
| `GET/POST` | `/api/api-keys` | Auth | List / create API keys |
| `DELETE` | `/api/api-keys/:id` | Auth | Revoke API key |
| `GET` | `/api/audit` | Auth | Query audit log |

---

## Error Codes

| Code | Description |
|---|---|
| `AUTH_001` | Invalid credentials |
| `AUTH_002` | Account locked |
| `AUTH_003` | Email not verified |
| `AUTH_004` | MFA code required |
| `AUTH_005` | Invalid MFA code |
| `AUTH_006` | Token expired |
| `AUTH_007` | Token invalid |
| `AUTH_008` | Account inactive |
| `AUTH_009` | Email already registered |
| `AUTH_010` | Invalid reset token |

---

## Roadmap

- [ ] Attribute-based access control (ABAC)
- [ ] SAML 2.0 and OIDC provider support
- [ ] Webhook delivery for auth events
- [ ] Client SDK for service integration
- [ ] AWS IAM policy import/export format

---

## License

MIT — see [LICENSE](LICENSE)

<div align="center">
<br/>
Built by <a href="https://nirjxr.dev">Nirjar Goswami</a> · <a href="https://www.linkedin.com/in/nirjarbharthigoswami-b593633a7">LinkedIn</a>
</div>