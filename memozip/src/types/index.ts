export type ResourceType = 'document' | 'quiz' | 'summary';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type QuestionDifficulty = Exclude<Difficulty, 'mixed'>;
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';
export type ThemeName = 'tokyo-night' | 'monokai' | 'nord';

export interface User {
  id: string;
  name: string;
  email: string;
  defaultDifficulty: Difficulty;
  defaultQuestionCount: number;
}

export interface Topic {
  id: string;
  name: string;
  documentId: string;
}

export interface Document {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  pages: number;
  conceptCount: number;
  createdAt: string;
  folderId: string | null;
  topics: Topic[];
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  /** Present for multiple_choice and true_false. */
  options?: string[];
  correctAnswer: string;
  /** Used to evaluate short answers (stand-in for semantic evaluation on the backend). */
  keywords?: string[];
  explanation: string;
  topicId: string;
  difficulty: QuestionDifficulty;
}

export interface Quiz {
  id: string;
  title: string;
  documentId: string;
  createdAt: string;
  folderId: string | null;
  difficulty: Difficulty;
  questions: Question[];
  saved: boolean;
}

export interface AnswerRecord {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface TopicScore {
  topicId: string;
  topicName: string;
  /** 0–100 */
  score: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  completedAt: string;
  /** 0–100 */
  score: number;
  correctCount: number;
  total: number;
  answers: AnswerRecord[];
  topicScores: TopicScore[];
}

export interface SummaryConcept {
  title: string;
  body: string;
}

export interface Summary {
  id: string;
  title: string;
  documentId: string;
  createdAt: string;
  folderId: string | null;
  saved: boolean;
  overview: string;
  concepts: SummaryConcept[];
  keyPoints: string[];
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  itemCount?: number;
}

/** A flattened, library-friendly view of documents, saved quizzes and saved summaries. */
export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  documentId: string;
  /** Title of the source document (not set for documents themselves). */
  sourceTitle?: string;
  folderId: string | null;
  date: string;
  score?: number;
  pages?: number;
  questionCount?: number;
  lastAttemptAt?: string;
}

export interface QuizConfig {
  documentId: string;
  count: number;
  difficulty: Difficulty;
  types: QuestionType[];
  /** Used by "Review weak topics". */
  topicIds?: string[];
}

export interface SourceRef {
  pages: string;
  section?: string;
  /** Set when the answer came from one of several courses (AI Chat with "All my courses"). */
  documentId?: string;
  documentTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: SourceRef;
}

/** A saved AI Chat conversation. `scope` is 'all' or a document id. */
export interface Conversation {
  id: string;
  title: string;
  scope: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface Stats {
  quizzesCompleted: number;
  averageScore: number;
  topicsMastered: number;
}
