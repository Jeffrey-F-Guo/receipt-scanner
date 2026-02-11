import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div className="flex items-start">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <div className="w-3 h-3 bg-gray-300" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}></div>
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="font-semibold text-black mb-4">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-400 hover:text-black transition-colors text-sm">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-black transition-colors text-sm">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="text-gray-400 hover:text-black transition-colors text-sm">
                  FAQ
                </a>
              </li>
            </ul>
          </div>


          {/* Resources Column */}
          <div>
            <h4 className="font-semibold text-black mb-4">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="#help" className="text-gray-400 hover:text-black transition-colors text-sm">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#blog" className="text-gray-400 hover:text-black transition-colors text-sm">
                  Blog
                </a>
              </li>
              <li>
                <a href="#privacy" className="text-gray-400 hover:text-black transition-colors text-sm">
                  Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
