import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchExams, setFilters } from '../../features/exams/examsSlice';
import { logout } from '../../features/auth/authSlice';
import { useNavigate } from 'react-router-dom';
import ExamList from '../../components/teacher/ExamList';
import CreateExamModal from '../../components/teacher/CreateExamModal';

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const { exams, pagination, filters, isLoading } = useAppSelector((state) => state.exams);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    // Fetch exams on component mount
    dispatch(fetchExams({
      page: pagination.page,
      limit: pagination.limit,
      ...filters,
    }));
  }, [dispatch, filters, pagination.page, pagination.limit]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    dispatch(fetchExams({
      page: newPage,
      limit: pagination.limit,
      ...filters,
    }));
  };

  const handleFilterChange = (status: string) => {
    dispatch(setFilters({ ...filters, status: status || undefined }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">SmartEval</h1>
              <span className="ml-4 text-sm text-gray-600">Teacher Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <p className="text-gray-900 font-medium">{user?.profile.name}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Exams</h2>
            <p className="text-gray-600 mt-1">
              Manage and grade your exams
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
          >
            + Create New Exam
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by status:</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="configuring">Configuring</option>
            <option value="grading">Grading</option>
            <option value="reviewing">Reviewing</option>
            <option value="published">Published</option>
          </select>
        </div>

        {/* Exam List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading exams...</p>
            </div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No exams</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new exam.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                + Create New Exam
              </button>
            </div>
          </div>
        ) : (
          <>
            <ExamList exams={exams} />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center space-x-4">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Exam Modal */}
      <CreateExamModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
