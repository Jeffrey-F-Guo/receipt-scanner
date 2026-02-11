import React, { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header/Header';
import Hero, { type Receipt } from '../../components/Hero/Hero';
import Features from '../../components/Features/Features';
import Footer from '../../components/Footer/Footer';
import ResultsSection from '../../components/Results/ResultsSection';
import { type ExtractedData, } from '../../types/receipt';

interface FileData {
  id: string,
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
    console.log('Extracted Data:', extractedData);
  }, [extractedData])

  useEffect(() => {
    const WSS_URL = import.meta.env.VITE_SOCKET_GATEWAY_URL
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
        console.log(data.body.data)
        console.log('aadfasd')
        handleExtractedText(data.body.data, data.fileId)
        console.log('mmmmd')
        // const mockData = generateMockData()
        // setExtractedData(mockData);
        // setCurrentStep(3); // Move to "Instant Results"
        // setShowResults(true); // Switch to results page
        // setIsUploading(false);
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
      id: receipt.id,
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
            'x-amz-meta-connectionId': connectionId,
            'x-amz-meta-fileId': receipt.id,

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


  const handleExtractedText = (textBody: Array<any>, fileId: string) => {
    console.log('In handle extract')
    console.log("HALLO", textBody)
    const entry = textBody['0']
    
    // Validate that the file exists in receipts
    const receiptExists = receiptsRef.current.some(receipt => receipt.id === fileId)
    if (!receiptExists) {
      console.error(`No receipt found with fileId: ${fileId}`)
      return undefined
    }

    const newData: ExtractedData = {
      fileId: fileId,
      merchant: entry.store_name ?? null,
      total: entry.total,
      items: entry.items.map((item: any) => ({
        name: item.item_name,
        price: item.price
      }))
    }

    // Store data by fileId instead of index - order independent
    setExtractedData(prevData => {
      const existingIndex = prevData.findIndex(item => item.fileId === fileId)
      if (existingIndex > -1) {
        // Update existing data for this fileId
        return prevData.map((item, index) => 
          index === existingIndex ? newData : item
        )
      } else {
        // Add new data
        return [...prevData, newData]
      }
    })

    setCurrentStep(3); // Move to "Instant Results"
    setShowResults(true); // Switch to results page
    setIsUploading(false);

    console.log('handled')
  }

  const handleSubmit = async () => {
    if (receipts.length === 0 || isUploading) return;

    setIsUploading(true);
    setCurrentStep(1); // Move to "Extract Text"

    try {
      // Step 1: Generate presigned URLs
      generatePresignedUrls();
      // setTimeout(() => {
      //   const mockData = generateMockData();
      //   setExtractedData(mockData);
      //   setCurrentStep(3); // Move to "Instant Results"
      //   setShowResults(true); // Switch to results page
      //   setIsUploading(false);
      // }, 2000);


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
