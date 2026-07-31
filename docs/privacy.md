# Privacy & data protection notes

> **Disclaimer:** This document is a placeholder to prompt legal/HR review before deployment. It is not legal advice. Neil should consult a qualified data protection practitioner before processing employee data in production.

---

## What data this tool processes

Second Look processes **message metadata only** — no message content is stored or transmitted to the backend.

Specifically, it collects and stores:
- Message ID (opaque identifier, not the content)
- Sender UPN (email address)
- Recipient UPN (email address of the person who opened the add-in)
- `received_at` and `sent_at` timestamps
- Word count of the message body (computed client-side, not the text itself)
- Computed WPM figure and flag decision
- Report submissions: reporter UPN, reported UPN, reason code, optional short note

---

## UK GDPR lawful basis

**[PLACEHOLDER — complete before go-live]**

Processing employee behaviour data (response speed) is likely to require one of:
- **Legitimate interests** (Art. 6(1)(f)) — the organisation's interest in ensuring AI-generated content is reviewed before sending. A legitimate interests assessment (LIA) is required.
- **Legal obligation** or **contract** may also be arguable depending on employment contract terms.

Sensitive categories: response speed is not a special category, but it touches HR-adjacent behavioural monitoring.

**Deployment model note:** This tool is individually installed (each user consents for their own mailbox). This is a more limited consent model than tenant-wide deployment. However, reports submitted by one user about another still constitute processing of the reported person's data — that person has not consented. The lawful basis for processing report data about the reported individual still needs to be established (most likely legitimate interests). A DPIA is still recommended before rollout beyond a small pilot.

---

## Data retention

- Raw `ReviewFlag` records: deleted after **90 days** (configurable by admin, minimum 7 days)
- `Report` records: UPN fields anonymised after 90 days, aggregate counts retained indefinitely
- `AuditLog` records: retained for **1 year** (legal/compliance hold; adjust to your retention policy)

---

## Access controls

- Individual flag history is **not exposed** to the flagged person's colleagues or peers
- Flag history is visible only to:
  - The flagged person themselves (not yet implemented — planned future feature)
  - Users with the `SecondLook.Admin` app role
- All admin access to the dashboard is mediated via Azure AD role assignment

---

## Misuse risk: harassment vector

The reporting feature could be misused to harass colleagues. Mitigations built in:
- Rate limit: max 10 reports per reporter per day (configurable)
- Full audit log of every report submission (reporter, reported, reason, timestamp)
- No action is taken automatically — reports are for pattern spotting only
- Audit log is retained and reviewable if a harassment complaint is raised

---

## Employee transparency

Before deployment, employees should be informed that:
- The organisation uses a tool that monitors message review time for quality purposes
- No message content is read or stored by the tool
- They can opt out of receiving the review-time badge indicator (this affects their own view only, not whether their messages are flagged for others)
- They can contact [HR/DPO contact] for queries

This notice should be added to the employee handbook / acceptable use policy. **[PLACEHOLDER — draft required]**
