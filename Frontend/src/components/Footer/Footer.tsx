import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
          <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
          <div className="w-3 h-3 bg-gray-300" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
        </div>
        <a href="#how-it-works" className="text-gray-400 hover:text-black transition-colors text-sm">
          How It Works
        </a>
      </div>
    </footer>
  );
};

export default Footer;
