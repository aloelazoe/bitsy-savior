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
  updateTitle: function() {
    const p = (this._patch.value || '(File -> Patch game data)') + (this._patch.unsaved ? '*' : '');
    const e = (this._export.value || '(File -> Export game data)') + (this._export.unsaved ? '*' : '');
    if (win) {
      win.setTitle(`Patch: ${p}   Export: ${e}`);
    }
  }
};

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
  win.webContents.openDevTools();
  win.on('page-title-updated', (e) => e.preventDefault());

  paths.updateTitle();

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
        const { filePaths: [p] } = await dialog.showOpenDialog();
        if (!p) return;
        checkUnsavedThen(() => {
          loadGameDataFromFile(p)
            .then(() => console.log('loaded game data from ', p))
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
      click: async function() {
        // TODO: validate patch path, only accept valid html with bitsy-data element
        if (!paths.patch) {
          const { filePaths: [p] } = await dialog.showOpenDialog({ buttonLabel: 'Patch' });
          paths.patch = p || paths.patch;
        }
        tryPatch()
          .then(() => console.log('patched ', paths.patch))
          .catch(err => {
            console.error(err);
            dialog.showErrorBox(err.name, err.stack);
          });
      },
    }),
    new MenuItem({
      label: 'Export game data',
      accelerator: 'CommandOrControl+E',
      type: 'normal',
      click: async function() {
        if (!paths.export) {
          const { filePath: p } = await dialog.showSaveDialog({ buttonLabel: 'Export' });
          paths.export = p || paths.export;
        }
        tryExport()
          .then(() => console.log('exported to ', paths.export))
          .catch(err => {
            console.error(err);
            dialog.showErrorBox(err.name, err.stack);
          });
      },
    }),
    new MenuItem({
      label: 'Patch game data in...',
      accelerator: 'CommandOrControl+Shift+D',
      type: 'normal',
      click: async function() {
        // TODO: validate patch path, only accept valid html with bitsy-data element
        const { filePaths: [p] } = await dialog.showOpenDialog({ buttonLabel: 'Patch' });
        paths.patch = p || paths.patch;
        tryPatch()
          .then(() => console.log('patched ', paths.patch))
          .catch(err => {
            console.error(err);
            dialog.showErrorBox(err.name, err.stack);
          });
      },
    }),
    new MenuItem({
      label: 'Export game data to...',
      accelerator: 'CommandOrControl+Shift+E',
      type: 'normal',
      click: async function() {
        const { filePath: p } = await dialog.showSaveDialog({ buttonLabel: 'Export' });
        paths.export = p || paths.export;
        tryExport()
          .then(() => console.log('exported to ', paths.export))
          .catch(err => {
            console.error(err);
            dialog.showErrorBox(err.name, err.stack);
          });
      },
    }),
    new MenuItem({
      label: 'Patch and export',
      accelerator: 'CommandOrControl+S',
      type: 'normal',
      click: async function() {
        // make sure game data will be the same for both patching and exporting
        if (!paths.patch) {
          const { filePaths: [p] } = await dialog.showOpenDialog({ buttonLabel: 'Patch' });
          paths.patch = p || paths.patch;
        }
        if (!paths.export) {
          const { filePath: p } = await dialog.showSaveDialog({ buttonLabel: 'Export' });
          paths.export = p || paths.export;
        }
        tryPatchAndExport()
          .then(() => console.log('tryPatchAndExport finished without errors'))
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
    checkUnsavedThen(() => win.destroy(), 'closing bitsy-savior');
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
  // attempt to load new game data. will resolve into an error message if something goes wrong
  // tryLoadingGameData will revert to a previous game data if it catches an error
  const errMessage = await win.webContents.executeJavaScript(`window.tryLoadingGameData(\`${data}\`)`);
  if (errMessage) {
    throw new Error(errMessage);
  }
  // if we are here, data was valid and was loaded successfully. update paths
  paths.reset();
  if (isHtml) {
    paths.patch = p;
    paths.markUnsaved({ patch: false });
  } else {
    paths.export = p;
    paths.markUnsaved({ export: false });
  }
}

async function tryPatch(data) {
  if (!paths.patch) return;
  console.log('patching game data in ', paths.patch);
  try {
    data = await ensureGameData(data);
    const bitsyHtml = await fse.readFile(paths.patch, 'utf8');
    const updatedGameHtml = bitsyHtml.replace(
      /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
      (m, openingTag, closingTag) => {
        return `${openingTag}\n${data}\n${closingTag}`;
    });
    await fse.outputFile(paths.patch, updatedGameHtml);
  } catch (err) {
    throw new Error(`couldn't patch ${paths.patch}\n${err}`);
  }
  paths.markUnsaved({ patch: false });
}

async function tryExport(data) {
  if (!paths.export) return;
  console.log('exporting game data to ', paths.export);
  try {
    data = await ensureGameData(data);
    await fse.outputFile(paths.export, data);
  } catch (err) {
    throw new Error(`couldn't export to ${paths.export}\n${err}`);
  }
  paths.markUnsaved({ export: false });
}

async function tryPatchAndExport(data) {
  if (!paths.patch && !paths.export) return;
  // make sure game data will be the same for both patching and exporting
  data = await ensureGameData(data);
  await Promise.all([tryPatch(data), tryExport(data)]);
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

ipcMain.on('new-game-data', (event, bitsyCallbackName) => {
  console.log('new-game-data was raised');
  checkUnsavedThen(() => {
    paths.reset();
    event.reply('call', bitsyCallbackName);
  }, 'resetting game data');
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
          tryPatchAndExport()
            .then(() => console.log('tryPatchAndExport finished without errors'))
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
