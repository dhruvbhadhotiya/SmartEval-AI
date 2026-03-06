import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchExamById, deleteExam, updateExamStatus, uploadQuestionPaper, uploadModelAnswer } from '../../features/exams/examsSlice';
import examService from '../../services/examService';
import FileUploadZone from '../../components/teacher/FileUploadZone';
import UpdateExamModal from '../../components/teacher/UpdateExamModal';
import BulkUploadModal from '../../components/teacher/BulkUploadModal';

const ExamDetailsPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentExam, isLoading } = useAppSelector((state) => state.exams);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [uploadingQP, setUploadingQP] = useState(false);
  const [uploadingMA, setUploadingMA] = useState(false);
  const [qpProgress, setQpProgress] = useState(0);
  const [maProgress, setMaProgress] = useState(0);

  useEffect(() => {
    if (examId) {
      dispatch(fetchExamById(examId));
    }
  }, [dispatch, examId]);

  const handleQuestionPaperUpload = async (file: File) => {
    if (!examId) return;
    setUploadingQP(true);
    setQpProgress(0);
    
    // Simulate progress (in real app, use axios onUploadProgress)
    const progressInterval = setInterval(() => {
      setQpProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await dispatch(uploadQuestionPaper({ examId, file })).unwrap();
      setQpProgress(100);
      // Refresh exam data
      await dispatch(fetchExamById(examId));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload question paper');
    } finally {
      clearInterval(progressInterval);
      setUploadingQP(false);
      setQpProgress(0);
    }
  };

  const handleModelAnswerUpload = async (file: File) => {
    if (!examId) return;
    setUploadingMA(true);
    setMaProgress(0);
    
    const progressInterval = setInterval(() => {
      setMaProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      await dispatch(uploadModelAnswer({ examId, file })).unwrap();
      setMaProgress(100);
      await dispatch(fetchExamById(examId));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload model answer');
    } finally {
      clearInterval(progressInterval);
      setUploadingMA(false);
      setMaProgress(0);
    }
  };

  const handleDelete = async () => {
    if (currentExam?.status !== 'draft') {
      alert('Only draft exams can be deleted');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${currentExam?.title}"?`)) {
      if (examId) {
        await dispatch(deleteExam(examId));
        navigate('/dashboard');
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (examId) {
      await dispatch(updateExamStatus({ examId, status: newStatus }));
    }
  };

  const handleBulkUpload = async (files: File[]) => {
    if (!examId) return;
    
    try {
      // Call backend bulk upload endpoint
      const response = await examService.bulkUploadAnswerSheets(examId, files);
      
      const { uploaded_count, failed_count, failed_files } = response.data;
      
      // Show success message
      if (failed_count > 0) {
        const failedNames = failed_files.map((f: any) => f.filename).join(', ');
        alert(`Uploaded ${uploaded_count} files successfully.\n${failed_count} files failed: ${failedNames}`);
      } else {
        alert(`Successfully uploaded all ${uploaded_count} answer sheets!`);
      }
      
      // Refresh exam data to update statistics
      await dispatch(fetchExamById(examId));
    } catch (error: any) {
      console.error('Bulk upload failed:', error);
      const errorMsg = error.response?.data?.message || 'Failed to upload answer sheets';
      alert(`Upload failed: ${errorMsg}`);
      throw error; // Re-throw to let BulkUploadModal handle it
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (!currentExam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Exam not found</h2>
          <p className="mt-2 text-gray-600">The exam you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentExam.title}</h1>
                <p className="text-sm text-gray-600">{currentExam.subject}</p>
              </div>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(currentExam.status)}`}>
              {currentExam.status}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Exam Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Exam Information</h2>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Subject</label>
                  <p className="mt-1 text-base text-gray-900">{currentExam.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Exam Date</label>
                  <p className="mt-1 text-base text-gray-900">{formatDate(currentExam.exam_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Maximum Marks</label>
                  <p className="mt-1 text-base text-gray-900">{currentExam.max_marks || 100}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Duration</label>
                  <p className="mt-1 text-base text-gray-900">{currentExam.duration_minutes || 180} minutes</p>
                </div>
              </div>
            </div>

            {/* Question Paper Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Paper</h2>
              <FileUploadZone
                label="Question Paper"
                accept=".pdf,.doc,.docx"
                onFileSelect={handleQuestionPaperUpload}
                currentFile={currentExam.question_paper}
                isUploading={uploadingQP}
                uploadProgress={qpProgress}
              />
            </div>

            {/* Model Answer Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Model Answer</h2>
              <FileUploadZone
                label="Model Answer"
                accept=".pdf,.doc,.docx"
                onFileSelect={handleModelAnswerUpload}
                currentFile={currentExam.model_answer}
                isUploading={uploadingMA}
                uploadProgress={maProgress}
              />
            </div>

            {/* Answer Sheets Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Answer Sheets</h2>
                <button 
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Bulk Upload
                </button>
              </div>
              {(currentExam.statistics?.total_sheets || 0) > 0 ? (
                <div className="py-8">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {currentExam.statistics?.total_sheets || 0}
                    </h3>
                    <p className="text-gray-600">Answer sheets uploaded</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Ready for grading • {currentExam.statistics?.graded || 0} graded
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No answer sheets uploaded yet</p>
                  <p className="text-sm mt-1">Upload student answer sheets to begin grading</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Actions & Stats */}
          <div className="space-y-6">
            {/* Status Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                {currentExam.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('configuring')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Start Configuring
                  </button>
                )}
                {currentExam.status === 'configuring' && (
                  <button
                    onClick={() => handleStatusChange('grading')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Start Grading
                  </button>
                )}
                {currentExam.status === 'grading' && (
                  <button
                    onClick={() => handleStatusChange('reviewing')}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Move to Review
                  </button>
                )}
                {currentExam.status === 'reviewing' && (
                  <button
                    onClick={() => handleStatusChange('published')}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Publish Results
                  </button>
                )}
                {currentExam.status === 'draft' && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete Exam
                  </button>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Answer Sheets Uploaded</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {currentExam.statistics?.total_sheets || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Total Submissions</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {currentExam.statistics?.total_submissions || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Graded</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {currentExam.statistics?.graded || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Reviewed</label>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {currentExam.statistics?.reviewed || 0}
                  </p>
                </div>
                {currentExam.statistics?.average_score && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Average Score</label>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {currentExam.statistics.average_score.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">{formatDate(currentExam.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 text-gray-900">{formatDate(currentExam.updated_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Exam ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs">{currentExam.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <UpdateExamModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        exam={currentExam}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUpload={handleBulkUpload}
      />
    </div>
  );
};

export default ExamDetailsPage;
