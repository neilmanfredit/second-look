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

## What the end user sees

### Outlook — flagged message (internal sender)

The task pane opens on the right of the reading pane when the user clicks the Second Look ribbon button.

```
╔══════════════════════════════════╗
║  ⚡ Second Look                  ║
╠══════════════════════════════════╣
║                                  ║
║  ┌────────────────────────────┐  ║
║  │ ⚠  Sent quickly after     │  ║
║  │    receipt — worth a       │  ║
║  │    second look             │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  Reply of 210 words sent within  ║
║  18s (700 wpm exceeds threshold  ║
║  of 150 wpm)                     ║
║                                  ║
║  This indicator is based on      ║
║  reply time relative to message  ║
║  length only. It does not detect ║
║  AI-generated content.           ║
║                                  ║
║  ────────────────────────────    ║
║  Let the sender know             ║
║  Opens a pre-filled email to     ║
║  the sender asking them to       ║
║  review more carefully. You      ║
║  decide whether to send it.      ║
║                      [Notify]    ║
║                                  ║
║  ────────────────────────────    ║
║  Report this message             ║
║                                  ║
║  Reason                          ║
║  ┌──────────────────────────┐    ║
║  │ Select a reason…       ▾ │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  Note (optional, max 500 chars)  ║
║  ┌──────────────────────────┐    ║
║  │                          │    ║
║  │                          │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  ┌──────────────────────────┐    ║
║  │      Submit report       │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  ────────────────────────────    ║
║  ☑  Show review time badges      ║
║     on messages I receive        ║
╚══════════════════════════════════╝
```

---

### Outlook — clean message

```
╔══════════════════════════════════╗
║  ⚡ Second Look                  ║
╠══════════════════════════════════╣
║                                  ║
║  ┌────────────────────────────┐  ║
║  │ ✓  No review time concern  │  ║
║  └────────────────────────────┘  ║
║                                  ║
║  ────────────────────────────    ║
║  Report this message             ║
║                                  ║
║  Reason                          ║
║  ┌──────────────────────────┐    ║
║  │ Select a reason…       ▾ │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  Note (optional, max 500 chars)  ║
║  ┌──────────────────────────┐    ║
║  │                          │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  ┌──────────────────────────┐    ║
║  │      Submit report       │    ║
║  └──────────────────────────┘    ║
║                                  ║
║  ────────────────────────────    ║
║  ☑  Show review time badges      ║
║     on messages I receive        ║
╚══════════════════════════════════╝
```

> The report button is always visible regardless of whether the auto-flag fired.

---

### Teams — passive flag indicator card

Posted as a reply in the channel/chat when a message crosses the review-time threshold. Subtle — does not block or alter the original message.

```
┌─────────────────────────────────────────────────────┐
│  Sarah Chen  10:42                                  │
│  Thanks for the detailed brief. Here's our response │
│  to each of the five points raised. On the first    │
│  [... 240 words ...]                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  ⚡ Second Look                          10:42       │
│  ─────────────────────────────────────────────────  │
│  ⚠  Sent quickly after receipt —                   │
│     worth a second look                             │
│                                                     │
│  Reply of 240 words sent within 22s (654 wpm        │
│  exceeds threshold of 150 wpm)                      │
│                                                     │
│  This is a review-time indicator only,              │
│  not an AI detection.                               │
└─────────────────────────────────────────────────────┘
```

---

### Teams — report dialog

Accessed via the `···` menu on any message → **Report as low-review**.
The notify toggle only appears when the sender is on the same domain.

```
┌───────────────────────────────────────┐
│  Report message                   ✕  │
│  ─────────────────────────────────── │
│  Flag this message for human review.  │
│  This does not accuse anyone of       │
│  anything — it's a prompt for a       │
│  second look.                         │
│                                       │
│  Reason *                             │
│  ┌───────────────────────────────┐   │
│  │ Select a reason…            ▾ │   │
│  │  • Seems rushed / incomplete  │   │
│  │  • Contains inaccuracies      │   │
│  │  • Unhelpfully generic        │   │
│  │  • Other                      │   │
│  └───────────────────────────────┘   │
│                                       │
│  Note (optional)                      │
│  ┌───────────────────────────────┐   │
│  │                               │   │
│  │                               │   │
│  └───────────────────────────────┘   │
│                                       │
│  ☐  Send sender a nudge               │
│     (opens a draft DM to them         │
│     after submitting)                 │
│                                       │
│  ┌──────────────┐  ┌─────────────┐  │
│  │ Submit report│  │   Cancel    │  │
│  └──────────────┘  └─────────────┘  │
└───────────────────────────────────────┘
```

---

## Licence

CC BY-NC-SA 4.0 — see `LICENSE`.
