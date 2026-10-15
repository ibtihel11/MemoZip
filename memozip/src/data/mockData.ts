/**
 * Realistic mock data used until the FastAPI backend is connected.
 * Nothing outside src/data and src/services/api should import this file.
 */
import type {
  Conversation, Difficulty, Document, Folder, Question, QuestionDifficulty, Quiz, QuizAttempt, Summary, Topic, User,
} from '@/types';
import { buildAttempt, simulateAnswers } from '@/utils/scoring';

const daysAgo = (n: number, hoursAgo = 0) => new Date(Date.now() - n * 86_400_000 - hoursAgo * 3_600_000).toISOString();

type D = QuestionDifficulty;
const mc = (id: string, topicId: string, prompt: string, options: string[], correct: string, explanation: string, difficulty: D = 'medium'): Question =>
  ({ id, type: 'multiple_choice', prompt, options, correctAnswer: correct, explanation, topicId, difficulty });
const tf = (id: string, topicId: string, prompt: string, correct: boolean, explanation: string, difficulty: D = 'easy'): Question =>
  ({ id, type: 'true_false', prompt, options: ['True', 'False'], correctAnswer: correct ? 'True' : 'False', explanation, topicId, difficulty });
const sa = (id: string, topicId: string, prompt: string, correct: string, keywords: string[], explanation: string, difficulty: D = 'hard'): Question =>
  ({ id, type: 'short_answer', prompt, correctAnswer: correct, keywords, explanation, topicId, difficulty });

const topic = (documentId: string, id: string, name: string): Topic => ({ id, name, documentId });

/* ------------------------------ Documents ------------------------------ */

const netTopics = [
  topic('doc-net', 'net-osi', 'OSI Model'),
  topic('doc-net', 'net-tcp', 'TCP'),
  topic('doc-net', 'net-http', 'HTTP'),
  topic('doc-net', 'net-dns', 'DNS'),
  topic('doc-net', 'net-cc', 'Congestion Control'),
];
const mlTopics = [
  topic('doc-ml', 'ml-class', 'Classification'),
  topic('doc-ml', 'ml-reg', 'Regression'),
  topic('doc-ml', 'ml-over', 'Overfitting & Regularization'),
  topic('doc-ml', 'ml-eval', 'Model Evaluation'),
  topic('doc-ml', 'ml-clust', 'Clustering'),
];
const dbTopics = [
  topic('doc-db', 'db-rel', 'Relational Model'),
  topic('doc-db', 'db-sql', 'SQL Queries'),
  topic('doc-db', 'db-norm', 'Normalization'),
  topic('doc-db', 'db-txn', 'Transactions & ACID'),
  topic('doc-db', 'db-idx', 'Indexing'),
];
const osTopics = [
  topic('doc-os', 'os-proc', 'Processes & Threads'),
  topic('doc-os', 'os-sched', 'Scheduling'),
  topic('doc-os', 'os-mem', 'Memory Management'),
  topic('doc-os', 'os-dead', 'Deadlocks'),
  topic('doc-os', 'os-fs', 'File Systems'),
];

const documents: Document[] = [
  { id: 'doc-net', title: 'Computer Networks', fileName: 'computer-networks.pdf', sizeBytes: 3.8 * 1024 * 1024, pages: 42, conceptCount: 18, createdAt: daysAgo(14), folderId: 'f-net', topics: netTopics },
  { id: 'doc-ml', title: 'Machine Learning', fileName: 'ml-lecture-notes.pdf', sizeBytes: 5.2 * 1024 * 1024, pages: 58, conceptCount: 24, createdAt: daysAgo(11), folderId: 'f-ml', topics: mlTopics },
  { id: 'doc-db', title: 'Database Systems', fileName: 'database-systems.pdf', sizeBytes: 2.1 * 1024 * 1024, pages: 36, conceptCount: 15, createdAt: daysAgo(9), folderId: 'f-db', topics: dbTopics },
  { id: 'doc-os', title: 'Operating Systems', fileName: 'os-course.pdf', sizeBytes: 6.4 * 1024 * 1024, pages: 64, conceptCount: 22, createdAt: daysAgo(5), folderId: null, topics: osTopics },
];

/* ------------------------------ Questions ------------------------------ */

const net: Question[] = [
  mc('n1', 'net-tcp', 'Which protocol is responsible for reliable transport?', ['UDP', 'IP', 'TCP', 'HTTP'], 'TCP',
    'TCP provides reliable, ordered delivery with acknowledgements and retransmissions. UDP is connectionless, IP only offers best-effort delivery, and HTTP sits at the application layer.', 'easy'),
  mc('n2', 'net-osi', 'Which OSI layer is responsible for routing packets between networks?', ['Data Link', 'Network', 'Transport', 'Session'], 'Network',
    'The Network layer (layer 3) chooses paths between networks using logical addresses such as IP addresses.', 'easy'),
  mc('n3', 'net-http', 'Which HTTP method is meant for retrieving a resource without side effects?', ['GET', 'POST', 'PUT', 'DELETE'], 'GET',
    'GET is a safe method: it should only read data. POST, PUT and DELETE are expected to change state on the server.', 'easy'),
  mc('n4', 'net-dns', 'What does a DNS A record map?', ['An IPv4 address to a MAC address', 'A domain name to an IPv4 address', 'A domain name to a mail server', 'An IP address to a domain name'],
    'A domain name to an IPv4 address', 'An A record points a hostname to an IPv4 address. MX records handle mail servers and PTR records handle reverse lookups.'),
  mc('n5', 'net-cc', 'During TCP slow start, how does the congestion window grow?',
    ['Linearly, by one segment per round trip', 'Exponentially, roughly doubling every round trip', 'It stays constant', 'It halves every round trip'],
    'Exponentially, roughly doubling every round trip', 'Despite its name, slow start grows the window exponentially. It is "slow" only compared with sending a full window immediately.'),
  tf('n6', 'net-tcp', 'TCP establishes a connection using a three-way handshake.', true,
    'The client sends SYN, the server answers SYN-ACK, and the client confirms with ACK before any data flows.'),
  mc('n7', 'net-osi', 'At which OSI layer does a switch primarily operate?', ['Physical', 'Data Link', 'Network', 'Application'], 'Data Link',
    'Switches forward frames using MAC addresses, which belong to the Data Link layer. Routers work at the Network layer.'),
  tf('n8', 'net-http', 'HTTP is a stateful protocol by design.', false,
    'HTTP is stateless: each request is independent. Cookies and sessions are added on top to carry state between requests.', 'medium'),
  sa('n9', 'net-dns', 'Name the type of DNS server that holds the final, authoritative answer for a domain.', 'Authoritative name server', ['authoritative'],
    'Authoritative name servers store the actual records for a zone. Resolvers and caches only relay or remember those answers.'),
  sa('n10', 'net-cc', 'What does TCP do to its congestion window when a timeout signals packet loss?', 'It reduces the window sharply (back to 1 MSS) and restarts slow start',
    ['slow start', 'reduce', '1 mss', 'decrease', 'shrink'], 'A timeout is treated as a strong congestion signal, so the window drops to one segment and slow start begins again.'),
  tf('n11', 'net-cc', 'AIMD stands for additive increase, multiplicative decrease.', true,
    'AIMD grows the window by a constant amount per round trip and cuts it by a factor (usually half) on loss, which keeps flows fair.', 'medium'),
  mc('n12', 'net-tcp', 'What is the purpose of TCP sequence numbers?',
    ['To encrypt segments', 'To order segments and detect missing data', 'To identify the destination port', 'To measure bandwidth'], 'To order segments and detect missing data',
    'Sequence numbers let the receiver reassemble data in order and notice gaps, which the sender then retransmits.'),
];

const ml: Question[] = [
  mc('ml1', 'ml-class', 'Which of these is a classification problem?', ['Predicting house prices', 'Deciding whether an email is spam', "Forecasting tomorrow's temperature", "Estimating a person's age"],
    'Deciding whether an email is spam', 'Classification predicts a discrete label (spam or not spam). The other options predict continuous values.', 'easy'),
  tf('ml2', 'ml-class', 'Logistic regression is used for classification despite its name.', true,
    'It models the probability of a class with a sigmoid function, then thresholds that probability to pick a label.'),
  mc('ml3', 'ml-class', 'What does a decision tree choose at each split?', ['A random feature', 'The feature and threshold that best separate the classes', 'The feature with the most missing values', 'The largest class'],
    'The feature and threshold that best separate the classes', 'Trees pick the split that most reduces impurity, measured for example by Gini or entropy.'),
  mc('ml4', 'ml-eval', 'Which metric is most informative when classes are heavily imbalanced?', ['Accuracy', 'F1 score', 'Mean squared error', 'R²'], 'F1 score',
    'Accuracy can look high by always predicting the majority class. F1 balances precision and recall.'),
  mc('ml5', 'ml-reg', 'Which loss is most commonly minimized in linear regression?', ['Cross-entropy', 'Hinge loss', 'Mean squared error', 'Zero-one loss'], 'Mean squared error',
    'Ordinary least squares minimizes the average squared difference between predictions and targets.', 'easy'),
  tf('ml6', 'ml-reg', 'R² can only take values between 0 and 1 on any dataset.', false,
    'On held-out data R² can be negative when the model predicts worse than simply using the mean.', 'hard'),
  mc('ml7', 'ml-over', 'Which technique helps reduce overfitting?', ['Adding more input features', 'Training longer without validation', 'L2 regularization', 'Removing the test set'], 'L2 regularization',
    'L2 regularization penalizes large weights, which keeps the model simpler and improves generalization.'),
  sa('ml8', 'ml-over', 'What does it mean when a model overfits the training data?', 'It memorizes noise in the training data and performs poorly on unseen data',
    ['unseen', 'generaliz', 'noise', 'memoriz'], 'An overfit model has low training error but high error on new data because it learned noise instead of the underlying pattern.'),
];

const db: Question[] = [
  mc('db1', 'db-sql', 'Which SQL clause filters rows after grouping?', ['WHERE', 'HAVING', 'ORDER BY', 'LIMIT'], 'HAVING',
    'WHERE filters rows before grouping; HAVING filters the groups produced by GROUP BY.', 'easy'),
  mc('db2', 'db-sql', 'Which JOIN returns all rows from the left table even without a match?', ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'SELF JOIN'], 'LEFT JOIN',
    'A LEFT JOIN keeps every left-table row and fills unmatched right-table columns with NULL.'),
  mc('db3', 'db-norm', 'A table is in 2NF when it is in 1NF and…', ['has no transitive dependencies', 'has no partial dependency on a composite key', 'has no multivalued attributes', 'has a primary key'],
    'has no partial dependency on a composite key', 'Second normal form removes attributes that depend on only part of a composite key.', 'hard'),
  tf('db4', 'db-norm', 'Normalization aims to reduce data redundancy.', true, 'By splitting data into well-structured tables, normalization avoids duplicated facts and update anomalies.'),
  mc('db5', 'db-txn', 'In ACID, what does Isolation guarantee?',
    ['Committed data survives crashes', 'Concurrent transactions do not interfere with each other', 'Every transaction is all-or-nothing', 'Data always satisfies constraints'],
    'Concurrent transactions do not interfere with each other', 'Isolation makes concurrent transactions behave as if they ran one after another. Durability covers crashes; atomicity covers all-or-nothing.'),
  sa('db6', 'db-idx', 'Why can adding an index slow down INSERT operations?', 'The index has to be updated for every new row', ['updat', 'maintain', 'rebuild'],
    'Every index is a separate structure that must be kept in sync, so writes do extra work in exchange for faster reads.'),
];

const os: Question[] = [
  mc('os1', 'os-proc', 'What is the main difference between a process and a thread?',
    ['Threads cannot run in parallel', 'Threads of a process share the same address space', 'Processes share memory by default', 'Threads always have separate stacks and heaps'],
    'Threads of a process share the same address space', 'Threads share code, heap and open files inside their process, while each process has its own address space.', 'easy'),
  tf('os2', 'os-proc', 'A context switch has zero cost.', false, 'Saving and restoring state, and losing cache warmth, makes context switches pure overhead.'),
  mc('os3', 'os-sched', 'Which scheduling algorithm can starve long jobs?', ['Round Robin', 'First-Come First-Served', 'Shortest Job First', 'Multilevel feedback queue with aging'], 'Shortest Job First',
    'If short jobs keep arriving, SJF may never run the long ones. Aging is a common fix.'),
  mc('os4', 'os-mem', 'What is the purpose of a page table?', ['Caching disk blocks', 'Mapping virtual pages to physical frames', 'Tracking running processes', 'Storing file permissions'], 'Mapping virtual pages to physical frames',
    'The page table translates virtual addresses into physical ones, enabling isolation and virtual memory.'),
  tf('os5', 'os-mem', 'Thrashing happens when a system spends more time paging than executing.', true,
    'When working sets do not fit in memory, constant page faults leave little time for useful work.', 'medium'),
  sa('os6', 'os-dead', 'Name one of the four necessary conditions for deadlock.', 'Mutual exclusion, hold and wait, no preemption, or circular wait',
    ['mutual', 'hold', 'preempt', 'circular'], 'A deadlock requires all four: mutual exclusion, hold and wait, no preemption and circular wait. Breaking any one prevents it.'),
];

/* -------------------------------- Quizzes ------------------------------- */

const pick = (bank: Question[], ids: string[]) => ids.map((id) => bank.find((q) => q.id === id)!);

const quiz = (id: string, title: string, documentId: string, folderId: string | null, days: number, questions: Question[], difficulty: Difficulty = 'mixed'): Quiz =>
  ({ id, title, documentId, folderId, createdAt: daysAgo(days), difficulty, questions, saved: true });

const quizzes: Quiz[] = [
  quiz('quiz-tcp', 'TCP & Congestion Control', 'doc-net', 'f-net', 14, net),
  quiz('quiz-osi', 'OSI Model & HTTP Basics', 'doc-net', 'f-net', 10, pick(net, ['n2', 'n7', 'n3', 'n8']), 'easy'),
  quiz('quiz-class', 'Classification Quiz', 'doc-ml', 'f-ml', 8, pick(ml, ['ml1', 'ml2', 'ml3', 'ml4'])),
  quiz('quiz-reg', 'Regression Quiz', 'doc-ml', 'f-ml', 6, pick(ml, ['ml5', 'ml6', 'ml7', 'ml8'])),
  quiz('quiz-sql', 'SQL & Normalization', 'doc-db', 'f-db', 5, db),
  quiz('quiz-sched', 'Processes, Scheduling & Memory', 'doc-os', null, 3, os),
];

/* ------------------------------- Attempts ------------------------------- */

const topicsByDoc: Record<string, Topic[]> = { 'doc-net': netTopics, 'doc-ml': mlTopics, 'doc-db': dbTopics, 'doc-os': osTopics };

const attempt = (id: string, quizId: string, days: number, wrong: string[], hoursAgo = 0): QuizAttempt => {
  const q = quizzes.find((x) => x.id === quizId)!;
  return buildAttempt(q, topicsByDoc[q.documentId], simulateAnswers(q, wrong), id, daysAgo(days, hoursAgo));
};

const attempts: QuizAttempt[] = [
  attempt('att-tcp-3', 'quiz-tcp', 0, ['n5', 'n9', 'n10'], 2),   // 75%
  attempt('att-tcp-2', 'quiz-tcp', 3, ['n5', 'n9', 'n10', 'n3']), // 67%
  attempt('att-tcp-1', 'quiz-tcp', 7, ['n5', 'n9', 'n10', 'n3', 'n2', 'n12']), // 50%
  attempt('att-osi-1', 'quiz-osi', 5, ['n8']),
  attempt('att-class-1', 'quiz-class', 4, ['ml4']),
  attempt('att-reg-1', 'quiz-reg', 2, ['ml6', 'ml8']),
  attempt('att-sql-1', 'quiz-sql', 1, ['db3', 'db6']),
  attempt('att-sched-1', 'quiz-sched', 1, ['os6'], 5),
];

/* ------------------------------- Summaries ------------------------------ */

export interface SummaryTemplate {
  overview: string;
  concepts: { title: string; body: string }[];
  keyPoints: string[];
}

export const summaryTemplates: Record<string, SummaryTemplate> = {
  'doc-net': {
    overview: 'Computer networks let devices exchange data by following shared rules called protocols. These protocols are organised in layers, so each layer can focus on one job, from moving bits over a cable to delivering a web page. The course follows a packet from the application down to the wire and explains how reliability and fairness are achieved along the way.',
    concepts: [
      { title: 'OSI Model', body: 'A seven-layer reference model that separates networking into physical, data link, network, transport, session, presentation and application layers. Each layer only talks to the layers directly above and below it.' },
      { title: 'TCP', body: 'A connection-oriented transport protocol. It opens a connection with a three-way handshake and uses sequence numbers, acknowledgements and retransmissions to deliver data reliably and in order.' },
      { title: 'HTTP', body: 'The stateless request and response protocol of the web. Methods such as GET and POST describe the intent of a request, and cookies or sessions add state on top.' },
      { title: 'DNS', body: 'A distributed naming system that translates domain names into IP addresses through resolvers and a hierarchy of root, top-level-domain and authoritative servers.' },
      { title: 'Congestion Control', body: 'TCP adapts its sending rate to network conditions. Slow start probes capacity exponentially, then AIMD grows the window linearly and cuts it sharply when loss is detected.' },
    ],
    keyPoints: [
      'Layering hides complexity: each layer offers a simple service to the one above it.',
      'TCP trades speed for reliability, while UDP does the opposite.',
      'HTTP keeps no memory between requests; state is added with cookies and sessions.',
      'DNS caching is why repeated lookups are fast.',
      'Congestion control protects the network, not only the sender.',
    ],
  },
  'doc-ml': {
    overview: 'Machine learning builds models that learn patterns from data instead of following hand-written rules. The course focuses on supervised learning, covering classification and regression, and on the habits that make a model trustworthy: honest evaluation and protection against overfitting.',
    concepts: [
      { title: 'Classification', body: 'Predicting a discrete label from input features. Logistic regression and decision trees are the two baseline methods covered.' },
      { title: 'Regression', body: 'Predicting a continuous value. Linear regression minimizes mean squared error and is judged with metrics such as R².' },
      { title: 'Overfitting & Regularization', body: 'A model that memorizes noise fails on new data. Regularization, simpler models and more data all improve generalization.' },
      { title: 'Model Evaluation', body: 'Use held-out data and metrics that fit the problem. With imbalanced classes, precision, recall and F1 say more than accuracy.' },
    ],
    keyPoints: [
      'Always evaluate on data the model has never seen.',
      'Accuracy can mislead when classes are imbalanced.',
      'Regularization trades a little training accuracy for better generalization.',
      'Start with a simple baseline before trying complex models.',
    ],
  },
  'doc-db': {
    overview: 'Database systems store data so that it stays correct, consistent and fast to query. The course moves from the relational model and SQL to schema design through normalization, then to transactions and indexes, the tools that keep data safe and queries quick.',
    concepts: [
      { title: 'Relational Model', body: 'Data lives in tables of rows and columns. Keys identify rows and foreign keys link tables together.' },
      { title: 'SQL Queries', body: 'SELECT, JOIN, GROUP BY and HAVING describe what data you want. WHERE filters rows before grouping and HAVING filters groups afterwards.' },
      { title: 'Normalization', body: 'Splitting tables to remove redundancy and update anomalies, from first normal form through third normal form.' },
      { title: 'Transactions & ACID', body: 'Atomicity, consistency, isolation and durability guarantee that groups of operations behave safely, even with concurrency and crashes.' },
      { title: 'Indexing', body: 'Indexes speed up reads by keeping an ordered structure over a column, at the cost of extra work on every write.' },
    ],
    keyPoints: [
      'Normalize for correctness, denormalize deliberately for speed.',
      'A transaction is all-or-nothing.',
      'Indexes help reads and cost writes.',
      'Choose the join type based on which rows you must keep.',
    ],
  },
};

const summaries: Summary[] = [
  { id: 'sum-net', title: 'Computer Networks Summary', documentId: 'doc-net', createdAt: daysAgo(1), folderId: 'f-net', saved: true, ...summaryTemplates['doc-net'] },
  { id: 'sum-ml', title: 'Machine Learning Summary', documentId: 'doc-ml', createdAt: daysAgo(4), folderId: 'f-ml', saved: true, ...summaryTemplates['doc-ml'] },
  { id: 'sum-db', title: 'Database Systems Summary', documentId: 'doc-db', createdAt: daysAgo(2), folderId: 'f-db', saved: true, ...summaryTemplates['doc-db'] },
];

/* -------------------------------- Folders ------------------------------- */

const folders: Folder[] = [
  { id: 'f-net', name: 'Computer Networks', createdAt: daysAgo(14) },
  { id: 'f-ml', name: 'Machine Learning', createdAt: daysAgo(11) },
  { id: 'f-db', name: 'Databases', createdAt: daysAgo(9) },
];

/* ---------------------------------- Q&A --------------------------------- */

export interface QaEntry {
  documentId: string;
  keywords: string[];
  answer: string;
  pages: string;
  section: string;
}

export const qaEntries: QaEntry[] = [
  { documentId: 'doc-net', keywords: ['slow start', 'slow-start'], pages: '12–14', section: 'Congestion Control',
    answer: "A new TCP connection doesn't know how much bandwidth the path can carry. Slow start begins with a small congestion window and roughly doubles it every round trip, so TCP finds the available capacity quickly without flooding the network on the first send. Once the window reaches a threshold, TCP switches to a gentler linear increase." },
  { documentId: 'doc-net', keywords: ['handshake', 'syn', 'connection'], pages: '8–9', section: 'TCP',
    answer: 'TCP opens a connection with a three-way handshake. The client sends SYN, the server replies with SYN-ACK, and the client answers with ACK. This agrees on initial sequence numbers so both sides can detect lost or reordered data.' },
  { documentId: 'doc-net', keywords: ['dns', 'domain', 'resolver'], pages: '21–23', section: 'DNS',
    answer: 'A resolver asks the root servers, then the top-level-domain servers, and finally the authoritative name server, which returns the IP address. Answers are cached along the way, which is why most lookups are fast.' },
  { documentId: 'doc-net', keywords: ['osi', 'layer'], pages: '3–5', section: 'OSI Model',
    answer: 'The OSI model splits networking into seven layers, from physical to application. Each layer offers a service to the one above and uses the one below, so changes in one layer do not break the others.' },
  { documentId: 'doc-ml', keywords: ['overfit', 'regulariz'], pages: '31–33', section: 'Overfitting & Regularization',
    answer: 'A model overfits when it memorizes noise in the training data. It scores well on training examples and badly on new ones. Regularization such as L2 penalizes large weights, which keeps the model simpler and improves generalization.' },
  { documentId: 'doc-ml', keywords: ['classification', 'spam', 'logistic'], pages: '9–11', section: 'Classification',
    answer: 'Classification predicts a discrete label. Logistic regression estimates the probability of a class and thresholds it, while decision trees split the data on the feature that best separates the classes.' },
  { documentId: 'doc-db', keywords: ['normal', '2nf', '3nf'], pages: '14–17', section: 'Normalization',
    answer: 'Normalization removes redundancy by splitting tables. First normal form removes repeating groups, second removes partial dependencies on a composite key, and third removes transitive dependencies.' },
  { documentId: 'doc-db', keywords: ['acid', 'transaction'], pages: '24–27', section: 'Transactions & ACID',
    answer: 'ACID describes the guarantees of a transaction: Atomicity (all or nothing), Consistency (constraints hold), Isolation (concurrent transactions do not interfere) and Durability (committed data survives crashes).' },
  { documentId: 'doc-os', keywords: ['deadlock'], pages: '38–40', section: 'Deadlocks',
    answer: 'A deadlock needs four conditions at once: mutual exclusion, hold and wait, no preemption and circular wait. Preventing any one of them makes deadlock impossible.' },
  { documentId: 'doc-os', keywords: ['page', 'virtual', 'memory'], pages: '45–49', section: 'Memory Management',
    answer: 'Virtual memory gives each process its own address space. The page table maps virtual pages to physical frames, and pages not in memory are loaded from disk on demand.' },
  { documentId: 'doc-os', keywords: ['schedul', 'sjf', 'round robin'], pages: '22–25', section: 'Scheduling',
    answer: 'Schedulers decide which process runs next. Shortest Job First minimizes average waiting time but can starve long jobs, while Round Robin gives each process a fair time slice.' },
];

export const suggestedQuestions: Record<string, string[]> = {
  'doc-net': ['Why does TCP use slow start?', 'What happens during a TCP handshake?', 'How does DNS resolve a domain name?'],
  'doc-ml': ['What is overfitting and how do I prevent it?', 'When should I use classification instead of regression?'],
  'doc-db': ['What is the difference between 2NF and 3NF?', 'What does ACID guarantee?'],
  'doc-os': ['What are the four conditions for deadlock?', 'How does virtual memory work?'],
};

/* --------------------------------- Seed --------------------------------- */

export const user: User = {
  id: 'u-1',
  name: 'Ibtihel',
  email: 'ibtihel@example.com',
  defaultDifficulty: 'mixed',
  defaultQuestionCount: 15,
};

export interface MockDb {
  user: User;
  documents: Document[];
  quizzes: Quiz[];
  attempts: QuizAttempt[];
  summaries: Summary[];
  folders: Folder[];
  conversations: Conversation[];
}

export const seed: MockDb = { user, documents, quizzes, attempts, summaries, folders, conversations: [] };
