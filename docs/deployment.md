# Deployment

## Backend — Azure App Service

The backend runs on Azure App Service (Linux, Node 20) in the same Azure subscription as the neilmanfred.com / fredianshield.com Microsoft 365 tenant. This keeps the app registration, the backend, and M365 data residency all in one place.

### One-time Azure setup

Run these in the Azure CLI (or Azure Cloud Shell). Adjust the resource group and region as needed.

```bash
# Variables — set once
RG=second-look-rg
LOCATION=uksouth
PLAN=second-look-plan
APP=second-look-api           # must be globally unique — becomes second-look-api.azurewebsites.net
```

```bash
az group create --name $RG --location $LOCATION

az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --sku B1 \
  --is-linux

az webapp create \
  --name $APP \
  --resource-group $RG \
  --plan $PLAN \
  --runtime "NODE:20-lts" \
  --startup-file "node dist/index.js"
```

> **B1 (Basic)** is £11/month and is sufficient for a pilot. Scale to S1 if you add more users or want deployment slots.

### App Service environment variables

Set these via the Azure portal (App Service → Configuration → Application settings) or CLI:

```bash
az webapp config appsettings set \
  --name $APP --resource-group $RG \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="file:/home/site/wwwroot/data/prod.db" \
    AZURE_TENANT_ID="<your-tenant-id>" \
    AZURE_CLIENT_ID="<your-client-id>" \
    AZURE_CLIENT_SECRET="<your-client-secret>" \
    JWKS_URI="https://login.microsoftonline.com/<your-tenant-id>/discovery/v2.0/keys" \
    JWT_AUDIENCE="<your-client-id>" \
    JWT_ISSUER="https://login.microsoftonline.com/<your-tenant-id>/v2.0" \
    ALLOWED_ORIGINS="https://localhost:3001,https://YOUR_ADDIN_HOST"
```

> The SQLite file is written to `/home/site/wwwroot/data/` which is on persistent storage. For anything beyond a small pilot, migrate to Azure SQL or Postgres (change `provider` in `prisma/schema.prisma` and update `DATABASE_URL`).

### Persistent storage for SQLite

App Service's `/home` directory persists across restarts. Create the data directory on first deploy:

```bash
az webapp ssh --name $APP --resource-group $RG
# inside the SSH session:
mkdir -p /home/site/wwwroot/data
```

Alternatively, the GitHub Actions workflow below runs `prisma migrate deploy` on each release, which will create the directory if it doesn't exist when using a file path.

### Hostname

Once created, the backend is available at:
```
https://second-look-api.azurewebsites.net
```

Update `ALLOWED_ORIGINS` in App Settings and `YOUR_ADDIN_HOST` / `YOUR_BACKEND_HOST` placeholders in the Outlook manifest and Teams app manifest with this URL (or a custom domain if you add one).

---

## CI/CD — GitHub Actions

The workflow at `.github/workflows/deploy-backend.yml` builds and deploys the backend on every push to `main`.

### Required GitHub secrets

| Secret | Where to get it |
|--------|----------------|
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Azure portal → App Service → Overview → **Get publish profile** → download and paste the XML |

---

## Dashboard

Build and deploy the dashboard as a static site:

```bash
cd dashboard
npm run build
# deploy dist/ to Azure Static Web Apps, or serve from the App Service at /dashboard
```

For simplicity during the pilot, you can serve the dashboard from the same App Service by copying the `dashboard/dist/` output to `backend/dist/public/` and adding `app.use(express.static('public'))` in `backend/src/index.ts`.

---

## Outlook add-in hosting

The add-in's static files (taskpane.html, taskpane.js) must be served over HTTPS. Options:

- **Same App Service** — add a `/addin` static route (simplest for pilot)
- **Azure Static Web Apps** — free tier, automatic HTTPS, good fit for static Office.js files
- **Azure Blob Storage + CDN** — most scalable but overkill for a pilot

Update `YOUR_ADDIN_HOST` in `outlook-addin/manifest.xml` once you have a stable URL.

---

## Teams bot

The Teams bot needs a public HTTPS endpoint for Bot Framework webhooks. The App Service URL works directly — set the Bot Framework messaging endpoint to:

```
https://second-look-api.azurewebsites.net/api/messages
```

The bot and backend share the same process for simplicity during the pilot. If they need to scale independently later, split them into separate App Service instances.
