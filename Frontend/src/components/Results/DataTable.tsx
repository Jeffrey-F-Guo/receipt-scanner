import React from 'react';
import { type ExtractedData } from '../../types/receipt';
import { formatMoney } from '../../lib/receipt';

interface DataTableProps {
  data: ExtractedData;
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  if (data.error) {
    return (
      <div role="alert" className="bg-white border border-red-200 rounded-lg p-6">
        <p className="font-semibold text-red-700 mb-1">Couldn't extract this receipt</p>
        <p className="text-sm text-gray-600">{data.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Merchant</p>
          <p className="text-lg font-semibold">{data.merchant || 'Unknown'}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Date</p>
          <p className="text-lg font-semibold">{data.date || 'N/A'}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-lg">
          <p className="text-sm text-gray-500 mb-1">Subtotal</p>
          <p className="text-lg font-semibold">{formatMoney(data.subtotal)}</p>
        </div>
        <div className="bg-black text-white p-4 rounded-lg">
          <p className="text-sm text-gray-300 mb-1">Total</p>
          <p className="text-xl font-bold">{formatMoney(data.total)}</p>
        </div>
      </div>

      {/* Additional Info */}
      {(data.tax !== undefined || data.paymentMethod) && (
        <div className="grid grid-cols-2 gap-4">
          {data.tax !== undefined && (
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Tax</p>
              <p className="font-medium">{formatMoney(data.tax)}</p>
            </div>
          )}
          {data.paymentMethod && (
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-medium">{data.paymentMethod}</p>
            </div>
          )}
        </div>
      )}

      {/* Line Items Table */}
      {data.items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-900">{item.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {formatMoney(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
