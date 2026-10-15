import { auth } from './auth';
import { chat } from './chat';
import { documents } from './documents';
import { folders } from './folders';
import { quizzes } from './quizzes';
import { resources } from './resources';
import { stats } from './stats';
import { summaries } from './summaries';

/** The only thing UI code should import to talk to the backend. */
export const api = { auth, documents, quizzes, summaries, folders, resources, chat, stats };
