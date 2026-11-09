# Integrations

## v1: none required
The app is self-contained: PWA + REST API + PostgreSQL. No payment gateway, no third-party login, no SMS.

## Internal integration points
- **PWA <-> API:** sync endpoint (`api.md`), idempotent, batched.
- **Service worker:** caches the app shell only. Never cache API responses containing admin data; staff cached data is limited to farmers list, goods items, and history without prices.
- **Database:** single PostgreSQL instance; migrations versioned.

## Planned / optional (P1-P2)
| Integration | Purpose | Notes |
|---|---|---|
| CSV / Excel export | Give statements and reports to accountants | Admin only; generated server-side |
| PDF statement | Printable farmer statement | Admin only |
| Nepali (BS) calendar library | Show BS dates | Store AD in DB; convert at display |
| SMS provider (local Nepal provider) | Send farmer statements/balances | Needs farmer phone numbers, consent, provider contract |
| Backups to object storage | Daily encrypted DB backups | Test restores regularly |
| Error monitoring | Catch production errors | Scrub personal data and keys |

## Rules for any integration
- Secrets only in environment variables.
- Never send rates or financial data to a third party without the owner's approval.
- Log integration actions in `audit_log` when they change data.
