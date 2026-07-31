import fetch from "node-fetch";
import { getServiceToken } from "./auth";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

interface FlagPayload {
  messageId: string;
  source: "outlook" | "teams";
  senderUpn: string;
  receivedAt: string;
  sentAt: string;
  wordCount: number;
}

interface FlagResult {
  flagged: boolean;
  wpm?: number;
  flagReason?: string;
}

interface ReportPayload {
  messageId: string;
  reportedUpn: string;
  reporterUpn: string;
  reasonCode: string;
  note?: string;
}

async function authHeader(): Promise<string> {
  const token = await getServiceToken();
  return `Bearer ${token}`;
}

export async function checkAndStoreFlag(payload: FlagPayload): Promise<FlagResult> {
  const res = await fetch(`${BACKEND_URL}/api/flags`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw Object.assign(new Error("Flag API error"), { status: res.status });
  return res.json() as Promise<FlagResult>;
}

export async function submitReport(payload: ReportPayload): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await authHeader(),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw Object.assign(new Error("Report API error"), { status: res.status });
}

export async function logNotification(payload: { messageId: string; senderUpn: string }): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/notifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: await authHeader(),
    },
    body: JSON.stringify(payload),
  });

  // Non-fatal — notification logging failure shouldn't break the report flow
  if (!res.ok) console.warn("Notification log failed:", res.status);
}
