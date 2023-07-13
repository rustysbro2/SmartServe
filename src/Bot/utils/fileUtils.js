const fs = require('fs')
const path = require('path')

function walkDirectory (directory, callback) {
  fs.readdirSync(directory).forEach((file) => {
    const absolute = path.join(directory, file)
    if (fs.statSync(absolute).isDirectory()) {
      walkDirectory(absolute, callback)
    } else {
      callback(absolute)
    }
  })
}

module.exports = {
  walkDirectory
}
