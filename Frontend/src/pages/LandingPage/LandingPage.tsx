import React, { useState } from 'react';
import Header from '../../components/Header/Header';
import Hero, { type Receipt } from '../../components/Hero/Hero';
import Features from '../../components/Features/Features';
import Footer from '../../components/Footer/Footer';
import ResultsSection from '../../components/Results/ResultsSection';
import { type ExtractedData } from '../../types/receipt';

interface FileData {
  name: string;
  type: string;
  size: number;
}

type PresignedUrlResponse =
  | { file_urls: { [name: string]: string } }
  | { error: string };

const LandingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData[]>([]);
  const [showResults, setShowResults] = useState(false);

  const generatePresignedUrls = async (): Promise<PresignedUrlResponse | undefined> => {
    // Construct request body
    const fileList: FileData[] = receipts.map(receipt => ({
      name: receipt.file.name,
      type: receipt.file.type,
      size: receipt.file.size,
    }));

    const requestPayload = {
      files: fileList,
    };

    try {
      // Request presigned urls from lambda function
      const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;
      const response = await fetch(lambdaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        return undefined;
      }

      const responseJson = await response.json();
      console.log('Lambda response:', responseJson);
      const parsedBody = JSON.parse(responseJson.body);

      return parsedBody;
    } catch (error) {
      console.error('Error generating presigned URLs:', error);
      return undefined;
    }
  };

  const uploadToS3 = async (presignedUrls: { [name: string]: string }) => {
    const uploadPromises = receipts.map(async (receipt) => {
      const presignedUrl = presignedUrls[receipt.file.name];
      if (!presignedUrl) {
        console.error(`No presigned URL for ${receipt.file.name}`);
        return;
      }

      try {
        const response = await fetch(presignedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': receipt.file.type,
          },
          body: receipt.file,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${receipt.file.name}`);
        }

        console.log(`Successfully uploaded ${receipt.file.name}`);
      } catch (error) {
        console.error(`Error uploading ${receipt.file.name}:`, error);
        throw error;
      }
    });

    await Promise.all(uploadPromises);
  };

  const generateMockData = (): ExtractedData[] => {
    // Generate mock extracted data for each receipt
    return receipts.map((receipt, index) => ({
      receiptId: receipt.id,
      merchant: `Store ${index + 1}`,
      date: new Date().toISOString().split('T')[0],
      subtotal: 35.50 + (index * 10),
      tax: 3.55 + index,
      total: 39.05 + (index * 11),
      paymentMethod: 'Credit Card',
      items: [
        {
          description: `Item ${index + 1}A`,
          quantity: 2,
          price: 10.00,
          total: 20.00,
        },
        {
          description: `Item ${index + 1}B`,
          quantity: 1,
          price: 15.50 + (index * 10),
          total: 15.50 + (index * 10),
        },
      ],
    }));
  };

  const handleSubmit = async () => {
    if (receipts.length === 0 || isUploading) return;

    setIsUploading(true);
    setCurrentStep(1); // Move to "Extract Text"

    try {
      // Step 1: Generate presigned URLs
      const response = await generatePresignedUrls();

      if (!response) {
        console.error('Failed to generate presigned URLs');
        setIsUploading(false);
        return;
      }

      if ('error' in response) {
        console.error('Error from Lambda:', response.error);
        setIsUploading(false);
        return;
      }

      // Step 2: Upload to S3
      await uploadToS3(response.file_urls);
      setCurrentStep(2); // Move to "View Table"

      // Step 3: Generate mock data and show results
      setTimeout(() => {
        const mockData = generateMockData();
        setExtractedData(mockData);
        setCurrentStep(3); // Move to "Instant Results"
        setShowResults(true); // Switch to results page
        setIsUploading(false);
      }, 2000);

    } catch (error) {
      console.error('Upload process failed:', error);
      setIsUploading(false);
    }
  };

  const handleBackToUpload = () => {
    setShowResults(false);
    setCurrentStep(0);
    // Optionally clear receipts and data
    // setReceipts([]);
    // setExtractedData([]);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {!showResults ? (
        <>
          {/* Upload Page */}
          <Hero
            onSubmit={handleSubmit}
            receipts={receipts}
            setReceipts={setReceipts}
            isUploading={isUploading}
          />
          <Features currentStep={currentStep} />
          <Footer />
        </>
      ) : (
        <>
          {/* Results Page */}
          <ResultsSection
            receipts={receipts}
            extractedData={extractedData}
            onBackToUpload={handleBackToUpload}
          />
          <Footer />
        </>
      )}
    </div>
  );
};

export default LandingPage;
