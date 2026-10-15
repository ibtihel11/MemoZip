import type { TopicScore } from '@/types';
import { joinList } from './format';
import { STRONG_THRESHOLD, WEAK_THRESHOLD } from './scoring';

/** Mock stand-in for the AI-written analysis shown on the results page. */
export function buildAnalysis(scores: TopicScore[]): string {
  const strong = scores.filter((s) => s.score >= STRONG_THRESHOLD).map((s) => s.topicName);
  const weak = scores.filter((s) => s.score < WEAK_THRESHOLD).map((s) => s.topicName);

  if (strong.length && weak.length) {
    return `You have a strong understanding of ${joinList(strong)}. Your answers suggest that ${joinList(weak)} need more review.`;
  }
  if (weak.length) {
    return `Several topics need another pass. Start with ${joinList(weak)}, then retake the quiz to see how much you improve.`;
  }
  if (strong.length) {
    return `You have a solid grasp of ${joinList(strong)}. Keep it fresh by retaking the quiz in a few days.`;
  }
  return 'Your understanding is developing but not yet consistent. A quick read of the summary before your next attempt should help.';
}
