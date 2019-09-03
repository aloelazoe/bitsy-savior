const fse = require('fs-extra');
const path = require('path');
const {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  dialog,
  ipcMain
} = require('electron');

let win;

global.autosave = false;
const paths = global.paths = {
  _patch: { value: null, unsaved: false },
  _export: { value: null, unsaved: false },
  get patch() {
    return this._patch.value;
  },
  set patch(val) {
    this._patch.value = val;
    this.updateTitle();
  },
  get export() {
    return this._export.value;
  },
  set export(val) {
    this._export.value = val;
    this.updateTitle();
  },
  markUnsaved: function (opts = { patch: true, export: true }) {
    if (opts.hasOwnProperty('patch')) this._patch.unsaved = opts.patch;
    if (opts.hasOwnProperty('export')) this._export.unsaved = opts.export;
    this.updateTitle();
  },
  get unsavedChanges() {
    return (this._patch.value && this._patch.unsaved) || (this._export.value && this._export.unsaved);
  },
  reset: function() {
    this._patch = { value: null, unsaved: false };
    this._export = { value: null, unsaved: false };
    this.updateTitle();
  },
  saveToStorage: function() {
    storage.set('paths', { _patch: this._patch, _export: this._export });
  },
  setFromStorage: function() {
    const storedPaths = storage.get('paths');
    if (!storedPaths) return;
    Object.assign(this, storedPaths);
    this.updateTitle();
  },
  updateTitle: function() {
    if (win) {
      const p = (this._patch.value || '(File -> Patch game data)') + (this._patch.unsaved ? '*' : '');
      const e = (this._export.value || '(File -> Export game data)') + (this._export.unsaved ? '*' : '');
      win.setTitle(`Patch: ${p}   Export: ${e}`);
    }
  }
};

const storage = {
  _path: path.join(app.getPath('userData'), 'storage.json'),
  _getStorageObj: function() {
    try {
      const storageObj = fse.readJsonSync(this._path);
      return storageObj;
    } catch {
      fse.outputJsonSync(this._path, {});
      return {};
    }
  },
  get: function(name) {
    const storageObj = this._getStorageObj();
    return storageObj[name];
  },
  set: function(name, value) {
    const storageObj = this._getStorageObj();
    storageObj[name] = value;
    fse.outputJsonSync(this._path, storageObj);
  },
}

function createWindow() {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: width,
    height: height,
    fullscreenWindowTitle: true,
    webPreferences: {
      nodeIntegration: true,
      preload: require.resolve('./src/bitsy-savior')
    }
  })
  win.loadFile('src/bitsy/editor/index.html');
  // win.webContents.openDevTools();

  win.on('page-title-updated', (e) => e.preventDefault());
  paths.updateTitle();
  paths.setFromStorage();

  // SET UP NEW MENU ITEMS
  // TODO: replace with a new menu from template
  const menu = Menu.getApplicationMenu();
  const fileMenu = menu.items.find(i => i.label === 'File');
  [
    new MenuItem({
      label: 'Open',
      accelerator: 'CommandOrControl+O',
      type: 'normal',
      click: async function() {
        const { filePaths: [p] } = await dialog.showOpenDialog({
          filters: [{
            name: 'Bitsy game data or html with a bitsy game',
            extensions: ['html', 'bitsy', 'txt']
          }]
        });
        if (!p) return;
        checkUnsavedThen(() => {
          loadGameDataFromFile(p)
            .then(() => console.log('loaded game data from:', p))
            .catch(err => {
              console.error(err);
              dialog.showErrorBox(err.name, err.stack);
            });
        }, 'opening new file');
      },
    }),
    new MenuItem({
      label: 'Patch game data',
      accelerator: 'CommandOrControl+D',
      type: 'normal',
      click: patchData,
    }),
    new MenuItem({
      label: 'Export game data',
      accelerator: 'CommandOrControl+E',
      type: 'normal',
      click: exportData,
    }),
    new MenuItem({
      label: 'Patch game data in...',
      accelerator: 'CommandOrControl+Shift+D',
      type: 'normal',
      click: () => patchData(true),
    }),
    new MenuItem({
      label: 'Export game data to...',
      accelerator: 'CommandOrControl+Shift+E',
      type: 'normal',
      click: () => exportData(true),
    }),
    new MenuItem({
      label: 'Patch and export',
      accelerator: 'CommandOrControl+S',
      type: 'normal',
      click: async function() {
        const pp = paths.patch || await showPatchDialog();
        const pe = paths.export || await showExportDialog();
        tryPatchAndExport(pp, pe)
          .then(console.log)
          .catch(err => {
            console.error(err);
            dialog.showErrorBox(err.name, err.stack);
          });
      },
    }),
  ].forEach(Menu.prototype.append, fileMenu.submenu);
  Menu.setApplicationMenu(menu);

  // ASK BEFORE CLOSING WHEN YOU HAVE UNSAVED CHANGES
  win.on('close', function(event) {
    event.preventDefault();
    checkUnsavedThen(() => {
      paths.saveToStorage();
      win.destroy();
    }, 'closing bitsy-savior');
  });
}

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

async function loadGameDataFromFile(p) {
  const isHtml = (path.extname(p) === '.html');
  const fileContents = await fse.readFile(p, 'utf8');
  let data;
  if (isHtml) {
    const dataMatch = fileContents.match(/<script type="text\/bitsyGameData" id="exportedGameData">\s*([\s\S]*?)<\/script>/);
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
  const errMessage = await win.webContents.executeJavaScript(`window.tryLoadingGameData(\`${data}\`)`);
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
    data = data || await win.webContents.executeJavaScript('window.getFullGameData()');
  } catch (err) {
    throw new Error("couldn't serialize game data\n", err);
  }
  if (!data) throw new Error('game data is empty');
  return data;
}

ipcMain.on('reset-game-data', (event, bitsyCallbackName) => {
  console.log('reset-game-data was raised');
  checkUnsavedThen(() => {
    paths.reset();
    event.reply('call', bitsyCallbackName);
  }, 'resetting game data');
});

ipcMain.on('autosave', () => {
  if (!(paths.patch || paths.export)) return;
  console.log('autosaving...');
  tryPatchAndExport(paths.patch, paths.export)
    .then(console.log)
    .catch(err => {
      console.error(err);
      dialog.showErrorBox(err.name, err.stack);
    });
});

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

app.on('ready', createWindow);
