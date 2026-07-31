# second-look

A Microsoft 365 add-in (Outlook + Teams) that flags messages where the time between drafting and sending is unusually short relative to message length — indicating the sender may not have reviewed the content carefully before sending.

**This is not an AI detector.** The signal is review time, not authorship.

---

## Components

| Directory | Description |
|-----------|-------------|
| `outlook-addin/` | Office.js task pane add-in for Outlook |
| `teams-app/` | Teams message extension + bot |
| `backend/` | Shared Node/Express API, data model, admin config |
| `dashboard/` | Simple web dashboard for pattern reporting |
| `docs/` | Graph API registration guide, privacy notes, data model |

## Quick start

See `docs/setup.md` for full Microsoft 365 app registration steps and required Graph API permissions.

```bash
# Install all workspace dependencies
npm install

# Start backend (port 3000)
npm run dev -w backend

# Start Outlook add-in dev server (port 3001)
npm run dev -w outlook-addin

# Start Teams app (port 3002)
npm run dev -w teams-app
```

## Deployment

See `docs/deployment.md`. The backend runs on Azure App Service (Linux, Node 20) in the neilmanfred.com / fredianshield.com M365 tenant. CI/CD via `.github/workflows/deploy-backend.yml` — requires `AZURE_WEBAPP_PUBLISH_PROFILE` set as a GitHub secret.

## Licence

CC BY-NC-SA 4.0 — see `LICENSE`.
