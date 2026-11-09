# Authentication

## Admin
- Seeded account: username `admin`, initial password `12345678`, `must_change_password = true`.
- This initial password is **only a placeholder for development**. On first login the app **forces** the admin to set a new password (minimum 8 characters, not equal to the old one).
- The admin can change the password later from the admin page (needs current password).
- Passwords hashed with Argon2id (or bcrypt cost >= 12). Never stored or logged in plain text.
- The admin account is **protected**: no delete endpoint, UI, or SQL path in the app. It must survive restarts, redeploys, and migrations (seed is idempotent: create only if missing, never overwrite an existing password).
- Session: HTTP-only, Secure, SameSite cookie; idle timeout (e.g. 8 hours for admin).
- Login rate limiting and temporary lockout after repeated failures.

## Staff (secret key)
- The admin creates a staff member; the system generates a **random numeric key** (8 digits recommended, minimum 6), unique across staff. It is shown to the admin **once** and cannot be viewed again.
- Staff log in with **only the key** (plus a `deviceId` the app generates and stores).
- Storage: `key_lookup = HMAC-SHA256(key, KEY_PEPPER)` (deterministic so the server can find the staff row by key; the pepper is a server secret in the environment). Never store the raw key.
- **Brute-force protection** (important because the key alone identifies the user): track failed attempts per device and per IP; after 5 failures, lock for 15 minutes with escalating delays; log attempts in `auth_attempts`; consider a global alert on many failures.
- Admin can **disable** a staff member (immediately blocks login and sync) or **reset the key** (old key stops working at once). Old entries and log history stay intact.
- Staff session is long-lived enough for field use (e.g. 30 days, refreshable) so offline use does not require re-login. A disabled staff member's next sync is rejected.

## Authorization
- Every route has an explicit role requirement (`admin` or `staff`). Deny by default.
- Staff cannot access any `/admin/*` route.
- Staff-facing DTOs never include rate fields, rate-derived amounts, totals, or profit (see `api.md`).

## Audit
- Log: admin login/logout, password change, staff create/disable/reset-key, failed staff logins (in `auth_attempts`).
- Never log passwords or keys.

## Open items
- Optional: 2-step confirmation (re-enter admin password) for destructive actions such as the Correction tool.
