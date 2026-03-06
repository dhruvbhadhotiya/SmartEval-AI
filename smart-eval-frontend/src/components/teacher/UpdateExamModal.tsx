import { useState, useEffect } from 'react';
import { useAppDispatch } from '../../app/hooks';
import { updateExam } from '../../features/exams/examsSlice';
import { Exam } from '../../services/examService';

interface UpdateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
}

const UpdateExamModal: React.FC<UpdateExamModalProps> = ({ isOpen, onClose, exam }) => {
  const dispatch = useAppDispatch();
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    exam_date: '',
    max_marks: 100,
    duration_minutes: 180,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-populate form when exam changes
  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title,
        subject: exam.subject,
        exam_date: exam.exam_date ? exam.exam_date.split('T')[0] : '', // Extract date part
        max_marks: exam.max_marks || 100,
        duration_minutes: exam.duration_minutes || 180,
      });
    }
  }, [exam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'max_marks' || name === 'duration_minutes' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;

    setIsSubmitting(true);

    try {
      // Prepare data
      const submitData = {
        ...formData,
        exam_date: formData.exam_date || null,
      };
      console.log('Updating exam with data:', submitData);
      await dispatch(updateExam({ examId: exam.id, data: submitData })).unwrap();
      onClose();
    } catch (error) {
      console.error('Failed to update exam:', error);
      alert('Failed to update exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !exam) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Update Exam
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Midterm Exam - Computer Science"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., Data Structures"
                  />
                </div>

                <div>
                  <label htmlFor="exam_date" className="block text-sm font-medium text-gray-700">
                    Exam Date *
                  </label>
                  <input
                    type="date"
                    name="exam_date"
                    id="exam_date"
                    required
                    value={formData.exam_date}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="max_marks" className="block text-sm font-medium text-gray-700">
                      Max Marks *
                    </label>
                    <input
                      type="number"
                      name="max_marks"
                      id="max_marks"
                      required
                      min="1"
                      value={formData.max_marks}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">
                      Duration (mins) *
                    </label>
                    <input
                      type="number"
                      name="duration_minutes"
                      id="duration_minutes"
                      required
                      min="1"
                      value={formData.duration_minutes}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Updating...' : 'Update Exam'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateExamModal;
