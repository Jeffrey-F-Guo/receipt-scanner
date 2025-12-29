/**
 * FileUpload Component - Best Practices Implementation
 *
 * Key improvements demonstrated:
 * 1. Proper memory management with cleanup effects
 * 2. Custom hooks for separation of concerns
 * 3. Better error handling and user feedback
 * 4. Performance optimizations (useMemo, useCallback)
 * 5. Type safety improvements
 * 6. Loading states and UI feedback
 * 7. Configuration via constants
 * 8. Detailed code comments explaining decisions
 */

import './FileUpload.css';
import FileThumbnail from './FileThumbnail';
import { useState, useEffect, useCallback, useMemo } from 'react';
import heic2any from 'heic2any';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
// Tip: Define types at the top for easy reference and reusability

type UploadStatus = 'idle' | 'converting' | 'uploading' | 'success' | 'error';

interface UploadableFile {
    name: string;
    previewUrl: string | null;
    file: File;
    status: UploadStatus;
    error?: string;
}

interface FileData {
    name: string;
    type: string;
    size: number;
}

// Discriminated union ensures type safety - you get either success OR error
type PresignedUrlResponse =
    | { file_urls: { [name: string]: string } }
    | { error: string };

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
// Tip: Extract magic numbers and strings to named constants for:
// - Better readability
// - Easier maintenance
// - Single source of truth

const CONFIG = {
    MAX_DISPLAY_TILES: 8,
    HEIC_CONVERSION_FORMAT: 'jpg' as const,
    HEIC_MIME_TYPE: 'image/jpeg' as const,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB - example limit
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
// Tip: Extract pure functions outside component to:
// - Make them testable
// - Prevent recreation on each render
// - Keep component logic clean

/**
 * Checks if a filename represents a HEIC image
 */
const isHeicFile = (filename: string): boolean => {
    return filename.toLowerCase().endsWith('.heic');
};

/**
 * Converts HEIC filename to target format
 */
const convertHeicFilename = (filename: string, targetFormat: string): string => {
    return filename.replace(/\.heic$/i, `.${targetFormat}`);
};

/**
 * Validates file size
 */
const isValidFileSize = (file: File, maxSize: number): boolean => {
    return file.size <= maxSize;
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================
// Tip: Extract complex logic into custom hooks for:
// - Reusability
// - Testability
// - Separation of concerns

/**
 * Manages object URL lifecycle to prevent memory leaks
 *
 * Key learning: Object URLs created with URL.createObjectURL() must be
 * manually released with URL.revokeObjectURL() to prevent memory leaks
 */
const useObjectUrlCleanup = (files: UploadableFile[]) => {
    useEffect(() => {
        // Cleanup function runs when component unmounts or dependencies change
        return () => {
            files.forEach((file) => {
                if (file.previewUrl) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        };
    }, [files]); // Re-run cleanup when files change
};

/**
 * Custom hook for HEIC file conversion
 */
const useHeicConverter = () => {
    const convertHeicFiles = useCallback(async (heicFiles: File[]): Promise<File[]> => {
        const convertedFiles: File[] = [];

        // Process sequentially to avoid overwhelming the browser
        for (const file of heicFiles) {
            try {
                const converted = await heic2any({ blob: file });
                const convertedBlob = Array.isArray(converted) ? converted[0] : converted;

                const newFileName = convertHeicFilename(
                    file.name,
                    CONFIG.HEIC_CONVERSION_FORMAT
                );
                const newFile = new File(
                    [convertedBlob],
                    newFileName,
                    { type: CONFIG.HEIC_MIME_TYPE }
                );
                convertedFiles.push(newFile);
            } catch (error) {
                console.error(`Failed to convert ${file.name}:`, error);
                // Continue processing other files even if one fails
            }
        }

        return convertedFiles;
    }, []);

    return { convertHeicFiles };
};

/**
 * Custom hook for presigned URL generation and file upload
 */
const useFileUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const generatePresignedUrls = useCallback(
        async (files: UploadableFile[]): Promise<PresignedUrlResponse | null> => {
            const lambdaUrl = import.meta.env.VITE_LAMBDA_URL;

            if (!lambdaUrl) {
                console.error('VITE_LAMBDA_URL environment variable not set');
                return { error: 'Configuration error: Upload URL not configured' };
            }

            // Use .map() instead of for-loop for cleaner functional style
            const fileList: FileData[] = files.map((fileObj) => ({
                name: fileObj.file.name,
                type: fileObj.file.type,
                size: fileObj.file.size,
            }));

            try {
                const response = await fetch(lambdaUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ files: fileList }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return { error: `Server error: ${response.status} - ${errorText}` };
                }

                const responseJson = await response.json();
                const parsedBody = JSON.parse(responseJson.body);

                return parsedBody;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.error('Failed to generate presigned URLs:', error);
                return { error: `Network error: ${errorMessage}` };
            }
        },
        []
    );

    const uploadFiles = useCallback(
        async (
            files: UploadableFile[],
            fileUrls: { [name: string]: string }
        ): Promise<{ success: boolean; failedFiles: string[] }> => {
            setIsUploading(true);
            setUploadError(null);

            const failedFiles: string[] = [];

            // Use Promise.allSettled() instead of Promise.all() to handle partial failures
            // This allows us to know which files succeeded and which failed
            const uploadPromises = files.map(async (fileObj) => {
                const presignedUrl = fileUrls[fileObj.name];

                if (!presignedUrl) {
                    failedFiles.push(fileObj.name);
                    return { status: 'rejected', reason: 'No presigned URL' };
                }

                try {
                    const response = await fetch(presignedUrl, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': fileObj.file.type,
                        },
                        body: fileObj.file,
                    });

                    if (!response.ok) {
                        failedFiles.push(fileObj.name);
                        return { status: 'rejected', reason: response.statusText };
                    }

                    return { status: 'fulfilled', value: fileObj.name };
                } catch (error) {
                    failedFiles.push(fileObj.name);
                    return { status: 'rejected', reason: error };
                }
            });

            await Promise.allSettled(uploadPromises);

            setIsUploading(false);

            if (failedFiles.length > 0) {
                const errorMsg = `Failed to upload ${failedFiles.length} file(s): ${failedFiles.join(', ')}`;
                setUploadError(errorMsg);
                return { success: false, failedFiles };
            }

            return { success: true, failedFiles: [] };
        },
        []
    );

    return { isUploading, uploadError, generatePresignedUrls, uploadFiles };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function FileUploadBest() {
    const [uploadedFiles, setUploadedFiles] = useState<UploadableFile[]>([]);
    const [isConverting, setIsConverting] = useState(false);

    // Custom hooks
    const { convertHeicFiles } = useHeicConverter();
    const { isUploading, uploadError, generatePresignedUrls, uploadFiles } = useFileUpload();

    // Cleanup object URLs on unmount
    useObjectUrlCleanup(uploadedFiles);

    // ========================================================================
    // MEMOIZED VALUES
    // ========================================================================
    // Tip: useMemo prevents expensive calculations on every render

    /**
     * Create a Set of filenames for O(1) duplicate checking
     * This is much faster than nested loops for large file lists
     */
    const existingFilenames = useMemo(() => {
        return new Set(uploadedFiles.map((f) => f.name));
    }, [uploadedFiles]);

    // ========================================================================
    // CALLBACKS
    // ========================================================================
    // Tip: useCallback prevents function recreation, improving performance
    // and preventing unnecessary re-renders of child components

    /**
     * Adds files to the upload queue with validation and deduplication
     */
    const addFiles = useCallback(
        async (fileList: FileList) => {
            const newFiles = Array.from(fileList);
            const heicFiles: File[] = [];
            const validFiles: UploadableFile[] = [];

            for (const file of newFiles) {
                // Validate file size
                if (!isValidFileSize(file, CONFIG.MAX_FILE_SIZE)) {
                    console.warn(`File ${file.name} exceeds size limit`);
                    continue;
                }

                const isHeic = isHeicFile(file.name);
                const targetFilename = isHeic
                    ? convertHeicFilename(file.name, CONFIG.HEIC_CONVERSION_FORMAT)
                    : file.name;

                // O(1) duplicate check using Set
                if (existingFilenames.has(targetFilename)) {
                    console.log(`Skipping duplicate file: ${file.name}`);
                    continue;
                }

                if (isHeic) {
                    heicFiles.push(file);
                } else {
                    const previewUrl = URL.createObjectURL(file);
                    validFiles.push({
                        name: file.name,
                        previewUrl,
                        file,
                        status: 'idle',
                    });
                }
            }

            // Add non-HEIC files immediately
            if (validFiles.length > 0) {
                setUploadedFiles((prev) => [...validFiles, ...prev]);
            }

            // Convert and add HEIC files
            if (heicFiles.length > 0) {
                setIsConverting(true);
                const convertedFiles = await convertHeicFiles(heicFiles);

                const convertedUploadableFiles: UploadableFile[] = convertedFiles.map(
                    (file) => ({
                        name: file.name,
                        previewUrl: URL.createObjectURL(file),
                        file,
                        status: 'idle',
                    })
                );

                setUploadedFiles((prev) => [...convertedUploadableFiles, ...prev]);
                setIsConverting(false);
            }
        },
        [existingFilenames, convertHeicFiles]
    );

    /**
     * Removes a file and cleans up its object URL
     */
    const removeFile = useCallback((fileName: string) => {
        setUploadedFiles((prev) => {
            // Find and revoke the URL before filtering
            const fileToRemove = prev.find((f) => f.name === fileName);
            if (fileToRemove?.previewUrl) {
                URL.revokeObjectURL(fileToRemove.previewUrl);
            }

            return prev.filter((f) => f.name !== fileName);
        });
    }, []);

    /**
     * Handles file selection from input
     */
    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = e.target.files;
            if (selectedFiles && selectedFiles.length > 0) {
                addFiles(selectedFiles);
            }
            // Reset input value to allow selecting the same file again
            e.target.value = '';
        },
        [addFiles]
    );

    /**
     * Handles drag and drop
     */
    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const droppedFiles = e.dataTransfer.files;
            if (droppedFiles && droppedFiles.length > 0) {
                addFiles(droppedFiles);
            }
        },
        [addFiles]
    );

    /**
     * Submits files for upload
     */
    const submitFiles = useCallback(async () => {
        if (uploadedFiles.length === 0) return;

        // Update status for all files
        setUploadedFiles((prev) =>
            prev.map((f) => ({ ...f, status: 'uploading' as UploadStatus }))
        );

        // Get presigned URLs
        const response = await generatePresignedUrls(uploadedFiles);

        if (!response) {
            console.error('Failed to get response from server');
            setUploadedFiles((prev) =>
                prev.map((f) => ({
                    ...f,
                    status: 'error' as UploadStatus,
                    error: 'Server error',
                }))
            );
            return;
        }

        if ('error' in response) {
            console.error(response.error);
            setUploadedFiles((prev) =>
                prev.map((f) => ({
                    ...f,
                    status: 'error' as UploadStatus,
                    error: response.error,
                }))
            );
            return;
        }

        // Upload files
        const result = await uploadFiles(uploadedFiles, response.file_urls);

        if (result.success) {
            // Clear files after successful upload
            uploadedFiles.forEach((f) => {
                if (f.previewUrl) {
                    URL.revokeObjectURL(f.previewUrl);
                }
            });
            setUploadedFiles([]);
        } else {
            // Mark failed files
            setUploadedFiles((prev) =>
                prev.map((f) => ({
                    ...f,
                    status: result.failedFiles.includes(f.name)
                        ? ('error' as UploadStatus)
                        : ('success' as UploadStatus),
                }))
            );
        }
    }, [uploadedFiles, generatePresignedUrls, uploadFiles]);

    /**
     * Renders thumbnails with overflow handling
     */
    const renderThumbnails = useCallback(() => {
        const fileCount = uploadedFiles.length;

        if (fileCount > CONFIG.MAX_DISPLAY_TILES) {
            const visibleFiles = uploadedFiles.slice(0, CONFIG.MAX_DISPLAY_TILES - 1);
            const remainingCount = fileCount - (CONFIG.MAX_DISPLAY_TILES - 1);

            return (
                <>
                    {visibleFiles.map((fileObject) => (
                        <FileThumbnail
                            key={fileObject.name}
                            file={fileObject.file}
                            previewUrl={fileObject.previewUrl}
                            onRemove={removeFile}
                        />
                    ))}
                    <div className="thumbnail-ellipsis">
                        <span>...</span>
                        <p>
                            {remainingCount} more file{remainingCount > 1 ? 's' : ''}
                        </p>
                    </div>
                </>
            );
        }

        return uploadedFiles.map((fileObject) => (
            <FileThumbnail
                key={fileObject.name}
                file={fileObject.file}
                previewUrl={fileObject.previewUrl}
                onRemove={removeFile}
            />
        ));
    }, [uploadedFiles, removeFile]);

    // ========================================================================
    // RENDER
    // ========================================================================

    const hasFiles = uploadedFiles.length > 0;
    const isProcessing = isConverting || isUploading;

    return (
        <div className="file-upload-container">
            <p>Drop your receipts here</p>

            <div
                className="file-upload-box"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                {hasFiles && <div className="thumbnails-grid">{renderThumbnails()}</div>}

                {!hasFiles && (
                    <div>
                        <p>Drop your receipts here</p>
                    </div>
                )}

                <input
                    type="file"
                    accept="image/*, .pdf"
                    hidden
                    id="browse"
                    multiple
                    onChange={handleFileChange}
                    disabled={isProcessing}
                />

                <label
                    className={`browse-btn ${isProcessing ? 'disabled' : ''}`}
                    htmlFor="browse"
                >
                    {isConverting ? 'Converting...' : 'Browse Files'}
                </label>
            </div>

            {/* Status messages */}
            {uploadError && (
                <div className="error-message" role="alert">
                    {uploadError}
                </div>
            )}

            {isConverting && (
                <div className="info-message">Converting HEIC files...</div>
            )}

            <div>
                <button disabled={isProcessing}>Check My Files</button>
                <button onClick={submitFiles} disabled={!hasFiles || isProcessing}>
                    {isUploading ? 'Uploading...' : 'Submit'}
                </button>
            </div>
        </div>
    );
}

export default FileUploadBest;

/**
 * ============================================================================
 * KEY LEARNINGS AND BEST PRACTICES DEMONSTRATED
 * ============================================================================
 *
 * 1. MEMORY MANAGEMENT
 *    - Always clean up object URLs to prevent memory leaks
 *    - Use useEffect cleanup functions for side effects
 *
 * 2. CUSTOM HOOKS
 *    - Extract complex logic for reusability and testability
 *    - Separate concerns (conversion, upload, cleanup)
 *
 * 3. PERFORMANCE
 *    - useMemo for expensive computations (Set creation)
 *    - useCallback to prevent function recreation
 *    - Use Set for O(1) lookups instead of O(n) loops
 *
 * 4. TYPE SAFETY
 *    - Discriminated unions for mutually exclusive states
 *    - Proper TypeScript annotations throughout
 *    - const assertions for configuration objects
 *
 * 5. ERROR HANDLING
 *    - Detailed error messages for debugging
 *    - Promise.allSettled for partial failure handling
 *    - User-facing error messages
 *
 * 6. CODE ORGANIZATION
 *    - Pure utility functions outside component
 *    - Configuration constants at the top
 *    - Logical grouping with comments
 *
 * 7. USER EXPERIENCE
 *    - Loading states during async operations
 *    - Disabled buttons during processing
 *    - Clear error messages
 *    - Input reset to allow re-selection
 *
 * 8. ACCESSIBILITY
 *    - Proper ARIA attributes
 *    - Disabled states
 *    - Semantic HTML
 *
 * 9. FUNCTIONAL PROGRAMMING
 *    - Use .map() instead of for-loops where appropriate
 *    - Immutable state updates
 *    - Pure functions
 *
 * 10. MAINTAINABILITY
 *     - Named constants instead of magic numbers
 *     - Comprehensive comments
 *     - Single responsibility principle
 */
