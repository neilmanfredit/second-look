import {
  TeamsActivityHandler,
  TurnContext,
  MessagingExtensionAction,
  MessagingExtensionActionResponse,
  Activity,
} from "botbuilder";
import { buildReportFormCard, buildFlagIndicatorCard } from "../adaptiveCards/reportForm";
import { submitReport, checkAndStoreFlag } from "../messageExtension/apiClient";

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
    _context: TurnContext,
    action: MessagingExtensionAction
  ): Promise<MessagingExtensionActionResponse> {
    const messageId = action.messagePayload?.id ?? "";
    const reportedUpn = action.messagePayload?.from?.user?.userPrincipalName ?? "";

    return {
      task: {
        type: "continue",
        value: {
          title: "Report message",
          height: 450,
          width: 500,
          card: {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: buildReportFormCard(messageId, reportedUpn),
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
      reasonCode: string;
      note?: string;
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
      return { task: { type: "message", value: "Report submitted. Thank you." } };
    } catch (err: any) {
      if (err.status === 429) {
        return { task: { type: "message", value: "Daily report limit reached. Try again tomorrow." } };
      }
      return { task: { type: "message", value: "Failed to submit. Please try again." } };
    }
  }
}

function countWords(text: string): number {
  // Strip HTML tags that Teams may include
  const plain = text.replace(/<[^>]+>/g, " ").trim();
  return plain.split(/\s+/).filter(Boolean).length;
}
