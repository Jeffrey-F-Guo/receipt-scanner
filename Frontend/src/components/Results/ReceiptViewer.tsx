import React, { useState } from 'react';
import { type ExtractedData } from '../../types/receipt';
import DataTable from './DataTable';

interface ReceiptViewerProps {
  receiptImage: string;
  isPdf?: boolean;
  fileName: string;
  data: ExtractedData;
}

const ReceiptViewer: React.FC<ReceiptViewerProps> = ({ receiptImage, isPdf, fileName, data }) => {
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Receipt Image - 40% */}
        <div className="lg:col-span-2">
          <div className="sticky top-24">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Receipt Preview</h3>
              <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                {isPdf ? (
                  <div className="aspect-[3/4] flex flex-col items-center justify-center p-8">
                    <svg className="w-24 h-24 text-gray-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                      <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="2" />
                      <text x="7" y="17" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                    </svg>
                    <p className="text-sm text-gray-600 text-center">{fileName}</p>
                  </div>
                ) : (
                  <img
                    src={receiptImage}
                    alt="Receipt"
                    className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowFullImage(true)}
                  />
                )}
              </div>
              {!isPdf && (
                <button
                  onClick={() => setShowFullImage(true)}
                  className="mt-3 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg
                             text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  View Full Size
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table - 60% */}
        <div className="lg:col-span-3">
          <DataTable data={data} />
        </div>
      </div>

      {/* Full Size Image Modal */}
      {showFullImage && !isPdf && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setShowFullImage(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={receiptImage}
            alt="Receipt Full Size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default ReceiptViewer;
