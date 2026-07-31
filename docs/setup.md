# Setup guide

## 1. Azure AD app registration

Create a single app registration that covers the backend API, Outlook add-in (SSO), and Teams bot.

### Steps

1. Go to **Azure Portal → Azure Active Directory → App registrations → New registration**
2. Name: `second-look`
3. Supported account types: **Accounts in this organisational directory only** (single-tenant)
4. Redirect URI: add `https://YOUR_ADDIN_HOST/taskpane.html` (type: Single-page application)

### API permissions required

| Permission | Type | Justification | Admin consent? |
|------------|------|---------------|----------------|
| `Mail.Read` | Delegated | Read email metadata (timestamps, sender) when user opens a message in Outlook | **No** (user consent) |
| `MailboxSettings.Read` | Delegated | Read user timezone to normalise timestamps correctly | **No** (user consent) |
| `offline_access` | Delegated | Refresh tokens for Outlook add-in SSO | No |
| `openid`, `profile` | Delegated | Identity claims for token validation | No |

> **Note:** `Mail.Read` gives access to the full mailbox of any consenting user. The add-in only reads metadata of the currently open message — it never reads or stores message body content. The code is auditable in this repo.
>
> If deploying tenant-wide (admin consent flow), you will need the admin to grant `Mail.Read` on behalf of all users. This changes the consent posture significantly — see [Open questions in README](../README.md).

### Expose an API (for backend token validation)

1. In the app registration → **Expose an API**
2. Set Application ID URI: `api://YOUR_ADDIN_HOST/<client-id>`
3. Add scope: `access_as_user` (Admins and users can consent)
4. Add client application: the client ID itself (for the Outlook add-in SSO flow)

### App roles (for admin dashboard access)

1. In **App roles** → **Create app role**
   - Display name: `Second Look Admin`
   - Value: `SecondLook.Admin`
   - Allowed member types: Users/Groups
2. Assign this role to admin users via **Enterprise applications → second-look → Users and groups**

---

## 2. Bot Framework registration (Teams only)

1. Go to [Azure Bot Service](https://portal.azure.com/) → Create a resource → Azure Bot
2. Bot handle: `second-look-bot`
3. Pricing tier: F0 (free) for pilot
4. Microsoft App ID: create a new App ID (note it — this is `BOT_APP_ID`)
5. In the bot's **Configuration** → Messaging endpoint: `https://YOUR_BOT_HOST/api/messages`
6. Under **Channels**: add **Microsoft Teams**

---

## 3. Environment variables

Copy `.env.example` in `backend/` and `teams-app/` to `.env` and fill in values from above.

---

## 4. Database

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

For production, switch `DATABASE_URL` to a PostgreSQL connection string and change `provider = "postgresql"` in `prisma/schema.prisma`. SQLite is fine for a single-instance pilot.

---

## 5. Sideloading the Outlook add-in (dev/pilot)

1. Run `npm run dev -w outlook-addin` (serves on https://localhost:3001)
2. In Outlook on the web: **Settings → Manage add-ins → Upload a custom add-in → Upload manifest file**
3. Select `outlook-addin/manifest.xml` (after updating `YOUR_ADDIN_HOST` to `localhost:3001`)

For tenant-wide deployment: upload the manifest via **Microsoft 365 admin centre → Settings → Integrated apps**.

---

## 6. Sideloading the Teams app (dev/pilot)

1. Run `npm run dev -w teams-app` (bot on https://YOUR_BOT_HOST:3002, expose via ngrok for local dev)
2. Zip the contents of `teams-app/appPackage/` (manifest.json + icons)
3. In Teams: **Apps → Manage your apps → Publish an app → Upload an app to your org's app catalog** (or just to yourself for testing)
