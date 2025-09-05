import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import QuestionEditor from './pages/question-editor';
import CategoryManagement from './pages/category-management';
import LiveQuizMonitor from './pages/live-quiz-monitor';
import QuizBuilder from './pages/quiz-builder';
import Login from './pages/login';
import QuizDashboard from './pages/quiz-dashboard';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
      <ScrollToTop />
      <RouterRoutes>
        {/* Define your route here */}
        <Route path="/" element={<CategoryManagement />} />
        <Route path="/question-editor" element={<QuestionEditor />} />
        <Route path="/category-management" element={<CategoryManagement />} />
        <Route path="/live-quiz-monitor" element={<LiveQuizMonitor />} />
        <Route path="/quiz-builder" element={<QuizBuilder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/quiz-dashboard" element={<QuizDashboard />} />
        <Route path="*" element={<NotFound />} />
      </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
