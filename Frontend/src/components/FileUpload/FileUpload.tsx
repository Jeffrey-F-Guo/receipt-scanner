import './FileUpload.css';
import FileThumbnail from './FileThumbnail';

import { useState, useEffect } from 'react';
import heic2any from 'heic2any';

import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3'

function FileUpload() {
    const NUM_DISPLAY_TILES = 8
    const CONVERSIONSUFFIX = 'jpg'
    const [files, setFiles] = useState<File[]>([])
    const [fileNames, setFileNames] = useState<Set<string>>(new Set())
    const [previews, setPreviews] = useState<Map<string, string>>(new Map())

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
            if (fileNames.has(file.name) || (isHEIC && fileNames.has(file.name.replace(/\.heic$i/, CONVERSIONSUFFIX)))) {
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
            setFileNames((prev) => {
                const newSet = new Set(prev)
                validFiles.forEach(f => newSet.add(f.name))
                return newSet
            })
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
                setFileNames((prev) => {
                    const newSet = new Set(prev)
                    convertedFiles.forEach(f => newSet.add(f.name))
                    return newSet
                })
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

        setFileNames((prev) => {
            const newSet = new Set(prev);
            newSet.delete(fileName);
            return newSet;
        });
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

    const invokeLambda = async () => {

    }

    const submitFiles = async() => {
        // submit files to aws
        console.log("submitted!")
        // make a request to lambda function for s3 signed urls
        // invokeLambda()
        const s3Client = new S3Client({
            region: "us-west-1",
            credentials: {
                accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
                secretAccessKey: import.meta.env.VITE_AWS_SECRET_KEY
            }

           
        });
        await s3Client.send(
            new PutObjectCommand({
                Bucket: 'receipts-quarantine',
                Key: "my-second-object.txt",
                Body: "Do env vars work?",
            }),
        );

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