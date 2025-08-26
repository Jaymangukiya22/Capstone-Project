import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import AuthGuard from './components/auth/AuthGuard';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes - redirect to dashboard if authenticated */}
        <Route 
          path="/login" 
          element={
            <AuthGuard requireAuth={false}>
              <LoginPage />
            </AuthGuard>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <AuthGuard requireAuth={false}>
              <SignupPage />
            </AuthGuard>
          } 
        />
        
        {/* Protected routes - require authentication */}
        <Route 
          path="/dashboard" 
          element={
            <AuthGuard requireAuth={true}>
              <Dashboard />
            </AuthGuard>
          } 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
