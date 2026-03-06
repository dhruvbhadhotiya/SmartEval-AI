import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import PDFPreviewModal from './PDFPreviewModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

interface FileUploadZoneProps {
  label: string;
  accept: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  currentFile?: {
    file_url: string;
    uploaded_at: string;
    file_size: number;
  };
  isUploading?: boolean;
  uploadProgress?: number;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  label,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  currentFile,
  isUploading = false,
  uploadProgress = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file size
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      setError(`File size must be less than ${maxMB}MB`);
      return false;
    }

    // Check file type
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type;

    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return fileExtension === type;
      }
      return fileType.match(new RegExp(type.replace('*', '.*')));
    });

    if (!isValidType) {
      setError(`Invalid file type. Accepted: ${accept}`);
      return false;
    }

    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {currentFile && !isUploading ? (
        /* Show uploaded file */
        <div className="border-2 border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {label} uploaded successfully
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatFileSize(currentFile.file_size)} • Uploaded on {formatDate(currentFile.uploaded_at)}
                </p>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPreview(true);
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View
              </button>
              <button
                onClick={handleClick}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload zone */
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isUploading ? (
            /* Upload progress */
            <div>
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm font-medium text-gray-700">Uploading {label}...</p>
              <div className="mt-4 max-w-xs mx-auto">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-xs text-gray-600">{uploadProgress}%</p>
              </div>
            </div>
          ) : (
            /* Upload prompt */
            <div>
              <svg
                className={`mx-auto h-12 w-12 ${error ? 'text-red-400' : 'text-gray-400'}`}
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
              <p className={`mt-2 text-sm ${error ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                {error || (
                  <>
                    <span className="font-medium">Click to upload</span> or drag and drop
                  </>
                )}
              </p>
              {!error && (
                <p className="mt-1 text-xs text-gray-500">
                  {accept.replace(/,/g, ', ')} (max {formatFileSize(maxSize)})
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      {currentFile && (
        <PDFPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          fileUrl={`${API_BASE_URL}${currentFile.file_url}`}
          fileName={label}
        />
      )}
    </div>
  );
};

export default FileUploadZone;
