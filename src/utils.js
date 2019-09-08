const fse = require('fs-extra');
const path = require('path');
const {
  dialog,
} = require('electron');
const paths = require('./paths');

async function showPatchDialog() {
  const { filePaths: [p] } = await dialog.showOpenDialog({
    buttonLabel: 'Patch',
    filters: [{
      name: 'Html with a bitsy game',
      extensions: ['html']
    }]
  });
  return p;
}

async function showExportDialog() {
  const { filePath: p } = await dialog.showSaveDialog({
    buttonLabel: 'Export',
    filters: [{
      name: 'Bitsy game data',
      extensions: ['bitsy', 'txt']
    }]
  });
  return p;
}

async function patchData(alwaysWithDialog = false) {
  let p = paths.patch;
  if (!p || alwaysWithDialog === true) p = await showPatchDialog();
  tryPatch(p)
    .then(console.log)
    .catch(err => {
      console.error(err);
      dialog.showErrorBox(err.name, err.stack);
    });
}

async function exportData(alwaysWithDialog = false) {
  let p = paths.export;
  if (!p || alwaysWithDialog === true) p = await showExportDialog();
  tryExport(p)
    .then(console.log)
    .catch(err => {
      console.error(err);
      dialog.showErrorBox(err.name, err.stack);
    });
}

async function tryPatch(p, data) {
  if (!p) return 'patch path is empty';
  console.log('patching game data in:', p);
  try {
    data = await ensureGameData(data);
    const bitsyHtml = await fse.readFile(p, 'utf8');
    let foundGameData = false;
    const updatedGameHtml = bitsyHtml.replace(
      /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
      (m, openingTag, closingTag) => {
        foundGameData = true;
        return `${openingTag}\n${data}\n${closingTag}`;
    });
    if (!foundGameData) throw new Error(`Couldn't find game data`);
    paths.patch = p;
    await fse.outputFile(p, updatedGameHtml);
  } catch (err) {
    throw new Error(`Couldn't patch ${p}\n${err}`);
  }
  paths.markUnsaved({ patch: false });
  return 'patch successful';
}

async function tryExport(p, data) {
  if (!p) return 'export path is empty';
  console.log('exporting game data to:', p);
  try {
    data = await ensureGameData(data);
    paths.export = p;
    await fse.outputFile(p, data);
  } catch (err) {
    throw new Error(`Couldn't export ${p}\n${err}`);
  }
  paths.markUnsaved({ export: false });
  return 'export successful';
}

async function tryPatchAndExport(pp, pe, data) {
  if (!pp && !pe) return 'patch and export paths are empty';
  // make sure game data will be the same for both patching and exporting
  data = await ensureGameData(data);
  await Promise.all([tryPatch(pp, data), tryExport(pe, data)]);
  return `${pp ? 'patch ' : ''}${(pp && pe)? '& ' : ''}${pe ? 'export ' : ''}successful`;
}

async function ensureGameData(data) {
  try {
    data = data || await global.bitsyWindow.webContents.executeJavaScript(
      'window.getFullGameData()'
    );
  } catch (err) {
    throw new Error("couldn't serialize game data\n", err);
  }
  if (!data) throw new Error('game data is empty');
  return data;
}

function checkUnsavedThen(nextAction, description = '') {
  if (!paths.unsavedChanges) {
    return nextAction();
  }
  dialog.showMessageBox({
      type: 'question',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      message: `You have unsaved changes. Do you want to save or discard them${description && ' before ' + description}?`,
      cancelId: 2,
      noLink: true
    }).then(({response: b}) => {
      switch (b) {
        case 0:
          console.log(`save changes${description && ' before ' + description}`);
          tryPatchAndExport(paths.patch, paths.export)
            .then(console.log)
            .then(nextAction)
            .catch(err => {
              console.error(err);
              dialog.showErrorBox(err.name, err.stack);
            });
          break;
        case 1:
          console.log(`discard unsaved changes${description && ' before ' + description}`);
          return nextAction();
          break;
        case 2:
          console.log(`cancel ${description}`);
          return;
      }
    });
}

async function loadGameDataFromFile(p) {
  const isHtml = (path.extname(p) === '.html');
  const fileContents = await fse.readFile(p, 'utf8');
  let data;
  if (isHtml) {
    const dataMatch = fileContents.match(
      /<script type="text\/bitsyGameData" id="exportedGameData">\s*([\s\S]*?)<\/script>/
    );
    if (!dataMatch || !(dataMatch[1])) {
      throw new Error(`couldn't find game data in ${p}`);
    } else {
      data = dataMatch[1];
    }
  } else {
    data = fileContents;
  }
  // remember if autosaving was on and turn it off before trying to load new game data
  // this will ensure new game data won't be auto-saved to the current files
  const currentAutosaveSettings = global.autosave;
  global.autosave = false;
  // attempt to load new game data. will resolve into an error message if something goes wrong
  // tryLoadingGameData will revert to a previous game data if it catches an error
  const errMessage = await global.bitsyWindow.webContents.executeJavaScript(
    `window.tryLoadingGameData(\`${data}\`)`
  );
  global.autosave = currentAutosaveSettings;
  if (errMessage) {
    throw new Error(errMessage);
  }
  // if we are here, data was valid and was loaded successfully
  // reset paths and make them point to the newly opened file
  paths.reset();
  if (isHtml) {
    paths.patch = p;
    paths.markUnsaved({ patch: false });
  } else {
    paths.export = p;
    paths.markUnsaved({ export: false });
  }
}

exports.showPatchDialog = showPatchDialog;
exports.showExportDialog = showExportDialog;
exports.patchData = patchData;
exports.exportData = exportData;
exports.tryPatch = tryPatch;
exports.tryExport = tryExport;
exports.tryPatchAndExport = tryPatchAndExport;
exports.ensureGameData = ensureGameData;
exports.checkUnsavedThen = checkUnsavedThen;
exports.loadGameDataFromFile = loadGameDataFromFile;
