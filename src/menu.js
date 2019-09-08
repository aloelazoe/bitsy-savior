const {
  app,
  Menu,
  dialog,
  shell
} = require('electron');
const {
  showPatchDialog,
  showExportDialog,
  patchData,
  exportData,
  tryPatchAndExport,
  checkUnsavedThen,
  loadGameDataFromFile
} = require('./utils');
const paths = require('./paths');

const isMac = process.platform === 'darwin';

const menuTemplate = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  }] : []),
  // { role: 'fileMenu' }
  {
    label: 'File',
    submenu: [
      {
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
      },
      { type: 'separator' },
      {
        label: 'Patch game data',
        accelerator: 'CommandOrControl+S',
        type: 'normal',
        click: patchData,
      },
      {
        label: 'Export game data',
        accelerator: 'CommandOrControl+E',
        type: 'normal',
        click: exportData,
      },
      {
        label: 'Patch game data in...',
        accelerator: 'CommandOrControl+Shift+S',
        type: 'normal',
        click: () => patchData(true),
      },
      {
        label: 'Export game data to...',
        accelerator: 'CommandOrControl+Shift+E',
        type: 'normal',
        click: () => exportData(true),
      },
      {
        label: 'Patch and export',
        accelerator: 'CommandOrControl+D',
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
      },
      { type: 'separator' },
      {
        label: 'Run',
        accelerator: 'CommandOrControl+X',
        type: 'normal',
        click: () => {
          if (!paths.patch) return;
          if (paths.unsavedChanges) {
            tryPatchAndExport(paths.patch, paths.export)
            .then(console.log)
            .catch(err => {
              console.error(err);
              dialog.showErrorBox(err.name, err.stack);
            });
          }
          shell.openItem(paths.patch);
        },
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  },
  // { role: 'editMenu' }
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startspeaking' },
            { role: 'stopspeaking' }
          ]
        }
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ])
    ]
  },
  // { role: 'viewMenu' }
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin', accelerator: 'CommandOrControl+=' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  // { role: 'windowMenu' }
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' }
      ] : [
        { role: 'close' }
      ])
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          await shell.openExternal('https://github.com/aloelazoe/bitsy-savior');
        }
      }
    ]
  }
]

module.exports = Menu.buildFromTemplate(menuTemplate);
