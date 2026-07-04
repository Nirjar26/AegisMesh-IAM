# SonarQube Quality Gate — Write-to Rules

If you are writing, refactoring, or generating code in this repo, these rules apply.
Violations block merge. Each rule has: anti-pattern (SONAR), correct pattern (PASS).

---

## 1. Empty Catch Blocks (S108)

**SONAR**
```js
redis.incr('key').catch(() => {});
} catch { return false; }
} catch { }
auditSecurity.rateLimitExceeded(req, path).catch(() => { });
```

**PASS** — every catch gets at minimum `logger.warn`:
```js
redis.incr('key').catch((err) => {
  logger.warn('Redis cache operation failed', { error: err.message });
});
} catch (err) {
  logger.warn('Context of failure', { error: err.message });
  return false;
}
```

---

## 2. Hardcoded Credentials (S2068)

**SONAR**
```js
const SECRET = process.env.X || 'fallback-string';
const OAUTH_STATE_SECRET = process.env.JWT_SECRET || 'oauth-state-secret';
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Seed-Demo-Pass-2024-Dev';
await bcrypt.hash('Northbridge!2026', 12);
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-ci-only';
```

**PASS** — no string fallback; crash at startup if missing:
```js
const SECRET = process.env.X;
if (!SECRET) throw new Error('X is required but not set');
// For seeds — read from env, NEVER provide a default string
const SEED_PW = process.env.SEED_USER_PASSWORD;
// For tests — read from test .env file, not inline in source
```

---

## 3. Hardcoded IP Addresses (S1313)

**SONAR**
```js
const LOOPBACK_IP = '127.0.0.1';
const BIND_ADDR = '0.0.0.0';
if (ip === '::1' || ip === '127.0.0.1') { ... }
host = os.getenv("DD_BIND_HOST", "127.0.0.1")
```

**PASS** — IPs go in `config/constants.js` with `// NOSONAR` + justification:
```js
// In config/constants.js:
const LOOPBACK_IP = process.env.LOOPBACK_IP || '127.0.0.1'; // NOSONAR — K8s health-check loopback
```

---

## 4. HTTP Without TLS (S5332)

**SONAR**
```js
const url = process.env.URL || 'http://localhost:3000';
axios.post(`http://security-engine:8000/analyze`, data);
connectSrc: ["'self'", "http://localhost:3000"]
os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
target: 'http://localhost:5000'
```

**PASS** — internal K8s DNS gets `// NOSONAR`; external must use `https://`:
```js
// External (must be HTTPS):
const url = process.env.FRONTEND_URL || 'https://localhost:3000';
// Internal K8s DNS (unavoidable):
const SE_URL = process.env.SECURITY_ENGINE_URL || 'http://security-engine:8000'; // NOSONAR — internal K8s DNS, not routable externally
```

---

## 5. console.log / console.error in Production (S1442 / S4792)

**SONAR**
```js
console.error('Failed to fetch CSRF token', error);
console.debug('Failed to parse payload', parseError);
console.error('Fatal startup error:', error);
```

**PASS** — use logger or guard behind environment check:
```js
import { logger } from '@/utils/logger';
logger.error('Failed to fetch CSRF token', error);
// OR guard:
if (!import.meta.env.PROD) console.debug(...)
// Error boundary / fatal startup — acceptable with NOSONAR:
console.error('Fatal startup error:', error); // NOSONAR — error boundary, no logger available at this point
```

---

## 6. Boolean Literals in Conditionals (S1125)

**SONAR**
```js
if (x === true) { ... }
if (isValidEmail === false) { ... }
if (unreadOnly === true) { ... }
if (read !== false) { ... }
```

**PASS**
```js
if (x) { ... }
if (!isValidEmail) { ... }
if (unreadOnly) { ... }
if (read) { ... }
```

---

## 7. Cookie Without Secure Flag (S2092)

**SONAR**
```js
res.cookie('token', val, { httpOnly: true, sameSite: 'lax' });
// Missing: secure: true
// Conditional secure (triggers S2092):
secure: req.secure || req.headers['x-forwarded-proto'] === 'https' || isProd
secure: isSecure  // derived from request
```

**PASS**
```js
res.cookie('token', val, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
});
```

---

## 8. CORS Origin Bypass (S5527)

**SONAR**
```js
if (!origin || ALLOWED_ORIGINS.includes(origin)) {
  callback(null, true);
}
```

**PASS**
```js
if (ALLOWED_ORIGINS.includes(origin)) {
  callback(null, true);
} else {
  callback(new Error('Not allowed by CORS'));
}
```

---

## 9. Path Traversal / Unsafe File Paths (S2083)

**SONAR**
```js
const filePath = path.join(AVATAR_DIR, req.user.id, fileName);
// req.user.id from request, used directly in path
await fs.promises.mkdir(path.join(AVATAR_DIR, req.user.id), { recursive: true });
```

**PASS**
```js
const safeDir = path.resolve(AVATAR_DIR);
const userPath = path.resolve(path.join(AVATAR_DIR, req.user.id));
if (!userPath.startsWith(safeDir)) throw new Error('Invalid path');
const filePath = path.join(userPath, fileName);
```

---

## 10. Too Many Function Parameters (S107)

**SONAR**
```js
function NavItem({ icon: Icon, label, value, href, activeSection, onSelect, collapsed, forceActive }) {
```
(8 destructured params — S107 fires at >= 7)

```js
function createUser(name, email, role, org, mfa, policy, notify, tags, settings) {
```
(9 positional params)

**PASS** — use options object or ...props spreading:
```js
function NavItem({ icon: Icon, ...props }) {
  const { label, value, href, activeSection, onSelect, collapsed, forceActive } = props;

function createUser(options) {
  const { name, email, role, org, ...rest } = options;
```

---

## 11. Duplicate String Literals (S1192)

**SONAR** — same 100+ char string in 3+ files:
```
'http://localhost:3000' appears in 6 files
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' appears in 3 files
```

**PASS**
```js
// In packages/shared/src/constants.ts or apps/api/src/config/constants.js:
export const FRONTEND_URL_FALLBACK = 'http://localhost:3000';
export const UA_CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
// Import everywhere instead of repeating the literal
```

---

## 12. Cognitive Complexity / Long Functions (S3776)

**SONAR** — function > 80 lines with nesting > 4 levels:
```js
function OverviewSection({...}) {
  // 9 useQuery hooks, 5 useMemo calls
  // 280 lines of inline data transformation + JSX
}
// Also: seedAuditLogsIfSparse() at ~220 lines
// Also: authenticateJwtRequest() at ~70 lines with 3+ auth paths
```

**PASS** — extract helpers, keep each function under 60 lines:
```js
function OverviewSection({...}) {
  const { users, activity, policies } = useMetricsQueries();
  const growth = useMemo(() => computeGrowth(users), [users]);
  return <SectionGrid growth={growth} activity={activity} policies={policies} />;
}
// Each extract: < 60 lines, single responsibility, max 4 nesting levels
```

---

## 13. Unused Assignments (S1854)

**SONAR**
```js
EMPTY_ARRAY = [];  // assigned but never used
EMPTY_OBJECT = {}; // assigned but never used
```

**PASS**
```js
// Remove unused constants, or use them:
const EMPTY_ARRAY = [];
return items ?? EMPTY_ARRAY;  // now used
```

---

## 14. Unused Local Variables (S1481)

**SONAR**
```js
const Icon = check.icon;  // assigned but never referenced
```

**PASS**
```js
// Use it or remove it:
const Icon = check.icon;
return <Icon className="..." />;  // now used
```

---

## 15. Raw SQL Strings — Python (S2077)

**SONAR**
```python
query = 'SELECT action, category, result, duration FROM "AuditLog" LIMIT 10000'
df = pd.read_sql(query, engine)
```

**PASS** — if SQL is unavoidable, use sqlalchemy `text()` with a named constant:
```python
from sqlalchemy import text
FETCH_AUDIT_LOGS = text('SELECT action, category, result, duration FROM "AuditLog" LIMIT 10000')
df = pd.read_sql(FETCH_AUDIT_LOGS, engine)
```

---

## 16. Pickle/joblib.load Without Path Guard — Python

**SONAR**
```python
model = joblib.load(model_path)
# model_path could be attacker-controlled
```

**PASS**
```python
ALLOWED_DIR = os.getenv("MODEL_DIR", "/app/models")
safe_path = os.path.normpath(os.path.join(ALLOWED_DIR, os.path.basename(model_path)))
if not safe_path.startswith(os.path.normpath(ALLOWED_DIR)):
    raise ValueError("Model path outside allowed directory")
model = joblib.load(safe_path)
```

---

## 17. No Auth on API Endpoints — Python FastAPI

**SONAR**
```python
@app.post("/train")
async def train():
    # no auth check
@app.get("/analyze")
async def analyze():
    # no auth check
```

**PASS**
```python
API_KEY = os.getenv("INTERNAL_API_KEY")
def verify_api_key(request: Request):
    key = request.headers.get("X-Api-Key")
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

# On every route:
@app.post("/train")
async def train(_=Depends(verify_api_key)):
    ...
```

---

## 18. Switch Cases That Could Be Merged (S1871)

**SONAR**
```js
switch (log.result) {
  case 'SUCCESS': return { label: 'Success', className: '...green' };
  case 'BLOCKED': return { label: 'Blocked', className: '...yellow' };
  case 'FAILURE': return { label: 'Failure', className: '...red' };
  // 2nd switch on same field with different return — duplicate classification
}
switch (log.result) {
  case 'SUCCESS': return '200';
  case 'BLOCKED': return '403';
  case 'FAILURE': return '401';
}
```

**PASS** — use a mapping object instead of repeating switch:
```js
const RESULT_CONFIG = {
  SUCCESS: { label: 'Success', className: '...green', code: '200' },
  BLOCKED: { label: 'Blocked', className: '...yellow', code: '403' },
  FAILURE: { label: 'Failure', className: '...red', code: '401' },
};
const config = RESULT_CONFIG[log.result] ?? RESULT_CONFIG.FAILURE;
```

---

## 19. NOSONAR Comments

**SONAR**
```js
// NOSONAR
// nosonar
// NOSONAR
```

**PASS**
```js
// NOSONAR — internal K8s DNS, not externally routable
// NOSONAR — false positive, constant is a label not a password
// NOSONAR — req.user.id is an authenticated UUID, harmless for path construction
```

---

## 20. innerHTML / Dangerous DOM APIs — Frontend (S5146 / XSS)

**SONAR**
```jsx
rootElement.innerHTML = `
  <div>
    <h1>Startup Error</h1>
    <pre>${error?.message || 'Unknown error'}</pre>
  </div>
`;
```

**PASS** — use DOM API or React:
```jsx
const pre = document.createElement('pre');
pre.textContent = error?.message || 'Unknown error';
rootElement.appendChild(pre);
// Or render with ReactDOM.createRoot instead of innerHTML
```

**General rule**: Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `dangerouslySetInnerHTML` with any user-controlled or request-derived content.

---

## 21. Prototype Pollution via Spread — Frontend (S3744)

**SONAR**
```jsx
setUser((prev) => (prev ? { ...prev, ...updates } : null));
// updates could contain __proto__ or constructor keys
```

**PASS**
```jsx
setUser((prev) => {
  if (!prev) return null;
  const { __proto__, constructor, prototype, ...safe } = updates;
  return { ...prev, ...safe };
});
```

---

## 22. Unbounded Array Growth — Frontend

**SONAR**
```js
let failedQueue = [];  // grows unbounded while refresh is in progress
failedQueue.push({ resolve, reject });  // memory leak under load
```

**PASS**
```js
const MAX_QUEUE = 100;
let failedQueue = [];
if (failedQueue.length >= MAX_QUEUE) {
  failedQueue.shift();  // drop oldest
}
failedQueue.push({ resolve, reject });
```

---

## 23. Seed / Test Data in Production Code Path

**SONAR**
```js
// In a production controller:
function seedAuditLogsIfSparse() {
  // Seeds fake data into production DB if records < 20
  const IP_POOL = ['203.45.112.88', '91.220.101.45', ...];
  // Writes 50+ fake audit records
}
```

**PASS** — seed data belongs in `prisma/seed/`, never in a controller or service:
```js
// Production code works with what data exists:
async function getOverviewMetrics() {
  const data = await prisma.query(...);
  return data;  // empty result set is valid
}
```

---

## 24. SSRF / User-Controlled URLs in Server Requests (S5145)

**SONAR**
```js
const SECURITY_ENGINE_URL = process.env.SECURITY_ENGINE_URL || 'http://security-engine:8000';
await axios.post(`${SECURITY_ENGINE_URL}/analyze`, context);
// URL from env var, flagged as SSRF sink
```

**PASS** — validate URL comes from config, never from user:
```js
const SE_URL = process.env.SECURITY_ENGINE_URL; // NOSONAR — read from env, not user-controlled
if (!SE_URL) throw new Error('SECURITY_ENGINE_URL required');
// If you must accept a redirect URL from user:
const parsed = new URL(input, ALLOWED_BASE);
if (!ALLOWED_REDIRECT_DOMAINS.includes(parsed.hostname)) throw new Error('Invalid redirect');
```

---

## 25. HTML `<script>` Tags / CSP Bypass — Backend

**SONAR**
```js
scriptSrc: ["'self'", "'unsafe-inline'"]
// 'unsafe-inline' disables CSP protection against XSS
```

**PASS**
```js
// Use nonce-based CSP:
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});
scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`]
```

---

## 26. Static File Serving Without Auth

**SONAR**
```js
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));
// Anyone can read uploaded files
```

**PASS**
```js
app.use('/uploads', authenticate, express.static(uploadDir));
// Or serve through a controller with access control
```

---

## 27. Seed Data Hardcoded in Production Controllers

**SONAR** — PRISMA schema or seed files shouldn't contain real secrets:
```js
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Seed-Demo-Pass-2024-Dev'; // NOSONAR
```

**PASS** — seed password must always come from env:
```js
const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD;
if (!SEED_USER_PASSWORD) throw new Error('SEED_USER_PASSWORD must be set to seed');
```

---

## 28. ReDoS — Unsafe Regex Patterns

**SONAR**
```js
new RegExp(`\\b[a-zA-Z0-9_\\/\\+\\=\\-\\.\\*]+\\b`);
// Nested quantifiers on overlapping character classes = catastrophic backtracking
```

**PASS**
```js
// Bounded repetition prevents backtracking:
const SAFE_REGEX = /(password|secret|token|credential|key|auth|cookie)\b[^]{0,200}/gi;
// Or use String.includes() for simple checks:
if (line.toLowerCase().includes('password')) { ... }
```

---

## 29. Missing Rate Limiters on Security Endpoints

**SONAR**
```js
// Security routes without rate limiting:
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
// No rate limiter → brute-force attack
```

**PASS** — every auth/security endpoint needs a rate limiter:
```js
const { passwordResetLimiter, emailVerifyLimiter } = require('../middleware/rateLimiter');
router.post('/reset-password', passwordResetLimiter, authController.resetPassword);
router.post('/verify-email', emailVerifyLimiter, authController.verifyEmail);
```

---

## 30. SSE / WebSocket Endpoint Without Auth

**SONAR**
```js
// SSE route with no authentication:
router.get('/stream', auditLogController.streamLogs);
// Real-time audit log leak — anyone who reaches this endpoint gets every event
```

**PASS** — every real-time endpoint needs authentication:
```js
const { authenticate } = require('../middleware/authenticate');
router.get('/stream', authenticate, auditLogController.streamLogs);
```

---

## 31. Plaintext Sensitive Data in DB Columns (Dead Fields)

**SONAR**
```js
// mfa.controller.js:
await prisma.user.update({
  data: { mfaBackupCodes: JSON.stringify(backupCodes) }
  // Plaintext backup codes stored in a field NEVER read by auth logic
  // An attacker with DB read access gets TOTP recovery codes in plaintext
});
```

**PASS** — never store plaintext authentication secrets. If it's sensitive, hash it:
```js
// Either hash before storing:
const hashed = await bcrypt.hash(code, 10);
// Or remove the dead field entirely — don't duplicate already-hashed data
```

---

## 32. Crypto Key Separation — One Secret Should Not Derive Another

**SONAR**
```js
// crypto.js: MFA encryption key === JWT_REFRESH_SECRET (!!)
let seed = process.env.MFA_SECRET_ENCRYPTION_KEY || process.env.JWT_REFRESH_SECRET;
// JWT compromise -> decrypt ALL MFA secrets

// requireReauth.js: reauth secret === JWT_ACCESS_SECRET
const secret = process.env.JWT_REAUTH_SECRET || process.env.JWT_ACCESS_SECRET;
```

**PASS** — every key purpose gets its own independent secret:
```js
let seed = process.env.MFA_SECRET_ENCRYPTION_KEY;
if (!seed) throw new Error('MFA_SECRET_ENCRYPTION_KEY is required');
// Each secret serves ONE purpose. Compromise of one does not cascade.
```

---

## 33. Fixed / Static Salt for Key Derivation

**SONAR**
```js
const key = crypto.pbkdf2Sync(seed, 'aegismesh-mfa-key-v1', 100000, 32, 'sha512');
// Static salt — rainbow table across all users
```

**PASS**
```js
const salt = userSalt || crypto.randomBytes(16).toString('hex');
const key = crypto.pbkdf2Sync(seed, salt, 100000, 32, 'sha512');
// Store salt alongside ciphertext: `${salt}:${iv}:${authTag}:${encrypted}`
```

---

## 34. Authorization Scope Gap — Incomplete Permission Mapping

**SONAR**
```js
// apiKeyAuth.js — only 5 paths mapped, ALL others return null
getRequiredScope(path) {
  switch(path) {
    case '/api/users': return 'users:' + method;
    case '/api/roles': return 'roles:' + method;
    // /api/settings, /api/notifications, /api/analytics all UNMAPPED
    default: return null;  // << no scope check for these paths
  }
}
```

**PASS** — every API path must be mapped, or default behavior must deny:
```js
getRequiredScope(path) {
  const prefix = Object.keys(PATH_SCOPE_MAP).find(p => path.startsWith(p));
  if (!prefix) return null;  // still null = unexposed path
  return PATH_SCOPE_MAP[prefix] + ':' + method.toLowerCase();
}
// And in the middleware:
if (!requiredScope) {
  return res.status(403).json({ error: 'API key not authorized for this endpoint' });
}
```

---

## 35. Unstable Ephemeral Crypto Keys (Regenerated on Restart)

**SONAR**
```js
// app.js:12
csrfSecret = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');
// Every restart = new CSRF secret = all existing CSRF tokens invalidated

// crypto.js:13
mfaFallbackKey = crypto.randomBytes(32).toString('hex');
// Every restart = MFA secrets undecryptable
```

**PASS** — crypto keys that must persist across restarts come from env:
```js
csrfSecret = process.env.CSRF_SECRET;
if (!csrfSecret) throw new Error('CSRF_SECRET is required');
// If the key truly is ephemeral, document that this means data loss on restart
```

---

## 36. Duplicate Code — Redis Catch Pattern

**SONAR** — same `.catch(() => {})` pattern at 11+ locations:
```js
redis.incr('version').catch(() => {});   // rateLimiter.js
redis.del('settings').catch(() => {});   // database.js
redis.get('key').catch(() => {});        // elsewhere
```

**PASS** — wrap Redis operations in a single safe wrapper:
```js
// cache/redisClient.js:
async function safeGet(key, fallback = null) {
  try {
    return await redis.get(key);
  } catch (err) {
    logger.warn('Redis get failed', { key, error: err.message });
    return fallback;
  }
}
```

---

## 37. Duplicate Code — Cookie Options Duplicated Across Files

**SONAR**
```js
// auth.controller.js
res.cookie('accessToken', token, {
  httpOnly: true, secure: isSecure, sameSite: 'strict', maxAge: 900000
});
// auth.routes.js — nearly identical options block
res.cookie('accessToken', token, {
  httpOnly: true, secure, sameSite: 'strict', maxAge: 900000
});
```

**PASS** — extract to a shared helper:
```js
// utils/cookieHelper.js:
function setAuthCookies(res, { accessToken, refreshToken }) {
  const opts = { httpOnly: true, secure: true, sameSite: 'strict' };
  res.cookie('accessToken', accessToken, { ...opts, maxAge: 900000 });
  res.cookie('refreshToken', refreshToken, { ...opts, maxAge: 604800000 });
}
```

---

## 38. Duplicate Code — Email Templates

**SONAR** — two nearly-identical HTML email templates:
```js
// email.service.js — verify email template
const verifyHtml = `<!DOCTYPE html>...<a href="${url}">Verify Email</a>...`;
// email.service.js — reset password template  
const resetHtml = `<!DOCTYPE html>...<a href="${url}">Reset Password</a>...`;
// 90%+ identical structure, only text and URL differ
```

**PASS**
```js
function buildEmailTemplate({ title, body, actionUrl, actionText }) {
  return `<!DOCTYPE html><html>...<h1>${title}</h1><p>${body}</p>
    <a href="${actionUrl}">${actionText}</a>...</html>`;
}
```

---

## 39. Duplicate Code — Random Token / Backup Code Generation

**SONAR** — same `crypto.randomBytes` pattern at 4+ locations:
```js
// registerService.js:47
crypto.randomBytes(32).toString('hex');
// passwordService.js:20
crypto.randomBytes(32).toString('hex');
// crypto.js:13
crypto.randomBytes(32).toString('hex');
// app.js:12
crypto.randomBytes(32).toString('hex');
// mfa.service.js:40 — backup code variant
crypto.randomBytes(4).toString('hex').toUpperCase();
```

**PASS**
```js
// utils/tokenGenerator.js:
function randomHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}
function randomBackupCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
```

---

## 40. Magic Numbers — Named Constants Missing

**SONAR**
```js
max: 5,                            // max login attempts
maxAge: 15 * 60 * 1000,            // 15min
maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
const frontendUrl = 'http://localhost:3000';
const timeoutMs = 500;
const staleTime = 30 * 1000;
const sessionTimeout = 480;        // minutes
```

**PASS**
```js
// In config/constants.js:
const MAX_LOGIN_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TIMEOUT_MINUTES = 480;
const STALE_TIME_MS = 30_000;
const RISK_ENGINE_TIMEOUT_MS = 500;
```

---

## 42. `__dirname` / `__filename` in Path Joins — Node.js

**SONAR**
```js
const logPath = path.join(__dirname, '../../logs/error.log');
```

**PASS** — use an absolute path from config:
```js
const LOG_DIR = process.env.LOG_DIR || path.resolve(__dirname, '../../logs');
const logPath = path.join(LOG_DIR, 'error.log');
```

---

## Quick Reference (All Rules)

| # | Rule | Component | Check |
|---|------|-----------|-------|
| 1 | S108 | JS/TS | No bare `catch {}` — always log |
| 2 | S2068 | JS/TS/Python | No string fallbacks for secrets |
| 3 | S1313 | JS/TS/Python | IP literals go in config with NOSONAR |
| 4 | S5332 | JS/TS/Python | Internal HTTP gets NOSONAR; external is HTTPS |
| 5 | S1442 | JS/TS/Frontend | No console.log — use logger utility |
| 6 | S1125 | JS/TS | No `=== true` / `=== false` |
| 7 | S2092 | JS/TS | Always set `secure: true` on cookies |
| 8 | S5527 | JS/TS | No `!origin` bypass in CORS |
| 9 | S2083 | JS/TS | Validate path before `path.join` |
| 10 | S107 | JS/TS/Frontend | Max 6 params per function |
| 11 | S1192 | JS/TS | Extract 100+ char strings to constants |
| 12 | S3776 | JS/TS/Frontend | Max 60 lines per function, 4 nesting levels |
| 13 | S1854 | JS/TS | Remove or use assigned constants |
| 14 | S1481 | JS/TS | Use or remove assigned variables |
| 15 | S2077 | Python | Use sqlalchemy.text(), not raw SQL strings |
| 16 | S1871 | JS/TS | Use mapping object instead of duplicate switch |
| 17 | — | Python | Auth on every FastAPI endpoint |
| 18 | — | Python | Guard joblib.load / pickle path |
| 19 | S5146 | Frontend | Never use innerHTML with user content |
| 20 | S3744 | Frontend | Strip __proto__ from spread merges |
| 21 | — | Frontend | Cap unbounded arrays (failedQueue) |
| 22 | — | Frontend/Backend | No seed data in production code paths |
| 23 | S5145 | Backend | URL from config, not user input |
| 24 | — | Backend | No unsafe-inline CSP; use nonce |
| 25 | — | Backend | Auth on static file serving |
| 26 | — | Backend | Guard regex against ReDoS |
| 27 | — | Backend | Rate limit every auth/security endpoint |
| 28 | — | Backend | SSE/WS endpoints must authenticate |
| 29 | — | Backend | No plaintext sensitive data in dead DB columns |
| 30 | — | Backend | Each crypto key serves one purpose only |
| 31 | — | Backend | Per-user salt for KDF, never static |
| 32 | — | Backend | Every API path must be in scope map or denied |
| 33 | — | Backend | Crypto keys must be stable across restarts |
| 34 | S1192 | Backend | Wrap Redis in safeClient (1 catch pattern) |
| 35 | S1192 | Backend | Share cookie helpers, not duplicate options |
| 36 | S1192 | Backend | Share email template builder |
| 37 | S1192 | Backend | Share random token generator (tokenGenerator.js) |
| 38 | — | Backend | No magic numbers — named constants |
| 39 | — | Backend | Remove unused underscore-prefixed vars |
| 40 | — | All | Every NOSONAR needs a justification comment |
