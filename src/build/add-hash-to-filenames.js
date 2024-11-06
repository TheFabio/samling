import crypto from 'crypto';
import fs from "fs";
import * as path from "node:path";

const createFileHash = (filenameAndPath) => {
  const fileContents = fs.readFileSync(filenameAndPath, 'utf8');

  const hash = crypto.createHash('sha1');
  hash.setEncoding('hex');
  hash.write(fileContents);
  hash.end();
  return hash.read();
}

let newIndexFileContents = fs.readFileSync('dist/index.html', 'utf8');
[
  'js/bundle.js',
  'js/forge.bundle.js',
  'css/samling.css'
].forEach((filenameAndPath) => {
  const relativeFolder = path.dirname(filenameAndPath)
  const fullFilenameAndPath = path.join('dist', filenameAndPath)
  const fileHash = createFileHash(fullFilenameAndPath);
  const fileExtension = path.extname(filenameAndPath);
  const fileName = path.basename(filenameAndPath, fileExtension);
  const newFileName = `${fileName}-${fileHash}${fileExtension}`
  const newFilenameAndPath = path.join(relativeFolder, newFileName)

  fs.copyFileSync(fullFilenameAndPath, path.join('dist', newFilenameAndPath))
  fs.rmSync(fullFilenameAndPath)

  newIndexFileContents = newIndexFileContents.replace(filenameAndPath , newFilenameAndPath)
})

fs.writeFileSync('dist/index.html', newIndexFileContents, 'utf8');
