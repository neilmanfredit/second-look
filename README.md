# second-look

A Microsoft 365 add-in (Outlook + Teams) that flags messages where the time between drafting and sending is unusually short relative to message length — indicating the sender may not have reviewed the content carefully before sending.

**This is not an AI detector.** The signal is review time, not authorship.

this is in earlier alpha and I'm looking for testers

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

See `docs/deployment.md`. The backend runs on Azure App Service (Linux, Node 20) in M365 tenant. CI/CD via `.github/workflows/deploy-backend.yml` — requires `AZURE_WEBAPP_PUBLISH_PROFILE` set as a GitHub secret.

## What the end user sees

### Outlook — flagged message (internal sender)

The task pane opens on the right of the reading pane when the user clicks the Second Look ribbon button.

![Outlook — flagged](mockups/outlook-flagged.png)

---

### Outlook — clean message

![Outlook — clean](mockups/outlook-clean.png)

> The report button is always visible regardless of whether the auto-flag fired.

---

### Teams — passive flag indicator card

Posted as a reply in the channel/chat when a message crosses the review-time threshold. Subtle — does not block or alter the original message.

![Teams — passive flag](mockups/teams-passive-flag.png)

---

### Teams — report dialog

Accessed via the `···` menu on any message → **Report as low-review**.
The notify toggle only appears when the sender is on the same domain.

![Teams — report dialog](mockups/teams-report-dialog.png)

---

## Licence

CC BY-NC-SA 4.0 — see `LICENSE`.
