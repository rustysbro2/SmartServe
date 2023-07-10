const fs = require('fs');
const path = require('path');

function walkDirectory(directory, callback) {
  console.log(`Walking directory: ${directory}`);
  
  fs.readdir(directory, (error, files) => {
    if (error) {
      console.error(`Error reading directory ${directory}:`, error);
      return;
    }

    files.forEach(file => {
      const absolute = path.join(directory, file);
      console.log(`Processing file: ${absolute}`);
      
      fs.stat(absolute, (error, stats) => {
        if (error) {
          console.error(`Error retrieving file stats for ${absolute}:`, error);
          return;
        }

        if (stats.isDirectory()) {
          console.log(`Entering directory: ${absolute}`);
          walkDirectory(absolute, callback); // Recursive call for subdirectories
        } else {
          console.log(`Importing file: ${absolute}`);
          
          // Import the entire file as an object
          try {
            const importedFile = require(path.relative(__dirname, absolute));
            callback(importedFile);
            console.log(`File imported: ${absolute}`);
          } catch (error) {
            console.error(`Error importing file ${absolute}:`, error);
          }
        }
      });
    });
  });
}

module.exports = walkDirectory;
