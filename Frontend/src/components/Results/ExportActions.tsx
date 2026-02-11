import React from 'react';
import { type ExtractedData } from '../../types/receipt';

interface ExportActionsProps {
  data: ExtractedData[];
  selectedIndex: number;
}

const ExportActions: React.FC<ExportActionsProps> = ({ data, selectedIndex }) => {
  const exportToCSV = (allReceipts: boolean = false) => {
    const receiptsToExport = allReceipts ? data : [data[selectedIndex]];

    let csvContent = 'Merchant,Date,Subtotal,Tax,Total,Item,Quantity,Price,Item Total\n';

    receiptsToExport.forEach(receipt => {
      if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach(item => {
          csvContent += `"${receipt.merchant}","${receipt.date}",${receipt.subtotal || 0},${receipt.tax || 0},${receipt.total},"${item.name}",${item.price}\n`;
        });
      } else {
        csvContent += `"${receipt.merchant}","${receipt.date}",${receipt.subtotal || 0},${receipt.tax || 0},${receipt.total},"","","",""\n`;
      }
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = allReceipts ? 'all_receipts.csv' : `receipt_${selectedIndex + 1}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (allReceipts: boolean = false) => {
    const receiptsToExport = allReceipts ? data : [data[selectedIndex]];
    const jsonContent = JSON.stringify(receiptsToExport, null, 2);

    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = allReceipts ? 'all_receipts.json' : `receipt_${selectedIndex + 1}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const receipt = data[selectedIndex];
    const text = `
Merchant: ${receipt.merchant}
Date: ${receipt.date}
Subtotal: $${receipt.subtotal?.toFixed(2) || '0.00'}
Tax: $${receipt.tax?.toFixed(2) || '0.00'}
Total: $${receipt.total.toFixed(2)}

Items:
${receipt.items.map(item => `${item.name} - Pice: $${item.price.toFixed(2)}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="border-t border-gray-200 pt-6 mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => exportToCSV(false)}
          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg
                     hover:border-gray-400 transition-colors font-medium text-sm
                     flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>

        <button
          onClick={() => exportToJSON(false)}
          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg
                     hover:border-gray-400 transition-colors font-medium text-sm
                     flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
          </svg>
          Export JSON
        </button>

        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-white border-2 border-gray-300 rounded-lg
                     hover:border-gray-400 transition-colors font-medium text-sm
                     flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>

        {data.length > 1 && (
          <>
            <div className="flex-grow" />
            <button
              onClick={() => exportToCSV(true)}
              className="px-4 py-2 bg-black text-white rounded-lg
                         hover:bg-gray-800 transition-colors font-medium text-sm
                         flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export All ({data.length}) as CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ExportActions;
