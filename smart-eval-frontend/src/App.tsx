import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { getCurrentUser } from './features/auth/authSlice';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/teacher/DashboardPage';
import ExamDetailsPage from './pages/teacher/ExamDetailsPage';
import GradingReviewPage from './pages/teacher/GradingReviewPage';
import ChallengeQueuePage from './pages/teacher/ChallengeQueuePage';
import StudentDashboardPage from './pages/student/StudentDashboardPage';
import ResultDetailPage from './pages/student/ResultDetailPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading } = useAppSelector((state) => state.auth);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  useEffect(() => {
    // Try to get current user on app load if token exists
    const checkAuth = async () => {
      if (isAuthenticated && !user && !hasCheckedAuth) {
        await dispatch(getCurrentUser());
        setHasCheckedAuth(true);
      } else if (!isAuthenticated) {
        setHasCheckedAuth(true);
      }
    };
    
    checkAuth();
  }, [dispatch, isAuthenticated, user, hasCheckedAuth]);

  // Show loading screen while checking authentication
  if (!hasCheckedAuth || (isAuthenticated && !user && isLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected teacher routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="teacher">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard/exams/:examId"
        element={
          <ProtectedRoute requiredRole="teacher">
            <ExamDetailsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/exams/:examId/review"
        element={
          <ProtectedRoute requiredRole="teacher">
            <GradingReviewPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/challenges"
        element={
          <ProtectedRoute requiredRole="teacher">
            <ChallengeQueuePage />
          </ProtectedRoute>
        }
      />

      {/* Protected student routes */}
      <Route
        path="/student/dashboard"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/results/:examId"
        element={
          <ProtectedRoute requiredRole="student">
            <ResultDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated && user ? (
            user.role === 'teacher' ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/student/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
