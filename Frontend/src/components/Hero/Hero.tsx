import React, { useState, useRef } from 'react';
import heic2any from 'heic2any';

export interface Receipt {
  id: string;
  file: File;
  previewUrl: string;
  isPdf?: boolean;
}

interface HeroProps {
  onSubmit?: () => void;
  receipts: Receipt[];
  setReceipts: React.Dispatch<React.SetStateAction<Receipt[]>>;
  isUploading?: boolean;
}

const MAX_RECEIPTS = 10;
const CONVERSION_SUFFIX = 'jpg';

const Hero: React.FC<HeroProps> = ({ onSubmit, receipts, setReceipts, isUploading = false }) => {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);
  const canAddMore = receipts.length < MAX_RECEIPTS && !isUploading && !isConverting;

  const convertHEIC = async (heicFiles: File[]): Promise<File[]> => {
    const convertedFiles: File[] = [];
    for (const file of heicFiles) {
      try {
        const converted = await heic2any({ blob: file });
        const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

        const newFileName = file.name.replace(/\.heic$/i, `.${CONVERSION_SUFFIX}`);
        const newFile = new File([convertedBlob], newFileName, { type: 'image/jpeg' });
        convertedFiles.push(newFile);
      } catch (error) {
        console.error(`Error converting ${file.name}:`, error);
      }
    }
    return convertedFiles;
  };

  const handleFileSelect = async (files: FileList | File[]) => {
    const filesArray = Array.from(files);
    const remainingSlots = MAX_RECEIPTS - receipts.length;
    const filesToAdd = filesArray.slice(0, remainingSlots);

    const heicFiles: File[] = [];
    const validFiles: Receipt[] = [];

    for (const file of filesToAdd) {
      const isHEIC = file.name.toLowerCase().endsWith('.heic');
      const isPDF = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      // Check for duplicates
      const isDuplicate = receipts.some(r => {
        if (isHEIC) {
          const convertedName = file.name.replace(/\.heic$/i, `.${CONVERSION_SUFFIX}`);
          return r.file.name === convertedName || r.file.name === file.name;
        }
        return r.file.name === file.name;
      });

      if (isDuplicate) {
        console.log(`Skipping duplicate file: ${file.name}`);
        continue;
      }

      if (isHEIC) {
        heicFiles.push(file);
      } else if (isImage || isPDF) {
        const newReceipt: Receipt = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          previewUrl: isPDF ? '' : URL.createObjectURL(file),
          isPdf: isPDF,
        };
        validFiles.push(newReceipt);
      }
    }

    // Add valid files immediately
    if (validFiles.length > 0) {
      setReceipts(prev => [...prev, ...validFiles]);
      if (!selectedReceiptId) {
        setSelectedReceiptId(validFiles[0].id);
      }
    }

    // Handle HEIC conversion
    if (heicFiles.length > 0) {
      setIsConverting(true);
      const convertedFiles = await convertHEIC(heicFiles);
      const convertedReceipts: Receipt[] = convertedFiles.map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isPdf: false,
      }));

      setReceipts(prev => [...prev, ...convertedReceipts]);
      if (!selectedReceiptId && convertedReceipts.length > 0) {
        setSelectedReceiptId(convertedReceipts[0].id);
      }
      setIsConverting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canAddMore) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (canAddMore && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (canAddMore) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveReceipt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReceipts(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (selectedReceiptId === id && updated.length > 0) {
        setSelectedReceiptId(updated[0].id);
      } else if (updated.length === 0) {
        setSelectedReceiptId(null);
      }
      return updated;
    });
  };

  const handleSelectReceipt = (id: string) => {
    setSelectedReceiptId(id);
  };

  const handleSubmit = () => {
    if (receipts.length > 0 && onSubmit) {
      onSubmit();
    }
  };

  const handleClearAll = () => {
    receipts.forEach(receipt => URL.revokeObjectURL(receipt.previewUrl));
    setReceipts([]);
    setSelectedReceiptId(null);
  };

  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto px-6 py-20">
        {/* Hero Text */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-7xl font-bold mb-4">
            Scan Receipt.
          </h1>
          <p className="text-4xl md:text-5xl text-gray-400 font-light">
            Upload, capture, extract.
          </p>
        </div>

        {/* Description */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-xl text-black font-medium mb-2">
            Easily upload your receipts and let our
          </p>
          <p className="text-xl text-black font-medium mb-2">
            tool scan and extract details instantly.
          </p>
          <p className="text-xl text-gray-400">
            View extracted text and a structured
          </p>
          <p className="text-xl text-gray-400">
            breakdown in a table below.
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-4xl mx-auto">
          {/* Receipt Counter */}
          {receipts.length > 0 && (
            <div className="mb-4 text-center">
              <span className="text-sm font-medium text-gray-600">
                {receipts.length} / {MAX_RECEIPTS} receipts
              </span>
              {receipts.length >= MAX_RECEIPTS && (
                <span className="ml-2 text-sm text-red-500">Maximum reached</span>
              )}
            </div>
          )}

          {/* Main Preview Area */}
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative bg-gray-100 rounded-2xl overflow-hidden
              transition-all duration-300
              ${isDragging ? 'border-4 border-black bg-gray-200' : 'border-2 border-transparent'}
              ${selectedReceipt ? 'h-[500px]' : 'h-[400px]'}
              flex items-center justify-center
              ${canAddMore ? 'cursor-pointer hover:bg-gray-200' : 'cursor-not-allowed opacity-75'}
            `}
          >
            {selectedReceipt ? (
              selectedReceipt.isPdf ? (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-32 h-32 mb-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="2" />
                    <text x="7" y="17" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                  </svg>
                  <p className="text-lg font-medium">{selectedReceipt.file.name}</p>
                  <p className="text-sm mt-1">
                    {(selectedReceipt.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <img
                  src={selectedReceipt.previewUrl}
                  alt="Receipt preview"
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div className="text-center">
                <div className="text-8xl font-light text-gray-300 mb-4">
                  {isConverting ? 'Converting...' : 'Upload'}
                </div>
                <p className="text-gray-400">
                  {isConverting
                    ? 'Converting HEIC files to JPG...'
                    : 'Click or drag and drop your receipts here'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Up to {MAX_RECEIPTS} receipts (Images, PDFs, HEIC)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.heic"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Horizontal Thumbnail Strip */}
          {receipts.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-4 overflow-x-auto pb-4">
                {receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    onClick={() => handleSelectReceipt(receipt.id)}
                    className={`
                      relative flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden cursor-pointer
                      transition-all duration-200
                      ${selectedReceiptId === receipt.id
                        ? 'ring-4 ring-black scale-105'
                        : 'ring-2 ring-gray-300 hover:ring-gray-400'
                      }
                    `}
                  >
                    {receipt.isPdf ? (
                      <div className="w-full h-full bg-gray-200 flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                          <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="2" />
                          <text x="7" y="17" fontSize="4" fill="white" fontWeight="bold">PDF</text>
                        </svg>
                        <p className="text-xs text-gray-600 mt-1 px-1 text-center truncate w-full">
                          {receipt.file.name}
                        </p>
                      </div>
                    ) : (
                      <img
                        src={receipt.previewUrl}
                        alt={`Receipt ${receipt.id}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {/* Remove button */}
                    <button
                      onClick={(e) => handleRemoveReceipt(receipt.id, e)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black bg-opacity-75 hover:bg-opacity-100
                                 rounded-full flex items-center justify-center transition-all"
                    >
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                ))}

                {/* Add More button */}
                {canAddMore && (
                  <button
                    onClick={handleClick}
                    className="flex-shrink-0 w-24 h-32 rounded-lg border-2 border-dashed border-gray-300
                               hover:border-black hover:bg-gray-50 transition-all
                               flex items-center justify-center cursor-pointer"
                  >
                    <div className="text-center">
                      <svg
                        className="w-8 h-8 text-gray-400 mx-auto mb-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span className="text-xs text-gray-500">Add More</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={handleClearAll}
                  disabled={isUploading}
                  className={`
                    px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-full
                    font-medium transition-all
                    ${isUploading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-gray-400 hover:bg-gray-50'
                    }
                  `}
                >
                  Clear All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className={`
                    px-8 py-3 bg-black text-white rounded-full
                    font-medium text-lg shadow-lg
                    flex items-center gap-2 transition-all
                    ${isUploading
                      ? 'opacity-75 cursor-wait'
                      : 'hover:bg-gray-800 hover:shadow-xl'
                    }
                  `}
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Scan {receipts.length} {receipts.length === 1 ? 'Receipt' : 'Receipts'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Hero;
