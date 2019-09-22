const fse = require('fs-extra');

fse.readJson('./package.json')
.then(packageObj => {
  return fse.outputFile('build-version.txt', packageObj.version);
})
.then(() => {
  console.log('updated build-version.txt');
})
.catch(err => {
  console.error(err);
})
