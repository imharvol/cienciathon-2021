// parnaxus.cienciathon@gmail.com

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { once } = require('events')
const parnaxusUtils = require('./parnaxusUtils')
const express = require('express')
const fileupload = require('express-fileupload')
const dbUtils = require('./dbUtils')
const cors = require('cors')

const s3Bucket = 'textract-buffer-cienciathon-2021'
const port = 3000

const app = express()

app.use(fileupload())
app.use(cors())

// Create the directory where we store the files temporarily
try { fs.mkdirSync(path.join(__dirname, 'tmp')) } catch (err) {}

app.put('/api/uploadFile', (req, res) => {
  const supportedFiles = ['application/pdf', 'image/png']

  // Check that there's at least one file
  if (Object.values(req.files).length <= 0) {
    return res.status(400).json({
      err: true,
      msg: 'No files were uploaded on the request'
    })
  }

  // Check that all of the file mimetypes are suported
  for (const file of Object.values(req.files)) {
    if (!supportedFiles.includes(file.mimetype)) {
      return res.status(400).json({
        err: true,
        msg: `Unsuported file mimetype: ${file.mimetype}`
      })
    }
  }

  // Proccess each file indepently
  Object.values(req.files).forEach(async (file) => {
    console.log(`Processing file ${file.name}`)

    const filePath = path.join(__dirname, 'tmp', file.md5 + '-' + file.name)

    // Move the file to a temporary storage
    file.mv(filePath)

    // Get file hash
    const fileFd = fs.createReadStream(filePath)
    let fileHash = crypto.createHash('sha256')
    fileHash.setEncoding('hex')
    fileFd.pipe(fileHash)
    await once(fileFd, 'end')
    fileHash.end()
    fileHash = fileHash.read()

    // If it's on the DB, we supose the user should be able to view it on the list
    try {
      dbUtils.addFile(fileHash, file.name, Date.now())
    } catch (err) {
      return 
    }

    // Upload to AWS and delete from local storage
    await parnaxusUtils.uploadToS3(filePath, s3Bucket, fileHash)
    fs.rm(filePath, noop)

    // Get paragraphs and add each one to the DB
    const textBlocks = await parnaxusUtils.getTextBlocks(s3Bucket, fileHash)
    const paragraphs = await parnaxusUtils.getRawParagraphs(textBlocks)
    let paragraphPosition = 0
    for (const paragraph of paragraphs) {
      let paragraphHash = crypto.createHash('sha256')
      paragraphHash.update(paragraph, "utf8")
      paragraphHash = paragraphHash.digest('hex')
      try {
        dbUtils.addFileParagraph(fileHash, paragraphHash, paragraph, paragraphPosition++)
      } catch (err) {
        continue
      }

      // Get the keywords and add each one to the DB
      const keywords = await parnaxusUtils.getKeywords(paragraph)
      console.log(keywords)
      for (const keyword of keywords) {
        try {
          dbUtils.addParagraphKeyword(paragraphHash, keyword)
        } catch (err) {}
      }
    }

    console.log(`Finished processing file ${file.name}`)
  })

  // Let the user know that everything is fine and their files are being processed
  const plural = Object.values(req.files).length > 1
  res.status(200).json({
    ok: true,
    msg: `Your file${plural ? 's' : ''} ${plural ? 'are' : 'is'} being processed, they should be avaliable shortly`
  })
})

app.get('/api/getFiles', (req, res) => {
  const files = dbUtils.getAllFiles()

  for (let file of files) {
    file.keywords = dbUtils.getFileKeywords(file.hash)
  }

  res.status(200).json(files)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

const noop = () => {}
