import './FileUpload.css'
function FileUpload() {
    const handleDrop = (e: React.DragEvent) => {
        // need state to keep track of uploaded files
        console.log("YIPEEEEEEE")
    }
    return (
        <>
            <div className="file-upload-container">
                <p>Please upload a receipt image!</p>

                
                {/* Make this a cool monster animation to 'eat' the receipts IM COOOKING */}
                <div className="file-upload-box" onDrop={handleDrop}>
                    Drag and Drop
                    <input 
                        type="file" 
                        accept="image/*, .pdf" 
                        hidden 
                        id = "browse"
                    />
                    <label className="browse-btn" htmlFor="browse">
                        Browse Files
                    </label>

                </div>

                <div>
                    
                    <button>
                        Submit
                    </button>
                </div>

            </div>

        </>
    )
}

function convertHEIC() {

}

export default FileUpload