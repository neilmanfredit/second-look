export interface ReviewConfidenceInput {
  wordCount: number;
  receivedAt: Date;
  sentAt: Date;
  wpmThreshold: number;
  minWordCountToFlag: number;
  minSecondsToFlag: number;
}

export interface ReviewConfidenceResult {
  wpm: number;
  flagged: boolean;
  flagReason: string | null;
}

/**
 * Computes a review_confidence_score based on how fast a message was sent
 * relative to its length. This is NOT an AI detection heuristic — it is a
 * proxy for review time only.
 */
export function computeReviewConfidence(input: ReviewConfidenceInput): ReviewConfidenceResult {
  const elapsedMs = input.sentAt.getTime() - input.receivedAt.getTime();
  const elapsedMinutes = Math.max(elapsedMs / 60000, 1 / 60); // floor at 1 second
  const wpm = input.wordCount / elapsedMinutes;

  const tooFew = input.wordCount < input.minWordCountToFlag;
  const tooFast =
    wpm > input.wpmThreshold &&
    elapsedMs < input.minSecondsToFlag * 1000;

  const flagged = !tooFew && tooFast;

  return {
    wpm: Math.round(wpm),
    flagged,
    flagReason: flagged
      ? `Reply of ${input.wordCount} words sent within ${Math.round(elapsedMs / 1000)}s (${Math.round(wpm)} wpm exceeds threshold of ${input.wpmThreshold} wpm)`
      : null,
  };
}
