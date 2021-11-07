// Servicios de AWS que podemos usar:
// - Amazon Textract: https://aws.amazon.com/textract/
// - Amazon Comprehend: https://aws.amazon.com/comprehend/

const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const AWS = require('aws-sdk') // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/

AWS.config.region = 'eu-central-1'

const s3 = new AWS.S3() // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
const textract = new AWS.Textract() // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Textract.html
const comprehend = new AWS.Comprehend() // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Comprehend.html

// https://stackoverflow.com/questions/45309447/calculating-median-javascript
function median(values){
  if(values.length ===0) throw new Error("No inputs");

  values.sort(function(a,b){
    return a-b;
  });

  var half = Math.floor(values.length / 2);
  
  if (values.length % 2)
    return values[half];
  
  return (values[half - 1] + values[half]) / 2.0;
}

/**
 * Devuelve si un número es igual a otro permitiendo un margen de error (en porcentaje de diferencia)
 * @param {Number} v1 Número a comparar
 * @param {Number} v2 Número a comparar
 * @param {Number} error Valor del 0 al 1 que determina cuánto error en forma de porcentaje se permite, siendo el 0 nada permisivo y el 1 totalmente permisivo. 
 */
function equalAprox (v1, v2, error) {
  return Math.abs(v1/v2-1) <= error
}

/**
 * Uploads an object to an S3 bucket
 * @param {String} s3Bucket Bucket's name
 * @param {String} s3Name Object's name
 * @returns {Promise}
 */
const uploadToS3 = (filePath, s3Bucket, s3Name) => {
  const fileStream = fs.createReadStream(filePath)

  const params = {
    Bucket: s3Bucket,
    Key: s3Name,
    Body: fileStream
  }

  return s3.upload(params).promise()
}

/**
 * Removes an object from an S3 bucket
 * @param {String} s3Bucket Bucket's name
 * @param {String} s3Name Object's name
 * @returns {Promise}
 */
const removeFromS3 = (s3Bucket, s3Name) => {
  const params = {
    Bucket: s3Bucket,
    Key: s3Name
  }
  return s3.deleteObject(params).promise()
}

/**
 * Reads text from an object
 * @param {String} s3Bucket Bucket's name
 * @param {String} s3Name Object's name
 * @returns {Array<Block>} Array of Blocks (https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Textract.html#detectDocumentText-property)
 */
const getText = async (s3Bucket, s3Name) => {
  const params = {
    Document: {
      S3Object: {
        Bucket: s3Bucket,
        Name: s3Name
      }
    }
  }

  const blocks = (await textract.detectDocumentText(params).promise()).Blocks
  return blocks//.filter(e => e.BlockType === 'LINE').map(e => e.Text).join('\n')
}

/**
 * Turns blocks (https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Textract.html#detectDocumentText-property) into paragraphs
 * @param {Array<Block>} blocks Array of blocks (https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Textract.html#detectDocumentText-property)
 * @returns {Array<String>} Array of paragraphs obtained from the blocks
 */
const getRawParagraphs = (blocks) => { // TODO: RAYADA, COMPROBAR CON OTROS DOCUMENTOS
  const lines = blocks.filter(e => e.BlockType === 'LINE')
  const rawParagraphs = []
  let buffer = ''
  let lastLineTop, lastTopDifference
  
  // Calculamos la mediana del interlineado para saber cuál es el valor habitual del interlineado en un parrafo
  lastLineTop = lines[0].Geometry.BoundingBox.Top
  lastTopDifference = null
  const topDifferences = []
  for (let i = 1; i < lines.length; i++) {
    let currentTopDifference = lines[i].Geometry.BoundingBox.Top - lastLineTop
    
    topDifferences.push(currentTopDifference)

    lastTopDifference = currentTopDifference
    lastLineTop = lines[i].Geometry.BoundingBox.Top
  }
  const topDifferenceMedian = median(topDifferences)

  lastLineTop = lines[0].Geometry.BoundingBox.Top
  lastTopDifference = null
  
  for (let i = 1; i < lines.length; i++) {
    let currentTopDifference = lines[i].Geometry.BoundingBox.Top - lastLineTop

    // Si cambia la distancia entre las letras, lo consideramos un nuevo parrafo
    if (!equalAprox(topDifferenceMedian, currentTopDifference, 0.1) && buffer !== '') {
      rawParagraphs.push(buffer.trim())
      buffer = ''
    }

    buffer += lines[i].Text+' '

    lastTopDifference = currentTopDifference 
    lastLineTop = lines[i].Geometry.BoundingBox.Top
  } 

  // Añadimos el ultimo parrafo
  rawParagraphs.push(buffer.trim())

  return rawParagraphs
}

/**
 * Extrats keywords from a text
 * @param {String} text Text of under 5000 bytes in size
 * @returns {Array<String>} Array of keywords extracted from the text
 */
const getKeywords = async (text) => {
  const textByteLengthLimit = 5000
  const textByteLength = Buffer.from(text).length
  if (textByteLength > textByteLengthLimit) throw new Error(`The text exceeds the ${textByteLengthLimit} byte length limit: ${textByteLength}`)

  const textLanguage = (await comprehend.detectDominantLanguage({ Text: text }).promise()).Languages[0].LanguageCode

  const params = {
    Text: text,
    LanguageCode: textLanguage
  }
  const keywords = await comprehend.detectKeyPhrases(params).promise()
  const filteredKeywords = keywords.KeyPhrases.filter(e => e.Score >= 0.99)

  return filteredKeywords
}

// const s3Bucket = 'textract-buffer-cienciathon-2021'

// const main = async () => {
//   // Subimos la imagen al bucket
//   const fileName = 'bases-convocatoria-cienciathon-pca-2021-1.png'
//   const filePath = path.join(__dirname, fileName)

//   const s3Name = uuidv4() // Usamos una uuid para evitar que los nombres de los archivos colisionen
//   const upload = await uploadToS3(filePath, s3Bucket, s3Name)

//   // Leemos el texto de la imagen
//   const text = await getText(upload.Bucket, upload.Key)
//   const rawParagraphs = await getRawParagraphs(text)

//   // Eliminamos la imagen del bucket
//   removeFromS3(upload.Bucket, upload.Key)

//   //const keywords = await getKeywords(text)

//   console.log(rawParagraphs)
// }
// main()

module.exports = { uploadToS3, removeFromS3, getText, getRawParagraphs, getKeywords }