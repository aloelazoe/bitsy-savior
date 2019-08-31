const {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  dialog
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
  updateTitle: function() {
    const p = (this._patch.value || '(File -> Patch game data)') + (this._patch.unsaved ? '*' : '');
    const e = (this._export.value || '(File -> Export game data)') + (this._export.unsaved ? '*' : '');
    if (win) {
      win.setTitle(`Patch: ${p}   Export: ${e}`);
    }
  }
};

function createWindow () {
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
      label: 'Patch game data',
      accelerator: 'CommandOrControl+D',
      type: 'normal',
      click: async function() {
        // TODO: validate patch path, only accept valid html with bitsy-data element
        if (!paths.patch) {
          const { filePaths: [p] } = await dialog.showOpenDialog({ buttonLabel: 'Patch' });
          paths.patch = p || paths.patch;
        }
        tryPatch();
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
        tryExport();
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
        tryPatch();
      },
    }),
    new MenuItem({
      label: 'Export game data to...',
      accelerator: 'CommandOrControl+Shift+E',
      type: 'normal',
      click: async function() {
        const { filePath: p } = await dialog.showSaveDialog({ buttonLabel: 'Export' });
        paths.export = p || paths.export;
        tryExport();
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
        tryPatchAndExport();
      },
    }),
  ].forEach(Menu.prototype.append, fileMenu.submenu);
  Menu.setApplicationMenu(menu);
}

async function tryPatch() {
  if (!paths.patch) return;
  console.log('patching game data in ', paths.patch);
  // TODO: actually patch game data
  // if successful, unmark as unsaved
  paths.markUnsaved({ patch: false });
}

async function tryExport() {
  if (!paths.export) return;
  console.log('exporting game data to ', paths.export);
  // TODO: actually export game data
  // if successful, unmark as unsaved
  paths.markUnsaved({ export: false });
}

async function tryPatchAndExport() {
  if (!paths.patch && !paths.export) return;
  // TODO: serialize game data to update both files
  if (paths.patch) {
    console.log('patching game data in ', paths.patch);
    // TODO: actually patch game data
    // if successful, unmark as unsaved
    paths.markUnsaved({ patch: false });
  }
  if (paths.export) {
    console.log('exporting game data to ', paths.export);
    // TODO: actually export game data
    // if successful, unmark as unsaved
    paths.markUnsaved({ export: false });
  }
}

app.on('ready', createWindow);
