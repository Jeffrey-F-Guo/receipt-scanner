import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-black rounded-sm"></div>
              <div className="w-3 h-3 bg-black rounded-full"></div>
              <div className="w-3 h-3 bg-black" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-black transition-colors text-sm">
              Features
            </a>
            <a href="#how-it-works" className="text-gray-600 hover:text-black transition-colors text-sm">
              How It Works
            </a>
            <a href="#faq" className="text-gray-600 hover:text-black transition-colors text-sm">
              FAQ
            </a>
          </nav>

          {/* CTA Button */}
          <button className="bg-black text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors text-sm font-medium">
            Try App
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
