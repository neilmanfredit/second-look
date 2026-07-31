export function buildReportFormCard(messageId: string, reportedUpn: string, isInternal: boolean) {
  const notifyToggle = isInternal
    ? [
        {
          type: "Input.Toggle",
          id: "notifySender",
          title: "Send sender a nudge (opens a draft DM to them after submitting)",
          value: "false",
        },
      ]
    : [];

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: "Report message",
        weight: "Bolder",
        size: "Medium",
      },
      {
        type: "TextBlock",
        text: "Flag this message for human review. This does not accuse anyone of anything — it's a prompt for a second look.",
        wrap: true,
        color: "Default",
        size: "Small",
      },
      {
        type: "Input.ChoiceSet",
        id: "reasonCode",
        label: "Reason",
        isRequired: true,
        style: "compact",
        choices: [
          { title: "Seems rushed / incomplete", value: "rushed" },
          { title: "Contains inaccuracies", value: "inaccurate" },
          { title: "Unhelpfully generic", value: "generic" },
          { title: "Other", value: "other" },
        ],
      },
      {
        type: "Input.Text",
        id: "note",
        label: "Note (optional)",
        placeholder: "Optional context…",
        maxLength: 500,
        isMultiline: true,
      },
      ...notifyToggle,
      {
        type: "Input.Text",
        id: "messageId",
        value: messageId,
        isVisible: false,
      },
      {
        type: "Input.Text",
        id: "reportedUpn",
        value: reportedUpn,
        isVisible: false,
      },
      {
        type: "Input.Text",
        id: "isInternal",
        value: String(isInternal),
        isVisible: false,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Submit report",
        data: { action: "submitReport" },
      },
      {
        type: "Action.Submit",
        title: "Cancel",
        data: { action: "cancel" },
        style: "destructive",
      },
    ],
  };
}

export function buildFlagIndicatorCard(reason: string) {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "auto",
            items: [{ type: "TextBlock", text: "⚠", size: "Large" }],
          },
          {
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "TextBlock",
                text: "Sent quickly after receipt — worth a second look",
                weight: "Bolder",
                wrap: true,
              },
              {
                type: "TextBlock",
                text: reason,
                wrap: true,
                color: "Default",
                size: "Small",
                isSubtle: true,
              },
              {
                type: "TextBlock",
                text: "This is a review-time indicator only, not an AI detection.",
                wrap: true,
                size: "Small",
                color: "Default",
                isSubtle: true,
                fontType: "Monospace",
              },
            ],
          },
        ],
      },
    ],
  };
}
