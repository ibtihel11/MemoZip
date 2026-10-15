1. Functional requirements
A. User & authentication
The user shall be able to create an account.
The user shall be able to log in and log out.
The user shall have access only to their own documents and generated resources.
B. Document management
The user shall be able to upload a course/document in PDF format.
The system shall validate the uploaded file.
The system shall extract the textual content of the document.
The system shall analyze the document and identify its main topics/concepts.
The user shall be able to view their uploaded documents.
The user shall be able to delete and rename documents.
C. Quiz generation
The user shall be able to generate a quiz from an uploaded document.
The user shall be able to choose the number of questions.
The user shall be able to choose the difficulty.
The user shall be able to choose question types.
The AI shall generate questions based on the document content.
Each question shall be associated with a topic.
Questions shall have an expected answer.
The system shall provide explanations for answers.
D. Quiz taking
The user shall be able to answer generated questions.
The user shall be able to navigate between questions.
The user shall be able to submit a quiz.
The system shall calculate the user's score.
The system shall evaluate each answer.
The system shall display the correct answers and explanations.
E. Performance analysis

After completing a quiz, the system shall provide more than just a score.

It shall show:

Overall score
Number of correct/incorrect answers
Performance by topic
Strong topics
Weak topics
Questions answered incorrectly
Explanations for mistakes

For example:

Overall: 76%

TCP                 90%  ✓
OSI Model           84%  ✓
HTTP                71%
DNS                 52%  !
Congestion Control  41%  !
F. Quiz saving & history
The user shall be able to save a generated quiz.
A saved quiz shall retain its questions and source document.
The user shall be able to retake a saved quiz.
Each retake shall create a new attempt.
The latest attempt shall be displayed as the current result.
Previous attempts shall remain accessible as history.
The system shall allow the user to compare their performance over attempts.

So technically, results aren't actually deleted/replaced. The UI simply treats the newest result as the current one while maintaining the history.

G. AI-generated summaries
The user shall be able to generate a summary from an uploaded document.
The AI shall identify the major concepts.
The summary shall be structured by topic/section.
The summary shall highlight important points.
The user shall be able to save a summary.
The user shall be able to rename and delete saved summaries.
H. Course Q&A
The user shall be able to ask questions about an uploaded course.
The system shall retrieve relevant content from the document.
The AI shall generate an answer based primarily on the uploaded material.
The system should indicate the relevant document section/page when possible.
The user shall be able to ask follow-up questions.

This is your RAG component.

I. Library & organization
The user shall have a personal library.
The library shall contain documents, quizzes, and summaries.
The user shall be able to create folders.
The user shall be able to rename/delete folders.
The user shall be able to move resources between folders.
The user shall be able to search resources.
The user shall be able to filter resources by type.

Example:

📁 Machine Learning

   📄 ML Course.pdf
   📝 ML Summary
   🧠 Classification Quiz
   🧠 Regression Quiz
2. AI requirements

This is where I'd distinguish what the AI must do from the general application.

Document understanding

The AI should be able to:

identify the document's main topics
identify important concepts
understand relationships between concepts
associate content with sections/pages
Question generation

The AI should generate:

relevant questions
questions based strictly on the course
different difficulties
different question types
plausible distractors for MCQs
explanations

And ideally avoid:

duplicate questions
ambiguous questions
questions about information absent from the course
questions with multiple valid answers when only one is expected
Summary generation

The AI should produce:

concise summaries
structured sections
key points
important definitions/concepts
Question answering

The AI should:

User question
      ↓
Find relevant course content
      ↓
Generate answer
      ↓
Provide source/reference

This prevents the feature from simply behaving like a generic chatbot.

3. Future AI/ML requirements

I would not put these in the initial MVP requirements.

Keep them as future requirements:

Adaptive learning

The system could eventually:

track performance per topic
identify recurring mistakes
estimate topic mastery
recommend what to review
recommend which questions to practice next
adapt question difficulty based on performance

Eventually you could have:

Topic                  Mastery

OSI Model                92%
TCP                      87%
HTTP                     74%
DNS                      51%
Congestion Control       38%

Then your own ML model could predict something like:

P(correct answer | student, topic, question)

That would be a very nice advanced phase, but don't make it a prerequisite for MemoZip's first working version.

4. Non-functional requirements

These are just as important for your software engineering side.

Performance
Normal UI interactions should feel responsive.
Document processing should provide progress/status feedback.
AI operations should display a loading state.
Large documents should be processed without freezing the frontend.
Security
User data must be isolated between accounts.
Uploaded files must be validated.
API endpoints requiring authentication must be protected.
API keys must never be exposed to the frontend.
Sensitive configuration must be stored in environment variables.
Reliability
AI failures should produce understandable error messages.
Invalid documents should be handled gracefully.
Failed generation should not corrupt previously saved resources.
The system should handle interrupted document processing.
Usability
The interface should be simple enough to understand without instructions.
The application should support dark and light mode.
The interface should be responsive.
The application should be accessible through keyboard navigation.
Colors should not be the only way of communicating information.
Maintainability
React components should be reusable.
Backend code should be modular.
API communication should be separated from UI components.
Database migrations should be managed properly.
AI prompts should be maintained separately from application logic.
5. MVP requirements

This is the part I'd actually put into Jira as your initial scope.

Must have
✓ User authentication
✓ PDF upload
✓ PDF text extraction
✓ Document storage
✓ AI topic extraction
✓ AI quiz generation
✓ Quiz taking
✓ Quiz evaluation
✓ Score calculation
✓ Topic-level performance analysis
✓ Quiz saving
✓ Quiz retaking
✓ Quiz attempt history
✓ AI summary generation
✓ Summary saving
✓ Library
✓ Folders
✓ Dark/light mode
Should have
○ Course Q&A
○ RAG
○ Source/page references
○ Semantic evaluation of short answers
○ Search/filtering
Future
○ Topic mastery model
○ Personalized question recommendations
○ ML-based mastery prediction
○ Spaced repetition
○ Flashcards
○ Advanced analytics
