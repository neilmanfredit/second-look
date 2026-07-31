import {
  TeamsActivityHandler,
  TurnContext,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  Activity,
} from "botbuilder";
import { buildReportFormCard, buildFlagIndicatorCard } from "../adaptiveCards/reportForm";
import { submitReport, checkAndStoreFlag, logNotification } from "../messageExtension/apiClient";

export class SecondLookBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMessage(async (context, next) => {
      // Passive flag: when a reply arrives in a channel/chat, check its timing
      // and post a subtle indicator card if it crosses the threshold.
      const activity = context.activity;
      if (activity.replyToId && activity.text) {
        await this.handleIncomingReply(context, activity);
      }
      await next();
    });
  }

  private async handleIncomingReply(context: TurnContext, activity: Activity) {
    const wordCount = countWords(activity.text ?? "");
    const sentAt = new Date(activity.timestamp ?? Date.now());

    // We don't have the original message received time here — bot is notified on
    // new messages only. We pass what we have and the backend will flag based on
    // absolute thresholds it has available (e.g. if word count vs elapsed is extreme).
    // A future improvement would use Graph to fetch the parent message timestamp.
    const messageId = activity.id ?? "";
    const senderUpn = activity.from?.aadObjectId ?? activity.from?.name ?? "unknown";

    try {
      const result = await checkAndStoreFlag({
        messageId,
        source: "teams",
        senderUpn,
        receivedAt: sentAt.toISOString(), // approximate — parent message time unknown here
        sentAt: sentAt.toISOString(),
        wordCount,
      });

      if (result.flagged) {
        const card = buildFlagIndicatorCard(result.flagReason ?? "");
        await context.sendActivity({
          attachments: [
            {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: card,
            },
          ],
        });
      }
    } catch (err) {
      // Non-critical — swallow and don't disrupt the channel
      console.error("SecondLookBot flag check failed:", err);
    }
  }

  async handleTeamsMessagingExtensionFetchTask(
    context: TurnContext,
    action: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const messageId = action.messagePayload?.id ?? "";
    const reportedUpn = action.messagePayload?.from?.user?.userPrincipalName ?? "";
    const reporterUpn = context.activity.from?.aadObjectId ?? context.activity.from?.name ?? "";

    // Show the notify toggle only when sender and reporter share the same tenant domain
    const isInternal = sharesTenanDomain(reportedUpn, reporterUpn);

    return {
      task: {
        type: "continue",
        value: {
          title: "Report message",
          height: isInternal ? 500 : 450,
          width: 500,
          card: {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: buildReportFormCard(messageId, reportedUpn, isInternal),
          },
        },
      },
    };
  }

  async handleTeamsMessagingExtensionSubmitAction(
    context: TurnContext,
    action: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const data = action.data as {
      action: string;
      messageId: string;
      reportedUpn: string;
      isInternal: string;
      reasonCode: string;
      note?: string;
      notifySender?: string;
    };

    if (data.action === "cancel") {
      return { task: { type: "message", value: "Cancelled." } };
    }

    const reporterUpn =
      context.activity.from?.aadObjectId ??
      context.activity.from?.name ??
      "unknown";

    try {
      await submitReport({
        messageId: data.messageId,
        reportedUpn: data.reportedUpn,
        reporterUpn,
        reasonCode: data.reasonCode,
        note: data.note,
      });

      const wantsToNotify = data.notifySender === "true" && data.isInternal === "true";
      if (wantsToNotify) {
        // Log the intent; the reporter should follow up with a direct Teams message.
        // Full proactive messaging to the sender requires admin-consented
        // messageTeamMembers scope, which is out of scope for individual install.
        await logNotification({ messageId: data.messageId, senderUpn: data.reportedUpn });
        return {
          task: {
            type: "message",
            value: `Report submitted. Send ${data.reportedUpn} a direct message to let them know — a draft nudge message is ready to copy:\n\n"Hi, I wanted to flag that a message you sent recently appeared to have a short review time relative to its length. No action needed — just a heads-up."`,
          },
        };
      }

      return { task: { type: "message", value: "Report submitted. Thank you." } };
    } catch (err: any) {
      if (err.status === 429) {
        return { task: { type: "message", value: "Daily report limit reached. Try again tomorrow." } };
      }
      return { task: { type: "message", value: "Failed to submit. Please try again." } };
    }
  }
}

function sharesTenanDomain(upnA: string, upnB: string): boolean {
  if (!upnA || !upnB) return false;
  const domainA = upnA.split("@")[1]?.toLowerCase();
  const domainB = upnB.split("@")[1]?.toLowerCase();
  return !!domainA && domainA === domainB;
}

function countWords(text: string): number {
  // Strip HTML tags that Teams may include
  const plain = text.replace(/<[^>]+>/g, " ").trim();
  return plain.split(/\s+/).filter(Boolean).length;
}
