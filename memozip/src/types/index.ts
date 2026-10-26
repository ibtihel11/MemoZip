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
  options?: string[];
  correctAnswer: string;
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

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  documentId: string;
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
  topicIds?: string[];
}

export interface SourceRef {
  pages: string;
  section?: string;
  documentId?: string;
  documentTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: SourceRef;
}

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
