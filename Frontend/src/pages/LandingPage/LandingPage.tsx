import React, { useState, useEffect, useRef } from 'react';
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

  const socketRef = useRef<WebSocket>(null)
  const receiptsRef = useRef<Receipt[]>([])

  useEffect(() => {
    receiptsRef.current = receipts
  }, [receipts])

  useEffect(() => {
    const WSS_URL = 'wss://bdoyue9pj6.execute-api.us-west-1.amazonaws.com/dev/'
    socketRef.current = new WebSocket(WSS_URL)

    socketRef.current.onopen = () => {
      console.log("WebSocket Connected");
    };


    socketRef.current.onmessage = async (response) => {
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
      const data = JSON.parse(response.data);

      // check event action
      if (data.type === 'presignedUrls') {
        await uploadToS3(data.file_urls, data.connectionId)
      } else if (data.type === 'extractText') {
        console.log(data)
        handleExtractedText()
      }

    } 
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  const generatePresignedUrls = async (): Promise<PresignedUrlResponse | undefined> => {


    // Construct request body
    const fileList: FileData[] = receipts.map(receipt => ({
      name: receipt.file.name,
      type: receipt.file.type,
      size: receipt.file.size,
    }));

    const requestPayload = {
      action: 'getPresignedUrl',
      files: fileList,
    };

    try {
      // verify socket open
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        console.error("Socket is not connected.");
        return;
      }
      socketRef.current.send(JSON.stringify(requestPayload))
      console.log("Sent request")


    } catch (error) {
        console.error('Error generating presigned URLs:', error);
      return undefined;
    }
  };

  const uploadToS3 = async (presignedUrls: { [name: string]: string }, connectionId: string) => {
    const currentReceipts = receiptsRef.current
    const uploadPromises = currentReceipts.map(async (receipt) => {
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
            "x-amz-meta-connectionId": connectionId,
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

  // TODO: delete this after integrating real data
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
          name: `Item ${index + 1}A`,
          quantity: 2,
          price: 10.00,
          total: 20.00,
        },
        {
          name: `Item ${index + 1}B`,
          quantity: 1,
          price: 15.50 + (index * 10),
          total: 15.50 + (index * 10),
        },
      ],
    }));
  };

  const handleExtractedText = () => {
    
  }

  const handleSubmit = async () => {
    if (receipts.length === 0 || isUploading) return;

    setIsUploading(true);
    setCurrentStep(1); // Move to "Extract Text"

    try {
      // Step 1: Generate presigned URLs
      generatePresignedUrls();

      const extractedData = generateMockData();
      setExtractedData(extractedData);
      setCurrentStep(3); // Move to "Instant Results"
      setShowResults(true); // Switch to results page
      setIsUploading(false);

    } catch (error) {
      console.error('Upload process failed:', error);
      setIsUploading(false);
    }
  };

  const handleBackToUpload = () => {
    setShowResults(false);
    setCurrentStep(0);
    // Optionally clear receipts and data
    setReceipts([]);
    setExtractedData([]);
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
        </>
      ) : (
        <>
          {/* Results Page */}
          <ResultsSection
            receipts={receipts}
            extractedData={extractedData}
            onBackToUpload={handleBackToUpload}
          />
        </>
      )}
      <Footer/>
    </div>
  );
};

export default LandingPage;
