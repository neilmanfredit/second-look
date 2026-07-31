/// <reference types="office-js" />

const BACKEND_URL = process.env.BACKEND_URL ?? "https://YOUR_BACKEND_HOST";

declare const Office: typeof import("@types/office-js");

Office.onReady(async ({ host }) => {
  if (host !== Office.HostType.Outlook) return;
  await init();
});

async function init() {
  const item = Office.context.mailbox.item;
  if (!item) return;

  const token = await getAccessToken();
  if (!token) return;

  await loadPreferences(token);
  await checkFlag(item, token);
  setupReportForm(item, token);
  setupOptOut(token);
}

async function getAccessToken(): Promise<string | null> {
  try {
    const result = await Office.context.auth.getAccessTokenAsync({ allowSignInPrompt: true });
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      return result.value;
    }
    console.error("SSO failed:", result.error);
    return null;
  } catch (e) {
    console.error("getAccessToken error:", e);
    return null;
  }
}

async function loadPreferences(token: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const prefs = await res.json();
    const toggle = document.getElementById("badges-toggle") as HTMLInputElement;
    toggle.checked = prefs.badgesEnabled;
  } catch (_) {
    // Non-critical — default to showing badges
  }
}

async function checkFlag(item: Office.MessageRead, token: string) {
  const messageId = item.itemId;
  if (!messageId) {
    showState("no-flag");
    return;
  }

  // Compute word count from body text
  let wordCount = 0;
  let receivedAt: Date | null = null;
  let sentAt: Date | null = null;

  try {
    const body = await getBodyText(item);
    wordCount = countWords(body);
  } catch (_) {}

  try {
    // dateTimeCreated is when the item was created server-side (close to sent time for replies)
    sentAt = item.dateTimeCreated ? new Date(item.dateTimeCreated as unknown as string) : null;
    // For the "received" time we use the received date header if available
    // Office.js exposes this as item.dateTimeModified for Outlook but we use sentAt as fallback
    receivedAt = sentAt; // Will be refined via Graph if available
  } catch (_) {}

  if (!sentAt) {
    showState("no-flag");
    return;
  }

  // Use the in-reply-to thread timing if this is a reply
  // Office.js doesn't expose original message time directly, so we pass what we have
  // and let the backend use graph data where available. For now, pass a 0-offset
  // if we can't determine received time for the original.
  const payload = {
    messageId,
    source: "outlook",
    senderUpn: item.from?.emailAddress?.address ?? "unknown",
    receivedAt: receivedAt?.toISOString() ?? sentAt.toISOString(),
    sentAt: sentAt.toISOString(),
    wordCount,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    hideState("loading");
    document.getElementById("report-section")!.classList.remove("hidden");

    if (data.flagged) {
      showState("flag");
      const detail = document.getElementById("flag-detail")!;
      detail.textContent = data.flagReason ?? "";
    } else {
      showState("no-flag");
    }
  } catch (_) {
    showState("no-flag");
  }
}

function setupReportForm(item: Office.MessageRead, token: string) {
  const form = document.getElementById("report-form") as HTMLFormElement;
  const statusEl = document.getElementById("report-status") as HTMLParagraphElement;
  const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    statusEl.className = "hidden";

    const reason = (document.getElementById("reason") as HTMLSelectElement).value;
    const note = (document.getElementById("note") as HTMLTextAreaElement).value;

    try {
      const res = await fetch(`${BACKEND_URL}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          messageId: item.itemId,
          reportedUpn: item.from?.emailAddress?.address ?? "unknown",
          reasonCode: reason,
          note: note || undefined,
        }),
      });

      if (res.ok) {
        statusEl.textContent = "Report submitted. Thank you.";
        statusEl.className = "success";
        form.reset();
      } else if (res.status === 429) {
        statusEl.textContent = "Daily report limit reached.";
        statusEl.className = "error";
      } else {
        statusEl.textContent = "Failed to submit. Please try again.";
        statusEl.className = "error";
      }
    } catch (_) {
      statusEl.textContent = "Network error. Please try again.";
      statusEl.className = "error";
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function setupOptOut(token: string) {
  const toggle = document.getElementById("badges-toggle") as HTMLInputElement;
  toggle.addEventListener("change", async () => {
    await fetch(`${BACKEND_URL}/api/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ badgesEnabled: toggle.checked }),
    });
  });
}

function getBodyText(item: Office.MessageRead): Promise<string> {
  return new Promise((resolve, reject) => {
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value);
      } else {
        reject(result.error);
      }
    });
  });
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function showState(id: string) {
  document.getElementById(id)?.classList.remove("hidden");
}

function hideState(id: string) {
  document.getElementById(id)?.classList.add("hidden");
}
