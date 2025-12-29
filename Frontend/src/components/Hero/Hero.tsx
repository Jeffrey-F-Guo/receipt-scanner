import React, { useState, useRef } from 'react';

interface HeroProps {
  onFileUpload?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onFileUpload }) => {
  const [, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    if (onFileUpload) {
      onFileUpload();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
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
            Easily upload your receipt and let our
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
          <div
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative bg-gray-100 rounded-2xl overflow-hidden cursor-pointer
              transition-all duration-300
              ${isDragging ? 'border-4 border-black bg-gray-200' : 'border-2 border-transparent'}
              ${previewUrl ? 'h-[500px]' : 'h-[400px]'}
              flex items-center justify-center
              hover:bg-gray-200
            `}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center">
                <div className="text-8xl font-light text-gray-300 mb-4">Upload</div>
                <p className="text-gray-400">Click or drag and drop your receipt here</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
