import React, { useState, useEffect, useRef } from 'react';
import { type Receipt } from '../Hero/Hero';
import { type ExtractedData } from '../../types/receipt';
import ReceiptTabs from './ReceiptTabs';
import ReceiptViewer from './ReceiptViewer';
import ExportActions from './ExportActions';

interface ResultsSectionProps {
  receipts: Receipt[];
  extractedData: ExtractedData[];
  onBackToUpload?: () => void;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ receipts, extractedData, onBackToUpload }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (extractedData.length > 0 && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [extractedData.length]);

  if (extractedData.length === 0) {
    return null;
  }

  const receiptTabsData = receipts.map((receipt, index) => ({
    id: receipt.id,
    name: receipt.file.name,
  }));

  const currentReceipt = receipts[selectedIndex];
  const currentData = extractedData[selectedIndex];

  return (
    <div ref={sectionRef} className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Back Button */}
        {onBackToUpload && (
          <div className="mb-8">
            <button
              onClick={onBackToUpload}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-300
                         rounded-full hover:border-black hover:bg-gray-50 transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Upload
            </button>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-2">Extracted Results</h2>
          <p className="text-gray-600">Review and export your receipt data</p>
        </div>

        {/* Tabs */}
        {receipts.length > 1 && (
          <ReceiptTabs
            receipts={receiptTabsData}
            selectedIndex={selectedIndex}
            onSelectTab={setSelectedIndex}
          />
        )}

        {/* Main Content */}
        <div className="mt-8">
          <ReceiptViewer
            receiptImage={currentReceipt.previewUrl}
            isPdf={currentReceipt.isPdf}
            fileName={currentReceipt.file.name}
            data={currentData}
          />

          {/* Export Actions */}
          <ExportActions data={extractedData} selectedIndex={selectedIndex} />
        </div>
      </div>
    </div>
  );
};

export default ResultsSection;
