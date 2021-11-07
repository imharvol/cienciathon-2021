const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

let replaceDb = false
let dbFilePath = path.join(__dirname, 'db.sqlite')

// Parse args
for (let i = 2; i < process.argv.length;) {
  switch (process.argv[i]) {
    case '-f':
      replaceDb = true
      i += 1
      break

    case '-o':
      if (process.argv.length > i + 1) {
        if (process.argv[i + 1].startsWith('-')) {
          console.error('Malformated program params')
          process.exit(1)
        }
        dbFilePath = process.argv[i + 1]
      } else {
        console.error('Option -o must specify a file path')
        process.exit(1)
      }
      i += 2
      break

    default:
      console.error(`Unknown argument: ${process.argv[i]}`)
      process.exit(1)
  }
}

const fileExists = fs.readdirSync(path.dirname(dbFilePath)).includes(path.basename(dbFilePath))

if (fileExists) {
  if (replaceDb) {
    fs.rmSync(dbFilePath)
  } else {
    console.error(`The file ${dbFilePath} already exists. Use option -f to overwrite it`)
    process.exit(1)
  }
}

const db = new Database(dbFilePath, { verbose: console.log })

// PARAGRAPHS Necesita una revision gorda gorda

db.exec(`
CREATE TABLE "FILES" (
	"hash"	TEXT NOT NULL UNIQUE,
	"fileName"	TEXT NOT NULL,
	"uploadTimestamp"	INTEGER NOT NULL,
	PRIMARY KEY("hash")
);

CREATE TABLE "PARAGRAPHS" (
	"fileHash"	TEXT NOT NULL,
	"hash"	TEXT NOT NULL UNIQUE,
	"contents"	TEXT NOT NULL,
	"position"	INTEGER NOT NULL,
	FOREIGN KEY("fileHash") REFERENCES "FILES"("hash"),
	PRIMARY KEY("hash","fileHash","position")
);
CREATE TABLE "KEYWORDS" (
	"paragraphHash"	TEXT NOT NULL,
	"keyword"	TEXT NOT NULL,
	FOREIGN KEY("paragraphHash") REFERENCES "PARAGRAPHS"("hash"),
	PRIMARY KEY("paragraphHash","keyword")
)
`)
