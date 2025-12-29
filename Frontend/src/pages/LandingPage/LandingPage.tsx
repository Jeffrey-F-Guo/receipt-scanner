import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import Hero from '../../components/Hero/Hero';
import Features from '../../components/Features/Features';
import Footer from '../../components/Footer/Footer';

const LandingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleFileUpload = () => {
    setCurrentStep(1);
    // Simulate processing steps
    setTimeout(() => setCurrentStep(2), 1000);
    setTimeout(() => setCurrentStep(3), 2000);
    setTimeout(() => setCurrentStep(4), 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero onFileUpload={handleFileUpload} />
      <Features currentStep={currentStep} />
      <Footer />
    </div>
  );
};

export default LandingPage;
