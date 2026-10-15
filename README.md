# MemoZip 🧠📄

> An AI-powered study assistant that transforms static course documents into interactive learning experiences, featuring automated quiz generation, intelligent summaries, and context-aware Q&A.

---

## 🚀 Overview

**MemoZip** is a full-stack learning management and enhancement platform designed to help students and professionals master complex material faster. By leveraging document parsing and Large Language Models (LLMs), MemoZip bridges the gap between passive reading and active recall. 

Whether you need to generate targeted practice quizzes from a 100-page PDF, extract structured topic summaries, or query course material via RAG (Retrieval-Augmented Generation), MemoZip keeps your learning organized in a unified library.

---

## ✨ Key Features & Scope

### 1. Core Modules (MVP)
* **Authentication & User Management:** Secure account creation, login/logout, and strict data isolation between users.
* **Document Management:** PDF upload with automated file validation, text extraction, and topic concept identification. Users can view, rename, and delete files.
* **Intelligent Quiz Generation:** On-the-fly quiz creation with customizable question counts, difficulties, and question types. Each question maps to specific topics with expected answers and explanations.
* **Quiz Taking & History:** Interactive testing interface with real-time scoring, detailed mistake breakdowns, and versioned attempt history allowing users to track their progress over time.
* **AI Summarization:** Automated document summarization structured by topic/section, highlighting major concepts and definitions.
* **Personal Library:** Hierarchical organization using custom folders, resource moving, and multi-type filtering.
* **UI/UX:** Fully responsive interface with native **Dark and Light mode** support.

### 2. Should Have (Advanced Scope)
* **Course Q&A (RAG):** Context-aware chatbot that queries uploaded course text to provide accurate answers backed by source page/section references.
* **Semantic Evaluation:** Smart evaluation of short-answer questions.
* **Resource Search:** Fast search and filtering across the user's personal library.

### 3. Future Roadmap (Post-MVP)
* **Adaptive Learning:** Topic mastery tracking, predictive modeling, and personalized question/review recommendations.
* **Enhanced Formats:** Spaced repetition and automated flashcard generation.

---

## 🛠️ Tech Stack & Architecture

*(Tailor this section based on your specific implementation stack)*
* **Frontend:** React, Next.js / TypeScript, Tailwind CSS (Dark/Light mode support)
* **Backend:** Node.js, Express / Python (Flask/FastAPI for AI workflows)
* **AI & Processing:** PyTorch / LangChain, LLM Integration, PDF parsing libraries
* **Database & Storage:** MongoDB / PostgreSQL with proper data isolation and migration management

---

## 📋 Requirements Summary

### Functional Requirements
* **A. Auth:** Account creation, secure session handling, strict data privacy.
* **B. Documents:** PDF ingestion, server-side validation, text/topic extraction, CRUD operations.
* **C. Quizzes:** Dynamic generation, difficulty/type constraints, topic mapping, explanations.
* **D. Quiz Taking:** Interactive completion, instant scoring, answer evaluation, review views.
* **E. Performance Analysis:** Granular breakdowns (overall score, correct/incorrect metrics, strong/weak topic tagging).
* **F. History & Saving:** Persistent quiz templates, multi-attempt tracking, performance comparisons over time.
* **G. Summaries:** Section-based structured overviews, concept highlights, summary CRUD operations.
* **H. Course Q&A:** RAG pipeline providing answers bound strictly to source material with section references.
* **I. Library:** Hierarchical folder structures, drag-and-drop/move support, multi-type filtering.

### Non-Functional Requirements
* **Performance:** Responsive UI feedback, non-blocking asynchronous document processing, and loading states for heavy AI actions.
* **Security:** Data isolation, input validation, protected API endpoints, and server-side environment variables protecting API keys.
* **Reliability:** Graceful error handling for invalid files or downstream AI failures without data corruption.
* **Usability:** Intuitive accessibility-first design, keyboard navigation support, and full dark/light theme options.
* **Maintainability:** Modular backend architecture, component-based frontend, and decoupled prompt management.

---

## 🚦 Getting Started

### Prerequisites
* Node.js & npm / Python 3.x installed locally
* Git configured on your machine

