import './FileUpload.css';
import FileThumbnail from './FileThumbnail';

import { useState, useEffect } from 'react';
import heic2any from 'heic2any';

import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3'

function FileUpload() {
    const NUM_DISPLAY_TILES = 8
    const CONVERSIONSUFFIX = 'jpg'
    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<Map<string, string>>(new Map()) // map file name to object url(image url)

    /*Testing and debugging, can delete later*/
    useEffect(() => {
        console.log(files, previews)
    }, [files, previews])

    const convertHEIC = async (heicFiles: File[]): Promise<File[]> => {
        const convertedFiles: File[] = []
        console.log(heicFiles)
        for (const file of heicFiles) {
            const converted = await heic2any({blob: file})
            const convertedBlob = Array.isArray(converted)? converted[0] : converted
            const newFile = new File([convertedBlob], file.name.replace(/\.heic$i/, CONVERSIONSUFFIX), {type: 'image/jpeg'})
            convertedFiles.push(newFile)
        }
        return convertedFiles
    }

    const addFiles = async (fileList: FileList) => {
        const newFiles = Array.from(fileList)
        const heicFiles: File[] = []
        const validFiles: File[] = []

        for (const file of newFiles) {
            // Skip if file already exists
            const isHEIC: boolean = file.name.toLowerCase().endsWith('.heic')
            if (previews.has(file.name) || (isHEIC && previews.has(file.name.replace(/\.heic$i/, CONVERSIONSUFFIX)))) {
                console.log(`Skipping duplicate file: ${file.name}`)
                continue
            }

            // check if the file type is what the extension says it is
            // do later - this is security
            
            if (isHEIC) {
                heicFiles.push(file)

            } else {
                validFiles.push(file)
                const url = URL.createObjectURL(file)
                setPreviews((prev) => new Map(prev).set(file.name, url))
            }
        }

        // Add valid files to state
        if (validFiles.length > 0) {
            setFiles((curFiles) => [...validFiles, ...curFiles])
        }

        // Handle HEIC conversion
        if (heicFiles.length > 0) {
            const convertedFiles: File[] = await convertHEIC(heicFiles)
            for (const file of convertedFiles) {
                const url = URL.createObjectURL(file)
                setPreviews((prev) => new Map(prev).set(file.name, url))
            }

            if (convertedFiles.length > 0) {
                setFiles((curFiles) => [...convertedFiles, ...curFiles])
            }
        }
    }

    const removeFile = (fileName: string) => {
        const previewUrl = previews.get(fileName);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }

        setPreviews((prev) => {
            const newMap = new Map(prev);
            newMap.delete(fileName);
            return newMap;
        });

        setFiles((prev) => prev.filter(f => f.name !== fileName));

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

    // put this in later lol
    const validateFile = (file: File): boolean => {
        // accept file if a valid magic number appears within the first 1024 bytes
        return true;
    }

    interface fileData {
        name: string;
    }
    interface PresignedUrlResponse {
        file_urls: {
            [filename: string] : string
        }
    }

    const genPresignedUrls = async (): Promise<PresignedUrlResponse | undefined> => {
        // send a request to the lambda function


        let fileList: fileData[] = []
        const files_copy = [...files]

        for (const file of files_copy) {
            const filename = file.name
            fileList.push({name: filename})
        }

        const data = {
            'files': fileList
        }
        const lambdaUrl = 'https://uppbw72ika.execute-api.us-west-1.amazonaws.com/dev'
        try {
            const response = await fetch(lambdaUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            if (!response.ok || response.status != 200) {
                console.error('Failed to get presigned URL')
                return undefined
            }
            const res = await response.json()
            const body: PresignedUrlResponse = JSON.parse(res.body)
            console.log('response is: ', body)
            return body
        } catch (error) {
            console.log(error)
            return undefined
        }
    }

    const submitFiles = async() => {
        // submit files to aws
        console.log("submitted!")
        if (files.length == 0) {
            return 
        }
        // make a request to lambda function for s3 signed urls
        const body:PresignedUrlResponse | undefined = await genPresignedUrls() // returns uuid->presigned_url map
        console.log(body)
        if (!body) {
            console.error("Failed to get presigned URLs")
            return
        }

       const urls = body.file_urls
       
        // PUT request for every url given
        for (const file of files) {
            const filename = file.name
            const presignedUrl = urls[filename]
            console.log(presignedUrl)
            if (presignedUrl) {
                await fetch(presignedUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type':file.type
                    },
                    body: file
                })
            }
        }
    }

    const renderThumbnails = () => {
        if (files.length > NUM_DISPLAY_TILES) {
            const displayTiles = files.slice(0, NUM_DISPLAY_TILES - 1);
            return (
                <>
                    {displayTiles.map((file) => (
                        <FileThumbnail
                            key={file.name}
                            file={file}
                            previewUrl={previews.get(file.name) ?? null}
                            onRemove={() => removeFile(file.name)}
                        />
                    ))}
                    <div className="thumbnail-ellipsis">
                        <span>...</span>
                        <p>{files.length - (NUM_DISPLAY_TILES - 1)} more</p>
                    </div>
                </>
            );
        } else {
            return files.map((file) => (
                <FileThumbnail
                    key={file.name}
                    file={file}
                    previewUrl={previews.get(file.name) ?? null}
                    onRemove={() => removeFile(file.name)}
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
                {files.length > 0 && (
                    <div className='thumbnails-grid'>
                        {renderThumbnails()}
                    </div>
                )}
                {files.length === 0 && (
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