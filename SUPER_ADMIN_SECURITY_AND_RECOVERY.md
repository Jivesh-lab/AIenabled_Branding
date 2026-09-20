# Super Admin Security & Account Recovery Manual

## 1. Overview & Role Definition

The **`super_admin`** role is a reserved, ultra-privileged role designed exclusively for the system owner and lead software developer of the **AAI–DBITIC** platform.

### Key Characteristics:
- **RBAC Hierarchy Bypass**: Sits at the top of the system authorization hierarchy (`super_admin` > `admin` > non-privileged roles).
- **Universal Workspace Inspection**: Can access every role workspace (`/workspace/student`, `/workspace/faculty`, `/workspace/mentor`, `/workspace/industry-partner`, `/workspace/investor`, `/workspace/startup`) directly without logging into separate accounts.
- **Signup Isolation**: Cannot be created or elevated through public registration endpoints (`/api/auth/register` or `/signup`). Public attempts to register with `super_admin` or `admin` roles are rejected automatically.
- **Designated Account Email**:
  - Primary Seed Email: **`superadmin@aai-dbitic.edu`** (configurable via `SUPER_ADMIN_EMAIL` in `.env`).

---

## 2. Seed Script & Account Provisioning

Super Admin accounts are created or updated **only** via a secure CLI script in the backend infrastructure:

```bash
# Navigate to backend directory
cd backend

# Execute the Super Admin Seed Script
npm run seed:superadmin
```

### What the Seed Script Does:
1. Connects to MongoDB securely.
2. Checks for an existing account under `SUPER_ADMIN_EMAIL`.
3. Sets or updates the strong bcrypt password hash (`SUPER_ADMIN_PASSWORD`).
4. Generates an RFC 6238 TOTP 2FA secret key.
5. Enables mandatory `twoFactorEnabled: true`.
6. Prints a terminal QR code for scanning into Google Authenticator or Authy.
7. Logs a `SUPER_ADMIN_SEEDED` entry to the MongoDB `AuditLog` collection.

---

## 3. Mandatory Multi-Factor Authentication (2FA/MFA)

- **Requirement**: Mandatory for all `super_admin` logins.
- **Implementation**: Standard RFC 6238 Time-based One-Time Passcode (TOTP).
- **Flow**:
  1. User enters `email` and `password` on `/login`.
  2. NextAuth / Express verifies password match.
  3. Backend detects `super_admin` role and returns `{ success: false, require2FA: true }`.
  4. Frontend displays the 2FA Passcode prompt.
  5. User inputs the 6-digit TOTP code from their authenticator app.
  6. Backend verifies TOTP via `verifySync({ token, secret })` and issues session cookie.

---

## 4. Immutable Audit Trail

Every action taken by a Super Admin account is recorded in real-time in the `AuditLog` MongoDB collection:

- **Captured Fields**:
  - `userId` & `email`
  - `role` (`super_admin`)
  - `action` (e.g. `SUPER_ADMIN_LOGIN_SUCCESS`, `WORKSPACE_INSPECT_VIEW`)
  - `resource` path
  - `workspace` context
  - `ip` address & `userAgent`
  - `status` (`SUCCESS`, `FAILURE`, `WARNING`)
  - `timestamp`

- **Viewing Logs**: Super Admins can inspect and filter logs in real-time under the **System Audit Logs** panel on `/workspace/super-admin/dashboard` or via `GET /api/audit`.

---

## 5. Account Compromise & Emergency Recovery Playbook

If a Super Admin account password or 2FA device is compromised or lost:

### Emergency Recovery Steps:

1. **Access Server Terminal**: Log in to the server or local dev machine hosting the backend.
2. **Execute Seed Re-Initialization**:
   ```bash
   cd backend
   SUPER_ADMIN_PASSWORD="NewSuperStrongPassword#2026!" npm run seed:superadmin
   ```
3. **Effects**:
   - Resets the Super Admin password.
   - Generates a new TOTP 2FA secret key and invalidates old authenticator bindings.
   - Re-stamps account permissions.
4. **Revoke Active Sessions**:
   - Clear existing HTTP cookies / restart backend instance if immediate session termination is required.
5. **Inspect Audit Logs**:
   - Review `/api/audit` or `AuditLog` collection to trace unauthorized actions taken during the compromise window.
