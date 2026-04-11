import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { getCurrentUser } from './features/auth/authSlice';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './components/ToastProvider';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded pages for code splitting
const DashboardPage = lazy(() => import('./pages/teacher/DashboardPage'));
const ExamDetailsPage = lazy(() => import('./pages/teacher/ExamDetailsPage'));
const GradingReviewPage = lazy(() => import('./pages/teacher/GradingReviewPage'));
const ChallengeQueuePage = lazy(() => import('./pages/teacher/ChallengeQueuePage'));
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage'));
const ResultDetailPage = lazy(() => import('./pages/student/ResultDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

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
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        <Suspense fallback={<PageLoader />}>
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

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
