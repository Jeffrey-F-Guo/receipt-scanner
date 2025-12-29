import './FileUpload.css';
import FileThumbnail from './FileThumbnail';

import { useState } from 'react';
import heic2any from 'heic2any';
interface UploadableFile {
    name: string
    previewUrl?: string
    file: File
    // status: 'uploading'|'converting'|'done'|'error'
}

interface FileData {
    name: string
    type: string
    size: number
}
type PresignedUrlResponse =
    { file_urls: { [name: string]: string }}
    | {error: string}


function FileUpload() {
    const NUM_DISPLAY_TILES = 8
    const CONVERSION_SUFFIX = 'jpg'

    const [uploadedFiles, setUploadedFiles] = useState<UploadableFile[]>([])

    // useEffect(() => {
    //     return (
    //         () => {
    //             for (const [name, url] of previews) {
    //                 URL.revokeObjectURL(url)
    //             }
    //         }
    //     )
    // }, [])

    const convertHEIC = async (heicFiles: File[]): Promise<File[]> => {
        const convertedFiles: File[] = []
        for (const file of heicFiles) {
            const converted = await heic2any({blob: file})
            const convertedBlob = Array.isArray(converted)? converted[0] : converted

            const newFileName = file.name.replace(/\.heic$/i, CONVERSION_SUFFIX)
            const newFile = new File([convertedBlob], newFileName, {type: 'image/jpeg'})
            convertedFiles.push(newFile)
        }
        return convertedFiles
    }

    const addFiles = async (fileList: FileList) => {
        const newFiles = Array.from(fileList)
        const heicFiles: File[] = []
        const validFiles: UploadableFile[] = []

        for (const newFile of newFiles) {
            // Skip if file already exists
            // make UploadedFile object
            const isHEIC: boolean = newFile.name.toLowerCase().endsWith('.heic')
            const newFileName = newFile.name

            let isDuplicate = false
            // check if new file has already been uploaded
            for (const curFile of uploadedFiles) {
                const curFileName = curFile.name
                if (curFileName === newFile.name || (isHEIC && newFileName.replace(/\.heic$/i, CONVERSION_SUFFIX) === curFileName)) {
                    console.log(`Skipping duplicate file: ${newFileName}`)
                    isDuplicate = true
                    break
                }
            }

            if (isDuplicate) {
                continue // skip duplicate files
            }
            // check if the file type is what the extension says it is
            // do later - this is security
            
            if (isHEIC) {
                heicFiles.push(newFile)

            } else {
                const url = URL.createObjectURL(newFile)
                validFiles.push({
                    name: newFile.name, 
                    previewUrl: url, 
                    file: newFile
                })
            }
        }

        // Add valid files to state
        if (validFiles.length > 0) {
            setUploadedFiles((prevFiles) => [...validFiles, ...prevFiles])
        }

        // Handle HEIC conversion
        if (heicFiles.length > 0) {
            let convertedUploadableFiles: UploadableFile[] = []
            const convertedFiles: File[] = await convertHEIC(heicFiles)
            for (const file of convertedFiles) {
                const newFileObject = {
                    name: file.name,
                    previewUrl: URL.createObjectURL(file),
                    file: file
                }
                convertedUploadableFiles.push(newFileObject)
            }

            setUploadedFiles((prevFiles) => [...convertedUploadableFiles, ...prevFiles])
        }
    }

    const removeFile = (fileName: string) => {

        for (const uploadedFile of uploadedFiles) {
            if (uploadedFile.name === fileName && uploadedFile.previewUrl) {
                URL.revokeObjectURL(uploadedFile.previewUrl)
            }
        }

        setUploadedFiles((prev) => prev.filter(f => f.name !== fileName));

    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (selectedFiles) {
            addFiles(selectedFiles)
        }
    }
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles) {
            addFiles(droppedFiles);
        }
    }

    // // put this in later lol
    // const validateFile = (file: File): boolean => {
    //     // accept file if a valid magic number appears within the first 1024 bytes
    //     return true;
    // }


    const generatePresignedUrls = async():Promise<PresignedUrlResponse | undefined> => {
        // calls the lambda function

        // Construct request body
        let fileList = []
        for (const fileObject of uploadedFiles) {
            const file = fileObject.file
            const uploadData: FileData = {
                name: file.name,
                type: file.type,
                size: file.size
            }
            fileList.push(uploadData)
        }
        const requestPayload = {
            'files': fileList
        }

        try {
            // Request presigned urls from lambda function
            const lambdaUrl = import.meta.env.VITE_LAMBDA_URL
            const response = await fetch (lambdaUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestPayload)
            })

            if (!response.ok) {
                return undefined
            }

            const responseJson = await response.json()
            console.log(responseJson)
            const parsedBody = JSON.parse(responseJson.body)

            return parsedBody
        } catch (error){
            console.error(error)
            return undefined
        }
    }
    const submitFiles = async () => {
        if (uploadedFiles.length === 0) return;

        const body: PresignedUrlResponse|undefined = await generatePresignedUrls()
        if (body === undefined) {
            console.error('Failed to generate presigned URLs')
            return
        }   
        if ('error' in body) {
            console.error(body.error)
            return
        }

        const file_urls = body.file_urls
        const uploadPromises = uploadedFiles.map(async (fileObj) => {
            const presignedUrl = file_urls[fileObj.name]
            if (!presignedUrl) return;

            return fetch(presignedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': fileObj.file.type
                },
                body: fileObj.file
            })
        })

        try {
            await Promise.all(uploadPromises);
        } catch (err) {
            console.error('One or more uploads failed', err);
        }

        setUploadedFiles([])
    }

    const renderThumbnails = () => {
        if (uploadedFiles.length > NUM_DISPLAY_TILES) {
            const displayTiles = uploadedFiles.slice(0, NUM_DISPLAY_TILES - 1);
            return (
                <>
                    {displayTiles.map((fileObject) => (
                        <FileThumbnail
                            key={fileObject.name}
                            file={fileObject.file}
                            previewUrl={fileObject.previewUrl??null}
                            onRemove={() => removeFile(fileObject.name)}
                        />
                    ))}
                    <div className="thumbnail-ellipsis">
                        <span>...</span>
                        <p>{uploadedFiles.length - (NUM_DISPLAY_TILES - 1)} more</p>
                    </div>
                </>
            );
        } else {
            return uploadedFiles.map((fileObject) => (
                <FileThumbnail
                    key={fileObject.name}
                    file={fileObject.file}
                    previewUrl={fileObject.previewUrl??null}
                    onRemove={() => removeFile(fileObject.name)}
                />
            ));
        }
    }
    return (
        <div className="file-upload-container">
            <p>Drop your receipts here</p>

            {/* Make this a cool monster animation to 'eat' the receipts IM COOOKING */}
            <div
                className="file-upload-box"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
            >
                {uploadedFiles.length > 0 && (
                    <div className='thumbnails-grid'>
                        {renderThumbnails()}
                    </div>
                )}
                {uploadedFiles.length === 0 && (
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
                />

                <label className="browse-btn" htmlFor="browse">
                    Browse Files
                </label>

            </div>

            <div>
                <button>
                    Check My Files
                </button>
                <button onClick={submitFiles}>
                    Submit
                </button>
            </div>
        </div>
    )
}

export default FileUpload