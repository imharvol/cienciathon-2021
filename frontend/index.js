const filesTbody = document.getElementById('files-tbody')

const mainPageMinKeywordScore = 0.99997

window.addEventListener('load', async () => {
  // Once the page is loaded, try to fetch the file list and print it
  const files = await (await fetch(`${document.location.protocol}//${document.location.host}/api/getFiles`)).json()
  
  for (const file of files) {
    console.log(file)
    const fileTr = document.createElement('tr')
    
    const hashTd = document.createElement('td')
    hashTd.innerHTML = `<a href="./file/index.html?hash=${file.hash}">${file.hash}</a>`
    const nameTd = document.createElement('td')
    nameTd.innerText = file.fileName
    const uploadTimestampTd = document.createElement('td')
    uploadTimestampTd.innerText = (new Date(file.uploadTimestamp)).toLocaleString('es-es')
    const keywordsTd = document.createElement('td')
    keywordsTd.innerText = file.keywords.filter(e => e.score >= mainPageMinKeywordScore).map(e => e.keyword).join(', ')


    fileTr.appendChild(hashTd)
    fileTr.appendChild(nameTd)
    fileTr.appendChild(uploadTimestampTd)
    fileTr.appendChild(keywordsTd)

    filesTbody.appendChild(fileTr)
  }
})

document.querySelector('#fileUpload').addEventListener('change', async event => {
  //handleImageUpload(event)

  const formData = new FormData()

  for (const file of event.target.files) {
    formData.append(file.name, file)
  }

  const response = await (await fetch(`${document.location.protocol}//${document.location.host}/api/uploadFile`, {
    method: 'PUT',
    body: formData
  })).json()

  console.log(response)

  document.getElementById('uploadNotice').innerText = response.msg
})