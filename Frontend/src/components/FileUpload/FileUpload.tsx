import './FileUpload.css';
import { useState, useEffect } from 'react';
import FileThumbnail from './FileThumbnail';

function FileUpload() {
    const NUM_DISPLAY_TILES = 8
    const [files, setFiles] = useState<File[]>([])
    const [fileNames, setFileNames] = useState<Set<string>>(new Set())
    const [previews, setPreviews] = useState<Map<string, string>>(new Map())
    {/*Testing and debugging, can delete later*/ }
    useEffect(() => {
        console.log(files, previews)
    }, [files, previews])

    const convertHEIC = async (heicFiles: File[]): Promise<File[]> => {
        console.log(heicFiles)
        return []
    }

    const addFiles = async (fileList: FileList) => {
        const newFiles = Array.from(fileList)
        const heicFiles: File[] = []
        const validFiles: File[] = []

        for (const file of newFiles) {
            // Skip if file already exists
            if (fileNames.has(file.name)) {
                console.log(`Skipping duplicate file: ${file.name}`)
                continue
            }

            if (file.name.toLowerCase().endsWith('.heic')) {
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
                setFiles((curFiles) => [...curFiles, ...convertedFiles])
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
    const submitFiles = () => {
        // submit files to aws
        console.log("submitted!")
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