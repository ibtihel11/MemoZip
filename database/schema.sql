-- =====================================================================
-- MemoZip: PostgreSQL schema (v1, MVP)
-- Target: PostgreSQL 15+ (uses ON DELETE SET NULL (column), PG15)
-- Extensions: pgvector (RAG embeddings), pg_trgm (library search), citext
--
-- Conventions
--   * UUID primary keys (gen_random_uuid(), built in since PG13)
--   * timestamptz everywhere; created_at / updated_at on mutable tables
--   * Every user-owned row carries user_id, and composite foreign keys
--     (child.parent_id, child.user_id) -> (parent.id, parent.user_id)
--     make it impossible to link rows that belong to different users.
--   * Deleting a document cascades to everything generated from it
--     (topics, chunks, quizzes, attempts, summaries, chats about it).
--     Deleting a folder never deletes content: items become unfiled.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
CREATE TYPE difficulty          AS ENUM ('easy', 'medium', 'hard', 'mixed');  -- quiz setting
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');          -- one question
CREATE TYPE question_type       AS ENUM ('multiple_choice', 'true_false', 'short_answer');
CREATE TYPE document_status     AS ENUM ('uploaded', 'processing', 'ready', 'failed');
CREATE TYPE message_role        AS ENUM ('user', 'assistant');
CREATE TYPE job_kind            AS ENUM ('document_processing', 'quiz_generation', 'summary_generation');
CREATE TYPE job_status          AS ENUM ('queued', 'running', 'succeeded', 'failed');
CREATE TYPE resource_type       AS ENUM ('document', 'quiz', 'summary');

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- =====================================================================
-- 1. Accounts
-- =====================================================================
CREATE TABLE users (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text        NOT NULL CHECK (length(btrim(name)) > 0),
  email                  citext      NOT NULL UNIQUE,
  password_hash          text        NOT NULL,                  -- argon2id / bcrypt, never plain text
  -- Settings page: quiz defaults and theme (the theme can also stay client-side only)
  default_difficulty     difficulty  NOT NULL DEFAULT 'mixed',
  default_question_count smallint    NOT NULL DEFAULT 15 CHECK (default_question_count BETWEEN 1 AND 50),
  theme                  text        NOT NULL DEFAULT 'tokyo-night'
                                     CHECK (theme IN ('tokyo-night', 'monokai', 'nord')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Refresh-token rotation for the cookie session. Store only a hash of the token.
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash  text        NOT NULL UNIQUE,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

-- =====================================================================
-- 2. Organization
-- =====================================================================
CREATE TABLE folders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       text        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)                       -- target of composite foreign keys
);
CREATE UNIQUE INDEX folders_user_name_uq ON folders (user_id, lower(name));
CREATE TRIGGER folders_updated_at BEFORE UPDATE ON folders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- 3. Documents and what the AI extracts from them
-- =====================================================================
CREATE TABLE documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  folder_id       uuid,
  title           text            NOT NULL CHECK (length(btrim(title)) > 0),   -- editable display name
  file_name       text            NOT NULL,                                    -- original upload name
  storage_key     text            NOT NULL,                                    -- object-storage path (S3 / disk)
  mime_type       text            NOT NULL DEFAULT 'application/pdf',
  size_bytes      bigint          NOT NULL CHECK (size_bytes > 0),
  sha256          char(64),                                                    -- detect duplicate uploads
  page_count      integer         CHECK (page_count > 0),
  concept_count   integer         NOT NULL DEFAULT 0 CHECK (concept_count >= 0),
  status          document_status NOT NULL DEFAULT 'uploaded',
  -- The upload screen shows 4 steps: reading, structure, key concepts, preparing material.
  -- 0-3 = the active step, 4 = finished. The frontend polls this while status = 'processing'.
  processing_step smallint        NOT NULL DEFAULT 0 CHECK (processing_step BETWEEN 0 AND 4),
  error_message   text,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now(),
  processed_at    timestamptz,
  UNIQUE (id, user_id),
  FOREIGN KEY (folder_id, user_id) REFERENCES folders (id, user_id) ON DELETE SET NULL (folder_id)
);
CREATE INDEX documents_user_created_idx ON documents (user_id, created_at DESC);
CREATE INDEX documents_folder_idx       ON documents (folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX documents_user_sha_idx     ON documents (user_id, sha256);
CREATE INDEX documents_title_trgm_idx   ON documents USING gin (title gin_trgm_ops);
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Topics identified in a document ("TCP", "DNS", "Congestion Control"...).
-- Quiz questions point at a topic, which is what powers per-topic performance.
CREATE TABLE topics (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid     NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  name        text     NOT NULL CHECK (length(btrim(name)) > 0),
  position    smallint NOT NULL DEFAULT 0,
  UNIQUE (document_id, name)
);
CREATE INDEX topics_document_idx ON topics (document_id, position);

-- Passages of the document, used by RAG (course Q&A, quiz and summary generation).
-- page_start/page_end and section_title feed the "Based on your course, pages 12-14" label.
CREATE TABLE document_chunks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid     NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  topic_id      uuid     REFERENCES topics (id) ON DELETE SET NULL,
  chunk_index   integer  NOT NULL,
  page_start    integer  NOT NULL CHECK (page_start > 0),
  page_end      integer  NOT NULL,
  section_title text,
  content       text     NOT NULL,
  token_count   integer,
  embedding     vector(1536),                -- size must match the embedding model you pick
  tsv           tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  UNIQUE (document_id, chunk_index),
  CHECK (page_end >= page_start)
);
CREATE INDEX chunks_embedding_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv_idx       ON document_chunks USING gin (tsv);   -- hybrid keyword + vector search
CREATE INDEX chunks_topic_idx     ON document_chunks (topic_id) WHERE topic_id IS NOT NULL;

-- =====================================================================
-- 4. Quizzes, questions and attempts
-- =====================================================================
CREATE TABLE quizzes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  document_id     uuid        NOT NULL,
  folder_id       uuid,
  title           text        NOT NULL CHECK (length(btrim(title)) > 0),
  -- The configuration the student chose on the setup screen
  difficulty      difficulty  NOT NULL DEFAULT 'mixed',
  requested_count smallint    NOT NULL CHECK (requested_count BETWEEN 1 AND 50),
  question_types  question_type[] NOT NULL
                  CHECK (cardinality(question_types) BETWEEN 1 AND 3),
  -- A generated quiz exists as soon as it is taken; "saved" puts it in the Library.
  is_saved        boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (document_id, user_id) REFERENCES documents (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id, user_id)   REFERENCES folders (id, user_id)   ON DELETE SET NULL (folder_id)
);
CREATE INDEX quizzes_user_idx        ON quizzes (user_id, is_saved, created_at DESC);
CREATE INDEX quizzes_document_idx    ON quizzes (document_id);
CREATE INDEX quizzes_folder_idx      ON quizzes (folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX quizzes_title_trgm_idx  ON quizzes USING gin (title gin_trgm_ops);
CREATE TRIGGER quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- "Review weak topics" creates a quiz restricted to some topics.
CREATE TABLE quiz_focus_topics (
  quiz_id  uuid NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics (id)  ON DELETE CASCADE,
  PRIMARY KEY (quiz_id, topic_id)
);

-- Questions belong to one quiz and never change after generation, so old attempts stay valid.
-- Invariant (enforced by the API): the question's topic belongs to the quiz's document.
CREATE TABLE questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id         uuid                NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
  topic_id        uuid                NOT NULL REFERENCES topics (id)  ON DELETE CASCADE,
  source_chunk_id uuid                REFERENCES document_chunks (id) ON DELETE SET NULL,
  position        smallint            NOT NULL,
  type            question_type       NOT NULL,
  difficulty      question_difficulty NOT NULL DEFAULT 'medium',
  prompt          text                NOT NULL,
  options         jsonb,                                  -- ["UDP","IP","TCP","HTTP"]; null for short answer
  correct_answer  text                NOT NULL,
  keywords        text[],                                 -- helps grade short answers
  explanation     text                NOT NULL,
  created_at      timestamptz         NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, position),
  CONSTRAINT options_match_type CHECK (
    (type = 'short_answer'    AND options IS NULL)
 OR (type = 'true_false'      AND options = '["True","False"]'::jsonb AND correct_answer IN ('True','False'))
 OR (type = 'multiple_choice' AND jsonb_typeof(options) = 'array'
                              AND jsonb_array_length(options) BETWEEN 2 AND 6
                              AND options ? correct_answer)
  )
);
CREATE INDEX questions_topic_idx ON questions (topic_id);

-- Every submission (retake) is a new attempt. The latest completed attempt is "the current result".
CREATE TABLE quiz_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id          uuid        NOT NULL,
  user_id          uuid        NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,                               -- null while the student is still answering
  total_count      smallint    NOT NULL CHECK (total_count > 0),
  correct_count    smallint,
  score            smallint    CHECK (score BETWEEN 0 AND 100),
  duration_seconds integer     CHECK (duration_seconds >= 0),
  analysis_text    text,                                      -- the "AI analysis" paragraph on the results page
  FOREIGN KEY (quiz_id, user_id) REFERENCES quizzes (id, user_id) ON DELETE CASCADE,
  CHECK ((completed_at IS NULL     AND score IS NULL     AND correct_count IS NULL)
      OR (completed_at IS NOT NULL AND score IS NOT NULL AND correct_count IS NOT NULL)),
  CHECK (correct_count IS NULL OR correct_count <= total_count)
);
CREATE INDEX attempts_quiz_idx ON quiz_attempts (quiz_id, completed_at DESC);
CREATE INDEX attempts_user_idx ON quiz_attempts (user_id, completed_at DESC);

CREATE TABLE attempt_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id        uuid     NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  question_id       uuid     NOT NULL REFERENCES questions (id)     ON DELETE CASCADE,
  answer_text       text     NOT NULL DEFAULT '',
  is_correct        boolean,                                  -- null until graded
  grading_score     real     CHECK (grading_score BETWEEN 0 AND 1),   -- partial credit for short answers
  grading_feedback  text,
  answered_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
CREATE INDEX attempt_answers_question_idx ON attempt_answers (question_id);

-- Per-topic result of one attempt (the "Your performance" bars). Stored as a snapshot so that
-- history stays stable and "topics mastered" does not need to re-grade every answer.
-- App thresholds: strong >= 80, weak < 60.
CREATE TABLE attempt_topic_scores (
  attempt_id    uuid     NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
  topic_id      uuid     NOT NULL REFERENCES topics (id)        ON DELETE CASCADE,
  score         smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  correct_count smallint NOT NULL CHECK (correct_count >= 0),
  total_count   smallint NOT NULL CHECK (total_count > 0),
  PRIMARY KEY (attempt_id, topic_id)
);
CREATE INDEX attempt_topic_scores_topic_idx ON attempt_topic_scores (topic_id);

-- =====================================================================
-- 5. Summaries
-- =====================================================================
CREATE TABLE summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  document_id     uuid        NOT NULL,
  folder_id       uuid,
  title           text        NOT NULL CHECK (length(btrim(title)) > 0),
  overview        text        NOT NULL,
  key_points      text[]      NOT NULL DEFAULT '{}',
  is_saved        boolean     NOT NULL DEFAULT false,
  version         integer     NOT NULL DEFAULT 1,             -- incremented by "Regenerate"
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (document_id, user_id) REFERENCES documents (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id, user_id)   REFERENCES folders (id, user_id)   ON DELETE SET NULL (folder_id)
);
CREATE INDEX summaries_user_idx       ON summaries (user_id, is_saved, created_at DESC);
CREATE INDEX summaries_document_idx   ON summaries (document_id);
CREATE INDEX summaries_folder_idx     ON summaries (folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX summaries_title_trgm_idx ON summaries USING gin (title gin_trgm_ops);
CREATE TRIGGER summaries_updated_at BEFORE UPDATE ON summaries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- The numbered "Key concepts" sections (01 OSI Model, 02 TCP ...).
CREATE TABLE summary_concepts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id uuid     NOT NULL REFERENCES summaries (id) ON DELETE CASCADE,
  position   smallint NOT NULL,
  title      text     NOT NULL,
  body       text     NOT NULL,
  UNIQUE (summary_id, position)
);

-- =====================================================================
-- 6. AI Chat (the /chat page and "Ask about this course")
-- =====================================================================
-- document_id NULL means "All my courses". A chat scoped to a document is deleted with it,
-- because it would be meaningless (and misleading) to turn it into an all-courses chat.
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  document_id uuid,
  title       text        NOT NULL DEFAULT 'New chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),                 -- bumped when a message is added
  FOREIGN KEY (document_id, user_id) REFERENCES documents (id, user_id) ON DELETE CASCADE
);
CREATE INDEX conversations_user_idx ON conversations (user_id, updated_at DESC);
CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq               bigint GENERATED ALWAYS AS IDENTITY,          -- stable ordering inside a conversation
  conversation_id   uuid         NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  role              message_role NOT NULL,
  content           text         NOT NULL,
  model             text,                                          -- which LLM answered (assistant only)
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages (conversation_id, seq);

CREATE FUNCTION touch_conversation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;
CREATE TRIGGER messages_touch_conversation AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation();

-- Where an assistant answer came from. An answer can cite several passages, even from
-- different courses. Pages and section are copied so the citation survives re-processing.
-- An answer that found nothing relevant simply has no rows here.
CREATE TABLE message_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid    NOT NULL REFERENCES messages (id)         ON DELETE CASCADE,
  document_id uuid    NOT NULL REFERENCES documents (id)        ON DELETE CASCADE,
  chunk_id    uuid    REFERENCES document_chunks (id)           ON DELETE SET NULL,
  page_start  integer NOT NULL CHECK (page_start > 0),
  page_end    integer NOT NULL,
  section     text,
  relevance   real,
  CHECK (page_end >= page_start)
);
CREATE INDEX message_sources_message_idx ON message_sources (message_id);

-- =====================================================================
-- 7. Background work (processing, generation) and LLM cost tracking
-- =====================================================================
CREATE TABLE jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  kind              job_kind   NOT NULL,
  status            job_status NOT NULL DEFAULT 'queued',
  document_id       uuid       REFERENCES documents (id) ON DELETE CASCADE,
  quiz_id           uuid       REFERENCES quizzes (id)   ON DELETE SET NULL,   -- result of quiz_generation
  summary_id        uuid       REFERENCES summaries (id) ON DELETE SET NULL,   -- result of summary_generation
  params            jsonb      NOT NULL DEFAULT '{}',                           -- e.g. the quiz configuration
  error_message     text,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz
);
CREATE INDEX jobs_user_idx   ON jobs (user_id, created_at DESC);
CREATE INDEX jobs_active_idx ON jobs (status, created_at) WHERE status IN ('queued', 'running');

-- =====================================================================
-- 8. Views that match what the frontend shows
-- =====================================================================

-- The Library / "Recent resources" list: documents, saved quizzes and saved summaries
-- flattened into one shape (the frontend's `Resource` type).
CREATE VIEW library_items AS
  SELECT 'document'::resource_type AS type,
         d.id, d.user_id, d.title,
         d.id                      AS document_id,
         NULL::text                AS source_title,
         d.folder_id,
         d.created_at              AS date,
         NULL::smallint            AS score,
         d.page_count              AS pages,
         NULL::integer             AS question_count,
         NULL::timestamptz         AS last_attempt_at
  FROM documents d
  WHERE d.status = 'ready'
UNION ALL
  SELECT 'quiz'::resource_type,
         q.id, q.user_id, q.title,
         q.document_id,
         d.title,
         q.folder_id,
         COALESCE(la.completed_at, q.created_at),
         la.score,
         NULL::integer,
         qc.n,
         la.completed_at
  FROM quizzes q
  JOIN documents d ON d.id = q.document_id
  LEFT JOIN LATERAL (
    SELECT a.score, a.completed_at
    FROM quiz_attempts a
    WHERE a.quiz_id = q.id AND a.completed_at IS NOT NULL
    ORDER BY a.completed_at DESC
    LIMIT 1
  ) la ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::integer AS n FROM questions x WHERE x.quiz_id = q.id
  ) qc ON true
  WHERE q.is_saved
UNION ALL
  SELECT 'summary'::resource_type,
         s.id, s.user_id, s.title,
         s.document_id,
         d.title,
         s.folder_id,
         s.created_at,
         NULL::smallint,
         NULL::integer,
         NULL::integer,
         NULL::timestamptz
  FROM summaries s
  JOIN documents d ON d.id = s.document_id
  WHERE s.is_saved;

-- "12 items" on the Folders page.
CREATE VIEW folder_item_counts AS
  SELECT f.id AS folder_id, f.user_id,
         (SELECT count(*) FROM documents d WHERE d.folder_id = f.id AND d.status = 'ready')
       + (SELECT count(*) FROM quizzes   q WHERE q.folder_id = f.id AND q.is_saved)
       + (SELECT count(*) FROM summaries s WHERE s.folder_id = f.id AND s.is_saved) AS item_count
  FROM folders f;

-- "Your progress" on Home. A topic counts as mastered when it scored >= 80 in the
-- latest completed attempt of at least one quiz.
CREATE VIEW user_stats AS
  SELECT u.id AS user_id,
         (SELECT count(*) FROM quiz_attempts a
           WHERE a.user_id = u.id AND a.completed_at IS NOT NULL)                  AS quizzes_completed,
         COALESCE((SELECT round(avg(a.score)) FROM quiz_attempts a
           WHERE a.user_id = u.id AND a.completed_at IS NOT NULL), 0)::integer     AS average_score,
         (SELECT count(DISTINCT ts.topic_id)
            FROM (SELECT DISTINCT ON (a.quiz_id) a.id
                    FROM quiz_attempts a
                   WHERE a.user_id = u.id AND a.completed_at IS NOT NULL
                   ORDER BY a.quiz_id, a.completed_at DESC) latest
            JOIN attempt_topic_scores ts ON ts.attempt_id = latest.id
           WHERE ts.score >= 80)                                                   AS topics_mastered
  FROM users u;
