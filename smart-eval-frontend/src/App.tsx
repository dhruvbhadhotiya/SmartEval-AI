import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense, ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { getCurrentUser } from './features/auth/authSlice';
import ErrorBoundary from './components/ErrorBoundary';
import OfflineBanner from './components/OfflineBanner';
import { ToastProvider } from './components/ToastProvider';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Spinner from './components/common/Spinner';
import LoginPage from './pages/LoginPage';

// Lazy-loaded pages
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const TeacherDashboard = lazy(() => import('./pages/teacher/DashboardPage'));
const ExamDetailsPage = lazy(() => import('./pages/teacher/ExamDetailsPage'));
const GradingReviewPage = lazy(() => import('./pages/teacher/GradingReviewPage'));
const ChallengeQueuePage = lazy(() => import('./pages/teacher/ChallengeQueuePage'));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboardPage'));
const ResultDetailPage = lazy(() => import('./pages/student/ResultDetailPage'));
const StudentChallengePage = lazy(() => import('./pages/student/ChallengePage'));

const FullPageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const PageLoader = () => (
  <div className="flex flex-1 items-center justify-center py-20">
    <Spinner size="lg" />
  </div>
);

const Shell = ({ children }: { children: ReactNode }) => <AppShell>{children}</AppShell>;

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading } = useAppSelector((s) => s.auth);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      if (isAuthenticated && !user && !hasCheckedAuth) {
        await dispatch(getCurrentUser());
      }
      if (active) setHasCheckedAuth(true);
    };
    checkAuth();
    return () => {
      active = false;
    };
  }, [dispatch, isAuthenticated, user, hasCheckedAuth]);

  if (!hasCheckedAuth || (isAuthenticated && !user && isLoading)) {
    return <FullPageLoader />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <OfflineBanner />
        <Suspense fallback={location.pathname === '/' ? <FullPageLoader /> : <PageLoader />}>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Profile (any authenticated user) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Shell>
                    <ProfilePage />
                  </Shell>
                </ProtectedRoute>
              }
            />

            {/* Teacher routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Shell>
                    <TeacherDashboard />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Shell>
                    <ExamDetailsPage />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/:examId/review"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Shell>
                    <GradingReviewPage />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/challenges"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Shell>
                    <ChallengeQueuePage />
                  </Shell>
                </ProtectedRoute>
              }
            />

            {/* Backwards-compatible aliases */}
            <Route path="/dashboard" element={<Navigate to="/teacher" replace />} />
            <Route
              path="/dashboard/exams/:examId"
              element={<RedirectWithParams to="/teacher/exams/:examId" />}
            />
            <Route
              path="/dashboard/exams/:examId/review"
              element={<RedirectWithParams to="/teacher/exams/:examId/review" />}
            />
            <Route path="/dashboard/challenges" element={<Navigate to="/teacher/challenges" replace />} />

            {/* Student routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <Shell>
                    <StudentDashboard />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/results/:examId"
              element={
                <ProtectedRoute requiredRole="student">
                  <Shell>
                    <ResultDetailPage />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/challenges"
              element={
                <ProtectedRoute requiredRole="student">
                  <Shell>
                    <StudentChallengePage />
                  </Shell>
                </ProtectedRoute>
              }
            />
            <Route path="/student/dashboard" element={<Navigate to="/student" replace />} />

            {/* Root redirect */}
            <Route
              path="/"
              element={
                isAuthenticated && user ? (
                  user.role === 'teacher' ? (
                    <Navigate to="/teacher" replace />
                  ) : (
                    <Navigate to="/student" replace />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  );
}

// Helper: preserve dynamic params when redirecting from /dashboard/* to /teacher/*
function RedirectWithParams({ to }: { to: string }) {
  const params = useParams();
  let resolved = to;
  Object.entries(params).forEach(([k, v]) => {
    if (v) resolved = resolved.replace(`:${k}`, v);
  });
  return <Navigate to={resolved} replace />;
}

export default App;
