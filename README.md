# IAM Auth System — Production-Grade Authentication

A comprehensive Identity & Access Management (IAM) authentication system built with React, Node.js, and PostgreSQL, featuring MFA, OAuth, session management, and enterprise-grade security.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-purple) ![License](https://img.shields.io/badge/License-MIT-yellow)

## 🏗️ Architecture

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   React Frontend │──────▶│  Express Backend  │──────▶│   PostgreSQL DB  │
│   (Vite + TW)    │ API   │  (REST + JWT)     │Prisma │   (+ Prisma ORM) │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

## ✨ Features

### Authentication
- Email/password registration with email verification
- Login with JWT access + refresh tokens
- Automatic token refresh with rotation
- Password reset via email
- OAuth integration (Google + GitHub)

### Security
- Multi-Factor Authentication (TOTP)
- Account lockout after failed attempts
- Rate limiting on all auth endpoints
- httpOnly cookie + Bearer token support
- Helmet.js security headers
- Comprehensive audit logging

### Session Management
- View active sessions with device info
- Revoke individual sessions
- Refresh token rotation (invalidates old tokens)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone and Install

```bash
cd IAM

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials and secrets
```

**Required `.env` variables:**
```
DATABASE_URL="postgresql://user:password@localhost:5432/iam_auth"
JWT_ACCESS_SECRET="your-random-32-char-secret"
JWT_REFRESH_SECRET="another-random-32-char-secret"
```

### 3. Setup Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

### 5. Open the App

Navigate to `http://localhost:5173` in your browser.

## 📁 Project Structure

```
backend/
├── prisma/schema.prisma          # Database schema
├── src/
│   ├── app.js                    # Express app entry
│   ├── config/
│   │   ├── passport.js           # OAuth strategies
│   │   └── validationSchemas.js  # Joi schemas
│   ├── controllers/
│   │   ├── auth.controller.js    # Auth endpoints
│   │   └── mfa.controller.js     # MFA endpoints
│   ├── middleware/
│   │   ├── authenticate.js       # JWT verification
│   │   ├── errorHandler.js       # Global error handler
│   │   ├── rateLimiter.js        # Rate limiting
│   │   └── validate.js           # Request validation
│   ├── routes/auth.routes.js     # Route definitions
│   ├── services/
│   │   ├── auth.service.js       # Core auth logic
│   │   ├── email.service.js      # Email sending
│   │   ├── mfa.service.js        # TOTP/QR generation
│   │   └── token.service.js      # JWT/session mgmt
│   └── utils/
│       ├── auditLog.js           # Audit logging
│       ├── errors.js             # Error codes
│       └── logger.js             # Winston logger

frontend/
├── src/
│   ├── App.jsx                   # Routes + providers
│   ├── components/
│   │   ├── AuthLayout.jsx        # Auth page layout
│   │   ├── InputField.jsx        # Reusable input
│   │   ├── MFASetupWizard.jsx    # MFA setup flow
│   │   ├── PasswordStrengthMeter.jsx
│   │   ├── ProtectedRoute.jsx    # Route guard
│   │   └── SessionCard.jsx       # Session display
│   ├── context/AuthContext.jsx   # Auth state management
│   ├── pages/
│   │   ├── Dashboard.jsx         # Main dashboard
│   │   ├── ForgotPassword.jsx
│   │   ├── Login.jsx
│   │   ├── MFASettings.jsx
│   │   ├── Register.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── SessionsPage.jsx
│   │   └── VerifyEmail.jsx
│   └── services/api.js           # Axios config
```

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login (supports MFA) |
| POST | `/api/auth/logout` | ✅ | Logout + invalidate session |
| POST | `/api/auth/refresh-token` | ❌ | Refresh access token |
| POST | `/api/auth/forgot-password` | ❌ | Request password reset |
| POST | `/api/auth/reset-password` | ❌ | Reset password with token |
| POST | `/api/auth/verify-email` | ❌ | Verify email address |
| GET | `/api/auth/me` | ✅ | Get current user profile |
| GET | `/api/auth/sessions` | ✅ | List active sessions |
| DELETE | `/api/auth/sessions/:id` | ✅ | Revoke a session |
| POST | `/api/auth/mfa/setup` | ✅ | Generate MFA secret + QR |
| POST | `/api/auth/mfa/verify-setup` | ✅ | Verify and enable MFA |
| POST | `/api/auth/mfa/disable` | ✅ | Disable MFA |
| GET | `/api/auth/oauth/google` | ❌ | Google OAuth redirect |
| GET | `/api/auth/oauth/github` | ❌ | GitHub OAuth redirect |

## 🔒 Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Account locked |
| AUTH_003 | Email not verified |
| AUTH_004 | MFA code required |
| AUTH_005 | Invalid MFA code |
| AUTH_006 | Token expired |
| AUTH_007 | Token invalid |
| AUTH_008 | Account inactive |
| AUTH_009 | Email already registered |
| AUTH_010 | Invalid reset token |

## 🛡️ Security Features

- **Password hashing**: bcrypt with 12 rounds
- **JWT tokens**: 15min access + 7-day refresh with rotation
- **Account lockout**: 30min lockout after 5 failed attempts
- **Rate limiting**: 10 login / 5 register per window
- **HTTP security**: Helmet.js headers
- **CORS**: Configurable whitelist
- **Audit logging**: All auth events tracked
- **Input validation**: Joi schemas on all endpoints

## 🛡️ Role-Based Access Control (RBAC)

The system includes a fully-featured, AWS IAM-style Role-Based Access Control engine.

### Core Components
- **Policies**: JSON-based permission rules with `ALLOW`/`DENY` effects, supporting wildcard Actions (`users:*`) and Resources (`users/*`).
- **Roles**: Logical grouping of policies that can be attached to users directly or inherited via groups. Includes system-level roles that cannot be modified.
- **Groups**: Collections of users. Roles attached to a group are inherited by all its members.
- **Permission Engine**: Dynamically evaluates the permission tree in real-time, enforcing that an explicit `DENY` always overrides an `ALLOW`.

### Setup
The database seed script automatically provisions default system roles and policies. To initialize them run:
```bash
npx prisma migrate dev
npx prisma db seed
```

### RBAC Endpoints

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| GET | `/api/roles` | List roles | `roles:read` |
| POST | `/api/roles` | Create role | `roles:write` |
| POST | `/api/roles/:id/policies` | Attach policy to role | `roles:write` |
| GET | `/api/policies` | List policies | `policies:read` |
| POST | `/api/policies` | Create policy | `policies:write` |
| POST | `/api/policies/simulate` | Test permission engine | `policies:read` |
| POST | `/api/groups/:id/members` | Add user to group | `groups:write` |
| GET | `/api/users/:id/permissions`| View user's effective permissions| *Authentication required* |

License
MIT — see LICENSE
<div align="center">
<br/>
Built by <a href="https://nirjxr.dev">Nirjar Goswami</a> · <a href="https://www.linkedin.com/in/nirjarbharthigoswami-b593633a7">LinkedIn</a>
</div>

