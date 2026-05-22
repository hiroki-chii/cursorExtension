const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const srcPng = path.join(__dirname, '../build/icon.png');
const destIco = path.join(__dirname, '../build/icon.ico');
const destElectronIco = path.join(__dirname, '../electron/icon.ico');

console.log('PNG から ICO への変換を開始します...');

pngToIco(srcPng)
  .then(buf => {
    fs.writeFileSync(destIco, buf);
    console.log('ICO ファイルが正常に作成されました:', destIco);
    fs.writeFileSync(destElectronIco, buf);
    console.log('electron フォルダ用 ICO ファイルが正常に作成されました:', destElectronIco);
  })
  .catch(err => {
    console.error('ICO 変換エラー:', err);
    process.exit(1);
  });
