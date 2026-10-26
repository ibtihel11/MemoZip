/**
 * Turns backend payloads into the shapes the UI uses (src/types).
 *
 * Responses are already camelized by http(), so `file_name` arrives as `fileName`. These mappers
 * are deliberately tolerant (they accept a few alternative field names and fall back to safe
 * defaults). If the backend returns a field under a different name, fix it here and nowhere else.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AnswerRecord, ChatMessage, Conversation, Difficulty, Document, Folder, Question, QuestionDifficulty,
  QuestionType, Quiz, QuizAttempt, Resource, ResourceType, SourceRef, Stats, Summary, Topic, User,
} from '@/types';

type Raw = any;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v : []);
const nowIso = () => new Date().toISOString();

/** Lists arrive either as a bare array or wrapped, e.g. { items: [...] }. */
export function listOf(raw: Raw, ...keys: string[]): Raw[] {
  if (Array.isArray(raw)) return raw;
  for (const key of ['items', ...keys]) {
    if (Array.isArray(raw?.[key])) return raw[key];
  }
  return [];
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'mixed'];
const asDifficulty = (v: unknown): Difficulty => (DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : 'mixed');
const asQuestionDifficulty = (v: unknown): QuestionDifficulty => (v === 'easy' || v === 'hard' ? v : 'medium');
const QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer'];
const asQuestionType = (v: unknown): QuestionType => (QUESTION_TYPES.includes(v as QuestionType) ? (v as QuestionType) : 'multiple_choice');

// ---------------------------------------------------------------- user
export function mapUser(raw: Raw, prefs: { defaultDifficulty?: Difficulty; defaultQuestionCount?: number } = {}): User {
  const u = raw?.user ?? raw;
  return {
    id: str(u.id),
    name: str(u.name),
    email: str(u.email),
    defaultDifficulty: asDifficulty(u.defaultDifficulty ?? prefs.defaultDifficulty),
    defaultQuestionCount: Number(u.defaultQuestionCount ?? prefs.defaultQuestionCount ?? 15),
  };
}

// ---------------------------------------------------------------- documents
export function mapTopic(raw: Raw, documentId: string): Topic {
  if (typeof raw === 'string') return { id: raw, name: raw, documentId };
  return { id: str(raw.id), name: str(raw.name ?? raw.title), documentId: str(raw.documentId ?? documentId) };
}

export function mapDocument(raw: Raw): Document {
  const id = str(raw.id);
  return {
    id,
    title: str(raw.title ?? raw.fileName) || 'Untitled document',
    fileName: str(raw.fileName),
    sizeBytes: Number(raw.sizeBytes ?? 0),
    pages: Number(raw.pageCount ?? raw.pages ?? 0),
    conceptCount: Number(raw.conceptCount ?? 0),
    createdAt: str(raw.createdAt) || nowIso(),
    folderId: raw.folderId ? str(raw.folderId) : null,
    topics: arr(raw.topics).map((t) => mapTopic(t, id)),
    status: raw.status,
    processingStep: raw.processingStep ?? undefined,
    errorMessage: raw.errorMessage ?? null,
  };
}

// ---------------------------------------------------------------- quizzes
export function mapQuestion(raw: Raw): Question {
  let options = raw.options;
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      options = undefined;
    }
  }
  return {
    id: str(raw.id),
    type: asQuestionType(raw.type ?? raw.questionType),
    prompt: str(raw.prompt ?? raw.question ?? raw.text),
    options: Array.isArray(options) ? options.map(str) : undefined,
    // The backend may keep these hidden until the quiz is submitted; the results page then reads
    // them from the attempt's answers instead (see mapAttempt).
    correctAnswer: str(raw.correctAnswer),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(str) : undefined,
    explanation: str(raw.explanation),
    topicId: str(raw.topicId ?? raw.topic?.id),
    difficulty: asQuestionDifficulty(raw.difficulty),
  };
}

export function mapQuiz(raw: Raw): Quiz {
  return {
    id: str(raw.id),
    title: str(raw.title) || 'Quiz',
    documentId: str(raw.documentId ?? raw.document?.id),
    createdAt: str(raw.createdAt) || nowIso(),
    folderId: raw.folderId ? str(raw.folderId) : null,
    difficulty: asDifficulty(raw.difficulty),
    questions: arr(raw.questions).map(mapQuestion),
    saved: Boolean(raw.isSaved ?? raw.saved ?? false),
  };
}

export function mapAttempt(raw: Raw): QuizAttempt {
  const answers: AnswerRecord[] = arr(raw.answers).map((a) => ({
    questionId: str(a.questionId ?? a.question?.id),
    answer: str(a.answer ?? a.answerText ?? a.userAnswer),
    correct: Boolean(a.isCorrect ?? a.correct),
    correctAnswer: a.correctAnswer ?? a.question?.correctAnswer ?? undefined,
    explanation: a.explanation ?? a.question?.explanation ?? undefined,
  }));
  const total = Number(raw.total ?? raw.totalCount ?? raw.totalQuestions ?? answers.length);
  const correctCount = Number(raw.correctCount ?? answers.filter((a) => a.correct).length);
  return {
    id: str(raw.id ?? raw.attemptId),
    quizId: str(raw.quizId),
    completedAt: str(raw.completedAt ?? raw.submittedAt ?? raw.createdAt ?? raw.startedAt) || nowIso(),
    score: Math.round(Number(raw.score ?? (total ? (correctCount / total) * 100 : 0))),
    correctCount,
    total,
    answers,
    topicScores: arr(raw.topicScores ?? raw.topicPerformance ?? raw.topics).map((t) => ({
      topicId: str(t.topicId ?? t.id),
      topicName: str(t.topicName ?? t.name ?? t.topic?.name) || 'Topic',
      score: Math.round(Number(t.score ?? t.percentage ?? 0)),
    })),
    analysis: raw.analysisText ?? raw.analysis ?? raw.aiAnalysis ?? undefined,
  };
}

// ---------------------------------------------------------------- summaries
export function mapSummary(raw: Raw): Summary {
  return {
    id: str(raw.id),
    title: str(raw.title) || 'Summary',
    documentId: str(raw.documentId ?? raw.document?.id),
    createdAt: str(raw.createdAt) || nowIso(),
    folderId: raw.folderId ? str(raw.folderId) : null,
    saved: Boolean(raw.isSaved ?? raw.saved ?? false),
    overview: str(raw.overview ?? raw.summary ?? raw.content),
    concepts: arr(raw.concepts ?? raw.sections ?? raw.keyConcepts).map((c) => ({
      title: str(c.title ?? c.name),
      body: str(c.body ?? c.content ?? c.description ?? c.text),
    })),
    keyPoints: arr(raw.keyPoints).map((p) => (typeof p === 'string' ? p : str(p.text ?? p.point ?? p.content))),
  };
}

// ---------------------------------------------------------------- folders and library
export function mapFolder(raw: Raw): Folder {
  const count = raw.itemCount ?? raw.totalItems;
  return { id: str(raw.id), name: str(raw.name), createdAt: str(raw.createdAt) || nowIso(), itemCount: count === undefined ? undefined : Number(count) };
}

const RESOURCE_TYPES: ResourceType[] = ['document', 'quiz', 'summary'];

export function mapResource(raw: Raw, defaults: { folderId?: string } = {}): Resource {
  const type: ResourceType = RESOURCE_TYPES.includes(raw.type) ? raw.type : 'document';
  const id = str(raw.id);
  const folderId = raw.folderId ?? defaults.folderId ?? null;
  return {
    id,
    type,
    title: str(raw.title) || 'Untitled',
    documentId: str(raw.documentId) || (type === 'document' ? id : ''),
    sourceTitle: raw.sourceTitle ?? raw.documentTitle ?? undefined,
    folderId: folderId ? str(folderId) : null,
    date: str(raw.date ?? raw.lastAttemptAt ?? raw.createdAt) || nowIso(),
    score: raw.score ?? raw.lastScore ?? raw.latestScore ?? undefined,
    pages: raw.pages ?? raw.pageCount ?? undefined,
    questionCount: raw.questionCount ?? raw.totalQuestions ?? undefined,
    lastAttemptAt: raw.lastAttemptAt ?? undefined,
  };
}

// ---------------------------------------------------------------- chat
export function mapSource(raw: Raw): SourceRef | undefined {
  if (!raw) return undefined;
  const start = raw.pageStart;
  const end = raw.pageEnd;
  const pages = raw.pages ?? (start !== undefined && start !== null ? (end === undefined || end === null || end === start ? String(start) : `${start}-${end}`) : '—');
  return {
    pages: str(pages),
    section: raw.section ?? raw.sectionTitle ?? undefined,
    documentId: raw.documentId ? str(raw.documentId) : undefined,
    documentTitle: raw.documentTitle ?? undefined,
  };
}

export function mapMessage(raw: Raw): ChatMessage {
  return {
    id: str(raw.id) || `m-${Math.random().toString(36).slice(2, 10)}`,
    role: raw.role === 'user' ? 'user' : 'assistant',
    text: str(raw.content ?? raw.text ?? raw.answer),
    source: mapSource(raw.source ?? arr(raw.sources)[0]),
  };
}

/** POST /conversations/{id}/messages may return the assistant message, or both messages. */
export function pickAssistantReply(raw: Raw): ChatMessage {
  const direct = raw?.assistantMessage ?? raw?.assistant ?? raw?.reply;
  const fromList = arr(raw?.messages).filter((m) => m.role === 'assistant').pop();
  const msg = direct ?? fromList ?? raw;
  return mapMessage({ ...msg, role: 'assistant', sources: msg.sources ?? raw?.sources, source: msg.source ?? raw?.source, content: msg.content ?? msg.text ?? msg.answer ?? raw?.answer });
}

export function mapConversation(raw: Raw): Conversation {
  return {
    id: str(raw.id),
    title: str(raw.title) || 'New chat',
    scope: raw.documentId ? str(raw.documentId) : 'all',
    messages: arr(raw.messages).map(mapMessage),
    updatedAt: str(raw.updatedAt ?? raw.createdAt) || nowIso(),
  };
}

// ---------------------------------------------------------------- stats
export function mapStats(raw: Raw): Stats {
  return {
    quizzesCompleted: Number(raw.quizzesCompleted ?? raw.completedQuizzes ?? 0),
    averageScore: Math.round(Number(raw.averageScore ?? raw.avgScore ?? 0)),
    topicsMastered: Number(raw.topicsMastered ?? raw.masteredTopics ?? 0),
  };
}
