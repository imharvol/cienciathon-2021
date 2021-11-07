const path = require('path')
const Database = require('better-sqlite3')

// Connect to the DB
const dbFilePath = path.join(__dirname, 'db.sqlite')
const db = new Database(dbFilePath, { verbose: console.log })

/**
 * Retrieves a file from the DB
 * @param {String} hash Hash of the file we want info from
 * @returns {File} Returns a object with 3 properties that represent a file: hash, fileName and uploadTimestamp
 */
const getFile = (hash) => {
  return db.prepare('SELECT * FROM FILES WHERE hash = ?').get(hash)
}

/**
 * Retrieves a paragraph from the DB
 * @param {String} fileHash Hash of the file the paragraph belongs to
 * @param {String} hash Hash of the paragraph we want to retrieve
 * @param {Number} position Position of the paragraph in the file
 * @returns {File} Returns a object with the properties: fileHash, hash, contents, position
 */
const getParagraph = (fileHash, hash, position) => {
  return db.prepare('SELECT * FROM PARAGRAPHS WHERE fileHash = ? AND hash = ? AND position = ?').get(fileHash, hash, position)
}

/**
 * Adds a file to the DB
 * @param {String} hash Hash of the file
 * @param {String} fileName Name of the file
 * @param {Number} uploadTimestamp Timestamp of when the file was uploaded
 */
const addFile = (hash, fileName, uploadTimestamp) => {
  if (getFile(hash)) throw new Error("The file's hash is already registered in the DB")

  db.prepare('INSERT INTO FILES (hash, fileName, uploadTimestamp) VALUES (?, ?, ?)').run(hash, fileName, uploadTimestamp)
}

/**
 * Adds a paragraph to the DB
 * @param {String} fileHsh Hash of the file this paragraph belongs to
 * @param {String} hash Hash of the paragraph
 * @param {String} contents Contents of the paragraph
 * @param {Number} position Position of the paragraph in the file
 */
const addFileParagraph = (fileHash, hash, contents, position) => {
  if (getParagraph(fileHash, hash, position)) throw new Error('The paragraph is already registered in the DB')

  db.prepare('INSERT INTO PARAGRAPHS (fileHash, hash, contents, position) VALUES (?, ?, ?, ?)').run(fileHash, hash, contents, position)
}

/**
 * Adds a keyword to a pargraph
 * @param {String} filehash Hash of the file
 * @param {String} keyword Keyword to add to the file
 */
const addParagraphKeyword = (paragraphHash, keyword) => {
  const sameKeyword = db.prepare('SELECT * FROM KEYWORDS WHERE paragraphHash = ? AND keyword = ?').get(paragraphHash, keyword)
  if (sameKeyword) throw new Error(`That paragraph already has the keyword: ${keyword}`)

  db.prepare('INSERT INTO KEYWORDS (paragraphHash, keyword) VALUES (?, ?)').run(paragraphHash, keyword)
}

/**
 * Gets all files registered in the DB
 * @returns {Array<File>} Array of Objects with 3 properties that represent a file: hash, fileName and uploadTimestamp
 */
const getAllFiles = () => {
  return db.prepare('SELECT * FROM FILES').all()
}

/**
 * Returns the keywords of a file
 * @param {String} fileHash Hash of the file
 * @returns {Array<String>} Array with the file's keyword
 */
const getFileKeywords = (fileHash) => {
  return db.prepare('SELECT keyword FROM KEYWORDS k, PARAGRAPHS p, FILES f WHERE k.paragraphHash = p.hash AND p.fileHash = ?').all(fileHash).map(e => e.keyword)
}

/**
 * Returns the keywords of a paragraph
 * @param {String} paragraphHash Hash of the paragraph
 * @returns {Array<String>} Array with the paragraph's keyword
 */
const getParagraphKeywords = (paragraphHash) => {
  return db.prepare('SELECT keyword FROM KEYWORDS WHERE paragraphHash = ?').all(paragraphHash).map(e => e.keyword)
}



module.exports = { getFile, getParagraph, addFile, addFileParagraph, addParagraphKeyword, getAllFiles, getFileKeywords, getParagraphKeywords }
