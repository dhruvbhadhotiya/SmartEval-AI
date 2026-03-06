import React from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';

import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName,
}) => {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-auto p-4">
            <Worker workerUrl={`https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js`}>
              <div style={{ height: '750px' }}>
                <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
              </div>
            </Worker>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;
