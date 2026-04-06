<div align="center">

# AegisMesh - IAM Platform

</div>

AegisMesh is an Identity & Access Management platform built with React, Node.js, and PostgreSQL. It combines MFA, OAuth, session management, audit logging, and policy-driven RBAC in a single admin console.

## Architecture

![Architecture diagram](diagrams/Architecture.png)

The app is organized as a React frontend, an Express API layer, and a PostgreSQL database accessed through Prisma.

## Request Flow


![Request flow diagram](diagrams/Flow.png)

The request flow covers public auth, protected API access, token refresh, and permission checks before sensitive operations are allowed.

## Main Feature

### Dynamic RBAC Engine

AegisMesh’s standout capability is its dynamic, AWS IAM-style RBAC engine. It evaluates permissions in real time using roles, groups, policies, and wildcard action/resource matching, with explicit `DENY` rules always taking priority over `ALLOW` rules.

## Features

### Authentication

- Email/password registration with email verification
- Login with JWT access and refresh tokens
- Automatic token refresh with rotation
- Password reset via email
- OAuth integration with Google and GitHub

### Security

- Multi-factor authentication (TOTP)
- Account lockout after failed attempts
- Rate limiting on all auth endpoints
- `httpOnly` cookie and Bearer token support
- Helmet.js security headers
- Comprehensive audit logging

### Session Management

- View active sessions with device info
- Revoke individual sessions
- Refresh token rotation that invalidates old tokens

### Role-Based Access Control

- JSON-based permission rules with `ALLOW` and `DENY`
- Role and group inheritance
- Real-time permission evaluation
- Explicit `DENY` precedence

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Install Dependencies

```bash
cd IAM

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials and secrets.

### 3. Set Up the Database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start Development Servers

```bash
# Backend on port 5000
cd backend
npm run dev

# Frontend on port 5173
cd frontend
npm run dev
```

## Project Structure

```text
backend/
├── prisma/schema.prisma
├── src/
│   ├── app.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── utils/

frontend/
├── src/
│   ├── App.jsx
│   ├── components/
│   ├── context/
│   ├── pages/
│   └── services/
```

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, including MFA support |
| POST | `/api/auth/logout` | Yes | Logout and invalidate session |
| POST | `/api/auth/refresh-token` | No | Refresh the access token |
| POST | `/api/auth/forgot-password` | No | Request a password reset |
| POST | `/api/auth/reset-password` | No | Reset password with token |
| POST | `/api/auth/verify-email` | No | Verify email address |
| GET | `/api/auth/me` | Yes | Get current user profile |
| GET | `/api/auth/sessions` | Yes | List active sessions |
| DELETE | `/api/auth/sessions/:id` | Yes | Revoke a session |

### RBAC

| Method | Endpoint | Description | Permission |
|---|---|---|---|
| GET | `/api/roles` | List roles | `roles:read` |
| POST | `/api/roles` | Create a role | `roles:write` |
| POST | `/api/roles/:id/policies` | Attach a policy to a role | `roles:write` |
| GET | `/api/policies` | List policies | `policies:read` |
| POST | `/api/policies` | Create a policy | `policies:write` |
| POST | `/api/policies/simulate` | Test the permission engine | `policies:read` |
| POST | `/api/groups/:id/members` | Add a user to a group | `groups:write` |
| GET | `/api/users/:id/permissions` | View effective permissions | Authentication required |

## Security Features

- Password hashing with bcrypt
- JWT access tokens with rotating refresh tokens
- Account lockout after repeated failures
- Rate limiting on sensitive routes
- Helmet.js and CORS protection
- Audit logging for authentication and authorization events
- Joi validation on request payloads

## Error Codes

| Code | Description |
|---|---|
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

## License

MIT — see LICENSE

<div align="center">
<br />
Built by <a href="https://nirjxr.dev">Nirjar Goswami</a> · <a href="https://www.linkedin.com/in/nirjarbharthigoswami-b593633a7">LinkedIn</a>
</div>

