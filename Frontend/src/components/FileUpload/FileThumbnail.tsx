import './FileThumbnail.css'
interface FileThumbnailProps {
    file: File
    previewUrl: string | null
    onRemove: (fileName: string) => void

}

function FileThumbnail({file, previewUrl, onRemove}: FileThumbnailProps) {
    return (
        <div className="thumbnail-item">
            {previewUrl ? (
                <img
                    src={previewUrl}
                    alt={file.name}
                    className="thumbnail-image"
                />
            ) : (
                <div className="thumbnail-placeholder">
                    <span>📄</span>
                </div>
            )}

            <button 
                type='button' 
                onClick={() => onRemove(file.name)}
                aria-label={`Remove ${file.name}`}
            >x</button>
            <div className="thumbnail-name">
                {file.name}
            </div>
        </div>
    )
}

export default FileThumbnail