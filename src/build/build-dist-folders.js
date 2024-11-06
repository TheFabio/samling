import fs from 'fs';

if (fs.existsSync('./dist')){
    fs.rmSync('./dist', {recursive: true});
}

if (fs.existsSync('./.tmp')){
    fs.rmSync('./.tmp', {recursive: true});
}

fs.mkdirSync('./dist');
fs.mkdirSync('./.tmp');

fs.cpSync('./node_modules/bootstrap/dist', './dist', {recursive: true});
fs.rmSync('./dist/js/npm.js', {recursive: true});
fs.cpSync('./node_modules/jquery/dist', './dist/js', {recursive: true});
fs.cpSync('./node_modules/node-forge', './.tmp/node-forge', {recursive: true});

fs.cpSync('./src/samling/samling.html', './dist/index.html');
fs.cpSync('./src/samling/css', './dist/css', {recursive: true});
fs.cpSync('./src/samling/images', './dist/images', {recursive: true});
