const tbody = document.getElementById('tbody-table')

const mainPageMinKeywordScore = 0.99995

window.addEventListener('load', async () => {
  const fileHash = (new URL(document.location.href)).searchParams.get('hash')
  if (!fileHash) document.location = '/'

  var url = new URL('http://localhost:3000/api/getFullFile')
  var params = {hash: fileHash}
  url.search = new URLSearchParams(params).toString();

  const fullFile = await (await fetch(url)).json()

  // Actualizamos el titulo
  document.getElementById('fileName').innerText = fullFile.fileName

  for (const paragraph of fullFile.paragraphs) {
    const paragrapContents = paragraph.contents
    const paragraphKeywords = paragraph.keywords.filter(e => e.score >= mainPageMinKeywordScore).map(e => e.keyword)

    const paragraphTr = document.createElement('tr')
    const keywordsTd = document.createElement('td')
    keywordsTd.innerText = paragraphKeywords.join(', ')
    const contentsTd = document.createElement('td')
    contentsTd.innerText = paragrapContents

    paragraphTr.appendChild(keywordsTd)
    paragraphTr.appendChild(contentsTd)

    tbody.appendChild(paragraphTr)
  }
})