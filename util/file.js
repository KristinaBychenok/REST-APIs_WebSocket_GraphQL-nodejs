const fs = require('fs')

const clearImage = (filePath) => {
  fs.unlink(filePath, (err) => console.log(err))
}

exports.clearImage = clearImage
