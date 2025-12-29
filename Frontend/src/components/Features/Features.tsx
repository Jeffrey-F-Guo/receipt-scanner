import React, { useState, useEffect } from 'react';

interface Step {
  title: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface FeaturesProps {
  currentStep?: number;
}

const Features: React.FC<FeaturesProps> = ({ currentStep = 0 }) => {
  const [progress, setProgress] = useState(0);

  const steps: Step[] = [
    {
      title: 'Upload Image',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      completed: currentStep > 0,
    },
    {
      title: 'Extract Text',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      completed: currentStep > 1,
    },
    {
      title: 'View Table',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      completed: currentStep > 2,
    },
    {
      title: 'Instant Results',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      completed: currentStep > 3,
    },
  ];

  useEffect(() => {
    setProgress((currentStep / steps.length) * 100);
  }, [currentStep, steps.length]);

  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative">
          {/* Progress bar background */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-gray-200 mx-12">
            {/* Progress bar fill */}
            <div
              className="h-full bg-black transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                {/* Icon circle */}
                <div
                  className={`
                    w-16 h-16 rounded-full flex items-center justify-center mb-4 z-10
                    border-2 transition-all duration-300
                    ${step.completed || index < currentStep
                      ? 'bg-black border-black text-white'
                      : index === currentStep
                      ? 'bg-black border-black text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                    }
                  `}
                >
                  {step.icon}
                </div>

                {/* Step title */}
                <h3
                  className={`
                    text-lg font-medium transition-colors
                    ${step.completed || index <= currentStep ? 'text-black' : 'text-gray-400'}
                  `}
                >
                  {step.title}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;
