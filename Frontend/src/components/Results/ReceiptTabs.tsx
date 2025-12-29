import React from 'react';

interface ReceiptTabsProps {
  receipts: { id: string; name: string }[];
  selectedIndex: number;
  onSelectTab: (index: number) => void;
}

const ReceiptTabs: React.FC<ReceiptTabsProps> = ({ receipts, selectedIndex, onSelectTab }) => {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide">
          {receipts.map((receipt, index) => (
            <button
              key={receipt.id}
              onClick={() => onSelectTab(index)}
              className={`
                px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all
                ${selectedIndex === index
                  ? 'bg-black text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {receipt.name || `Receipt ${index + 1}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReceiptTabs;
