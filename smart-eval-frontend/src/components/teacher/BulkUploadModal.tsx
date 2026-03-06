import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Filter for PDF files only
    const pdfFiles = acceptedFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length !== acceptedFiles.length) {
      alert(`${acceptedFiles.length - pdfFiles.length} non-PDF file(s) were filtered out`);
    }
    
    setSelectedFiles(prev => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress (in reality, this would come from axios onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      await onUpload(selectedFiles);
      setUploadProgress(100);
      clearInterval(progressInterval);
      
      // Reset and close on success
      setTimeout(() => {
        setSelectedFiles([]);
        setUploadProgress(0);
        setIsUploading(false);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      alert('Failed to upload answer sheets. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={!isUploading ? onClose : undefined}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Bulk Upload Answer Sheets</h3>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} />
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop the files here...' : 'Click to upload or drag and drop'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDF files only • Up to 50 files at once
              </p>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-blue-900">
                    Uploading {selectedFiles.length} file(s)...
                  </p>
                  <p className="text-sm font-medium text-blue-900">{uploadProgress}%</p>
                </div>
                <div className="bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Selected Files ({selectedFiles.length})
                </h4>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="ml-4 text-red-600 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} file(s) selected`
                : 'No files selected'}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? `Uploading...` : `Upload ${selectedFiles.length} File(s)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
