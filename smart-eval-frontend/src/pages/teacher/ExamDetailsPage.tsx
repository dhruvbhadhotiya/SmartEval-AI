import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchExamById, deleteExam, updateExamStatus, uploadQuestionPaper, uploadModelAnswer } from '../../features/exams/examsSlice';
import examService from '../../services/examService';
import gradingService, { AnswerSheet, Evaluation } from '../../services/gradingService';
import FileUploadZone from '../../components/teacher/FileUploadZone';
import UpdateExamModal from '../../components/teacher/UpdateExamModal';
import BulkUploadModal from '../../components/teacher/BulkUploadModal';
import ModelAnswerModal from '../../components/teacher/ModelAnswerModal';
import GradingConfigPanel from '../../components/teacher/GradingConfigPanel';
import EvaluationModal from '../../components/teacher/EvaluationModal';

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
  const [answerSheets, setAnswerSheets] = useState<AnswerSheet[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<AnswerSheet | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingMessage, setGradingMessage] = useState<string | null>(null);
  const [isModelAnswerOpen, setIsModelAnswerOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [selectedEvalSheet, setSelectedEvalSheet] = useState<AnswerSheet | null>(null);
  const [isExtractingQP, setIsExtractingQP] = useState(false);
  const [qpExtractedText, setQpExtractedText] = useState<string | null>(null);
  const [showQpModal, setShowQpModal] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const pollingCountRef = useRef<number>(0);
  const MAX_POLLS = 60; // Stop polling after 60 attempts (5 minutes)

  useEffect(() => {
    if (examId) {
      dispatch(fetchExamById(examId));
      loadAnswerSheets();
    }
  }, [dispatch, examId]);

  // Derive a stable boolean for polling instead of depending on full answerSheets array
  const hasProcessing = answerSheets.some(s => s.status === 'processing');
  const shouldPoll = hasProcessing || isGrading;

  // Polling: refresh sheets every 5s while any are in 'processing' state (max 5 min)
  useEffect(() => {
    if (shouldPoll) {
      if (!pollingRef.current) {
        pollingCountRef.current = 0;
        pollingRef.current = window.setInterval(async () => {
          pollingCountRef.current += 1;
          if (pollingCountRef.current > MAX_POLLS) {
            // Stop polling after max attempts to prevent infinite loop
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            return;
          }
          await loadAnswerSheets();
          if (examId) dispatch(fetchExamById(examId));
        }, 5000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        pollingCountRef.current = 0;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [shouldPoll]);

  const loadAnswerSheets = async () => {
    if (!examId) return;
    try {
      const response = await gradingService.getAnswerSheets(examId);
      setAnswerSheets(response.data || []);
    } catch {
      // Sheets may not exist yet
      setAnswerSheets([]);
    }
  };

  const handleRunOCR = async () => {
    if (!examId) return;
    setIsProcessingOCR(true);
    setOcrMessage(null);
    try {
      const response = await gradingService.startOCRProcessing(examId);
      const result = response.data;
      setOcrMessage(`OCR complete: ${result.processed} processed, ${result.failed} failed out of ${result.total}`);
      await loadAnswerSheets();
      await dispatch(fetchExamById(examId));
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'OCR processing failed';
      setOcrMessage(`Error: ${msg}`);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleProcessSingleSheet = async (sheetId: string) => {
    try {
      await gradingService.processSheet(sheetId);
      await loadAnswerSheets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process sheet');
    }
  };

  const handleRunGrading = async () => {
    if (!examId) return;
    setIsGrading(true);
    setGradingMessage(null);
    try {
      const response = await gradingService.startGrading(examId);
      const result = response.data;
      setGradingMessage(`Grading started in background for ${result.sheets_queued} sheet(s). Status will update automatically.`);
      await loadAnswerSheets();
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Grading failed';
      setGradingMessage(`Error: ${msg}`);
    } finally {
      setIsGrading(false);
    }
  };

  const handleGradeSingleSheet = async (sheetId: string) => {
    try {
      await gradingService.gradeSheet(sheetId);
      await loadAnswerSheets();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to grade sheet');
    }
  };

  const handleViewEvaluation = async (sheet: AnswerSheet) => {
    try {
      // Fetch evaluation data and sheet with OCR text in parallel
      const [evalResponse, sheetResponse] = await Promise.all([
        gradingService.getEvaluation(sheet.id),
        gradingService.getAnswerSheet(sheet.id),
      ]);
      setSelectedEvaluation(evalResponse.data);
      setSelectedEvalSheet(sheetResponse.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to load evaluation');
    }
  };

  const handleExtractQuestionPaper = async () => {
    if (!examId) return;
    setIsExtractingQP(true);
    try {
      const response = await gradingService.extractQuestionPaperText(examId);
      const pages = response.data?.pages || [];
      const fullText = pages.map((p: any) => `--- Page ${p.page_number} ---\n${p.text}`).join('\n\n');
      setQpExtractedText(fullText || 'No text extracted');
      setShowQpModal(true);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to extract question paper text');
    } finally {
      setIsExtractingQP(false);
    }
  };

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
      await loadAnswerSheets();
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

  const getSheetStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      uploaded: 'bg-gray-100 text-gray-800',
      processing: 'bg-yellow-100 text-yellow-800',
      ocr_completed: 'bg-blue-100 text-blue-800',
      graded: 'bg-green-100 text-green-800',
      reviewed: 'bg-purple-100 text-purple-800',
      failed: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleViewOCR = async (sheetId: string) => {
    try {
      const response = await gradingService.getAnswerSheet(sheetId);
      setSelectedSheet(response.data);
    } catch {
      alert('Failed to load OCR results');
    }
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Question Paper</h2>
                {currentExam.question_paper && (
                  <button
                    onClick={handleExtractQuestionPaper}
                    disabled={isExtractingQP}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isExtractingQP ? 'Extracting...' : 'Extract Text (OCR)'}
                  </button>
                )}
              </div>
              <FileUploadZone
                label="Question Paper"
                accept=".pdf,.doc,.docx"
                onFileSelect={handleQuestionPaperUpload}
                currentFile={currentExam.question_paper}
                isUploading={uploadingQP}
                uploadProgress={qpProgress}
              />
              {/* Show previously extracted text */}
              {qpExtractedText && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Extracted Questions</h3>
                    <button
                      onClick={() => setShowQpModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Full Text
                    </button>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap border border-gray-200 text-gray-800 max-h-60 overflow-y-auto">
                    {qpExtractedText}
                  </pre>
                </div>
              )}
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
                <div className="flex space-x-2">
                  {answerSheets.length > 0 && (
                    <>
                    {answerSheets.some(s => s.status === 'graded' || s.status === 'reviewed') && (
                      <button
                        onClick={() => navigate(`/dashboard/exams/${examId}/review`)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center space-x-2"
                      >
                        <span>Review Grades</span>
                      </button>
                    )}
                    <button
                      onClick={handleRunOCR}
                      disabled={isProcessingOCR}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isProcessingOCR ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Run OCR</span>
                      )}
                    </button>
                    <button
                      onClick={handleRunGrading}
                      disabled={isGrading || !answerSheets.some(s => s.status === 'ocr_completed' || s.status === 'failed')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isGrading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Grading...</span>
                        </>
                      ) : (
                        <span>Run Grading</span>
                      )}
                    </button>
                    </>
                  )}
                  <button
                    onClick={() => setIsModelAnswerOpen(true)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                  >
                    Model Answers
                  </button>
                  <button 
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Bulk Upload
                  </button>
                </div>
              </div>

              {/* OCR Status Message */}
              {ocrMessage && (
                <div className={`mb-4 p-3 rounded-md text-sm ${ocrMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                  {ocrMessage}
                </div>
              )}

              {/* Grading Status Message */}
              {gradingMessage && (
                <div className={`mb-4 p-3 rounded-md text-sm ${gradingMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'}`}>
                  {gradingMessage}
                </div>
              )}

              {answerSheets.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {answerSheets.map((sheet, idx) => (
                        <tr key={sheet.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-mono text-xs truncate max-w-[200px]">
                            {sheet.original_file?.url?.split('/').pop() || 'Unknown'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSheetStatusColor(sheet.status)}`}>
                              {sheet.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {(sheet.status === 'graded' || sheet.status === 'reviewed') && sheet.score !== undefined ? (
                              <span className="font-semibold">{sheet.score}%</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {sheet.created_at ? new Date(sheet.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm space-x-2">
                            {sheet.status === 'uploaded' && (
                              <button
                                onClick={() => handleProcessSingleSheet(sheet.id)}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                Run OCR
                              </button>
                            )}
                            {sheet.status === 'ocr_completed' && (
                              <>
                                <button
                                  onClick={() => handleViewOCR(sheet.id)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  View Text
                                </button>
                                <button
                                  onClick={() => handleGradeSingleSheet(sheet.id)}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  Grade
                                </button>
                              </>
                            )}
                            {sheet.status === 'graded' && (
                              <>
                                <button
                                  onClick={() => handleViewOCR(sheet.id)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  View Text
                                </button>
                                <button
                                  onClick={() => handleViewEvaluation(sheet)}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  View Evaluation
                                </button>
                              </>
                            )}
                            {sheet.status === 'reviewed' && (
                              <>
                                <button
                                  onClick={() => handleViewOCR(sheet.id)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  View Text
                                </button>
                                <button
                                  onClick={() => handleViewEvaluation(sheet)}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  View Evaluation
                                </button>
                              </>
                            )}
                            {sheet.status === 'failed' && (
                              <button
                                onClick={() => handleProcessSingleSheet(sheet.id)}
                                className="text-orange-600 hover:text-orange-800 font-medium"
                              >
                                Retry
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (currentExam.statistics?.total_sheets || 0) > 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentExam.statistics?.total_sheets || 0}
                  </h3>
                  <p className="text-gray-600">Answer sheets uploaded</p>
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
                {currentExam.statistics?.highest_score !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Highest Score</label>
                    <p className="mt-1 text-2xl font-bold text-green-600">
                      {currentExam.statistics.highest_score.toFixed(1)}%
                    </p>
                  </div>
                )}
                {currentExam.statistics?.lowest_score !== undefined && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Lowest Score</label>
                    <p className="mt-1 text-2xl font-bold text-red-600">
                      {currentExam.statistics.lowest_score.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Grading Configuration */}
            {examId && (
              <GradingConfigPanel examId={examId} onUpdated={() => dispatch(fetchExamById(examId))} />
            )}

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

      {/* OCR Result Viewer Modal */}
      {selectedSheet && !selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">OCR Extracted Text</h3>
              <button
                onClick={() => setSelectedSheet(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {selectedSheet.ocr_results && selectedSheet.ocr_results.length > 0 ? (
                selectedSheet.ocr_results.map((ocr, idx) => (
                  <div key={idx} className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Page {ocr.page_number}</span>
                      <span className="text-xs text-gray-500">
                        Confidence: {(ocr.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <pre className="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap border border-gray-200">
                      {ocr.text || 'No text extracted'}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No OCR results available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Model Answer Modal */}
      {examId && isModelAnswerOpen && (
        <ModelAnswerModal
          examId={examId}
          existingAnswers={currentExam.model_answer?.parsed_answers}
          maxMarks={currentExam.max_marks || 100}
          onClose={() => setIsModelAnswerOpen(false)}
          onSaved={() => {
            setIsModelAnswerOpen(false);
            dispatch(fetchExamById(examId));
          }}
        />
      )}

      {/* Evaluation Modal */}
      {selectedEvaluation && selectedEvalSheet && (
        <EvaluationModal
          evaluation={selectedEvaluation}
          ocrText={selectedEvalSheet.ocr_results?.map(r => r.text).join('\n\n') || ''}
          onClose={() => {
            setSelectedEvaluation(null);
            setSelectedEvalSheet(null);
          }}
        />
      )}

      {/* Question Paper Extracted Text Modal */}
      {showQpModal && qpExtractedText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Question Paper - Extracted Text</h3>
              <button
                onClick={() => setShowQpModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="bg-gray-50 p-4 rounded-md text-sm whitespace-pre-wrap border border-gray-200 text-gray-800">
                {qpExtractedText}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamDetailsPage;
