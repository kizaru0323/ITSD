const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../node_modules/react-zoom-pan-pinch/dist');

const filesToPatch = [
  'index.esm.js',
  'index.cjs.js'
];

filesToPatch.forEach(file => {
  const filePath = path.join(packagePath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Remove the source map URL comment at the bottom
    content = content.replace(/\/\/# sourceMappingURL=(.*)\.map/g, '');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Removed source map reference from ${file}`);
  }
});

// Also delete the .map files themselves
const mapFiles = ['index.esm.js.map', 'index.cjs.js.map'];
mapFiles.forEach(file => {
  const filePath = path.join(packagePath, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted ${file}`);
  }
});
