import { Exam } from '../../services/examService';
import { useAppDispatch } from '../../app/hooks';
import { deleteExam, updateExamStatus } from '../../features/exams/examsSlice';
import { useNavigate } from 'react-router-dom';

interface ExamCardProps {
  exam: Exam;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      configuring: 'bg-yellow-100 text-yellow-800',
      grading: 'bg-blue-100 text-blue-800',
      reviewing: 'bg-purple-100 text-purple-800',
      published: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async () => {
    if (exam.status !== 'draft') {
      alert('Only draft exams can be deleted');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${exam.title}"?`)) {
      await dispatch(deleteExam(exam.id));
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await dispatch(updateExamStatus({ examId: exam.id, status: newStatus }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{exam.title}</h3>
          <p className="text-sm text-gray-600">{exam.subject}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
          {exam.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Exam Date: {formatDate(exam.exam_date)}
        </div>
        {exam.statistics && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Total Submissions: {exam.statistics.total_submissions || 0}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-200 pt-4 space-y-2">
        {exam.status === 'draft' && (
          <button
            onClick={() => handleStatusChange('configuring')}
            className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            Start Configuring
          </button>
        )}
        {exam.status === 'configuring' && (
          <button
            onClick={() => handleStatusChange('grading')}
            className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            Start Grading
          </button>
        )}
        {exam.status === 'grading' && (
          <button
            onClick={() => handleStatusChange('reviewing')}
            className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors text-sm font-medium"
          >
            Move to Review
          </button>
        )}
        {exam.status === 'reviewing' && (
          <button
            onClick={() => handleStatusChange('published')}
            className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors text-sm font-medium"
          >
            Publish Results
          </button>
        )}
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/dashboard/exams/${exam.id}`)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            View Details
          </button>
          {exam.status === 'draft' && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
