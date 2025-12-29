import heic2any from "heic2any";
import {useState, useEffect} from 'react'
import testImage from '../../assets/test.heic?url'

function renderHEICConvert () {
    const [imgUrl, setUrl] = useState<string | null>(null);
    useEffect(() => {
        console.log('imgUrl changed:', imgUrl)
    }, [imgUrl])


    const convertHEIC = () => {

    fetch(testImage)
        .then((image) => image.blob())
        .then((blob) => heic2any({blob}))
        .then((convertedRes) => {
            const conv = Array.isArray(convertedRes)? convertedRes[0] : convertedRes;
            const url = URL.createObjectURL(conv);
            setUrl(url)
        })
        .catch((e) => {
            console.log(e);
        });
    }

    return (
        <>
            <button onClick={convertHEIC}>Convert HEIC</button>
            {imgUrl && <img src={imgUrl} alt=" image" />}
        </>
    )
}

export default renderHEICConvert

