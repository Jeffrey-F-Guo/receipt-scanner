import './Home.css'
import FileUpload from '../../components/FileUpload/FileUpload.tsx'

function app() {

    return (
        <div>
            <h1>Lamp</h1>
            <div className='file-upload-container'>
                <FileUpload />
            </div>
            

        </div>
    )
}

export default app