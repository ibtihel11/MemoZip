import { Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/layouts/ProtectedRoute';
import Ask from '@/pages/Ask';
import Chat from '@/pages/Chat';
import DocumentPage from '@/pages/DocumentPage';
import FolderPage from '@/pages/FolderPage';
import Folders from '@/pages/Folders';
import Home from '@/pages/Home';
import Library from '@/pages/Library';
import Login from '@/pages/Login';
import NotFound from '@/pages/NotFound';
import QuizConfig from '@/pages/QuizConfig';
import QuizDetail from '@/pages/QuizDetail';
import QuizResults from '@/pages/QuizResults';
import QuizTake from '@/pages/QuizTake';
import Register from '@/pages/Register';
import Settings from '@/pages/Settings';
import SummaryNew from '@/pages/SummaryNew';
import SummaryPage from '@/pages/SummaryPage';
import Upload from '@/pages/Upload';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/quizzes/:id/take" element={<QuizTake />} />
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="upload" element={<Upload />} />
          <Route path="library" element={<Library />} />
          <Route path="chat/:id?" element={<Chat />} />
          <Route path="folders" element={<Folders />} />
          <Route path="folders/:id" element={<FolderPage />} />
          <Route path="documents/:id" element={<DocumentPage />} />
          <Route path="documents/:id/quiz/new" element={<QuizConfig />} />
          <Route path="documents/:id/summary/new" element={<SummaryNew />} />
          <Route path="documents/:id/ask" element={<Ask />} />
          <Route path="quizzes/:id" element={<QuizDetail />} />
          <Route path="quizzes/:id/results/:attemptId" element={<QuizResults />} />
          <Route path="summaries/:id" element={<SummaryPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
