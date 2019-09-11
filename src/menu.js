const path = require('path');
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
  loadGameDataFromFile,
  reportError
} = require('./utils');
const paths = require('./paths');

const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

const aboutPanelImagePath = path.join(app.getAppPath(), 'src/bitsy/editor/image/cat5.png');

if (isMac || isLinux) {
  app.setAboutPanelOptions({
    applicationName: 'bitsy-savior',
    applicationVersion: app.getVersion(),
    // copyright: 'Copyright', // todo: add copyright when adam decides on bitsy license
    // version: 'electron build version', // will be set automatically on mac
    credits: 'Elkie Nova (@aloelazoe)',
    website: 'https://github.com/aloelazoe/bitsy-savior', // todo: change to itchio page when i publish,
    iconPath: aboutPanelImagePath
  });
}

const prefsSubmenu = [
  {
    label: 'Set editor patch',
    click: async function () {
      const { filePaths: [p] } = await dialog.showOpenDialog({
        filters: [{
          name: 'javascript file to execute when bitsy-editor has finished loading',
          extensions: ['js']
        }]
      });
      if (!p) return;
      paths.editorPatch = p;
      paths.saveToStorage();
      global.bitsyWindow.reload();
      console.log('set editor patch to', paths.editorPatch);
    }
  },
  {
    label: 'Reset editor patch',
    click: () => {
      paths.editorPatch = null;
      paths.saveToStorage();
      global.bitsyWindow.reload();
      console.log('reset editorPatch');
    }
  },
];

const menuTemplate = [
  // { role: 'appMenu' }
  ...(isMac ? [{
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Preferences',
        submenu: prefsSubmenu
      },
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
              .catch(reportError);
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
        label: 'Patch and export',
        accelerator: 'CommandOrControl+D',
        type: 'normal',
        click: async function() {
          const pp = paths.patch || await showPatchDialog();
          const pe = paths.export || await showExportDialog();
          tryPatchAndExport(pp, pe)
            .then(console.log)
            .catch(reportError);
        },
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
        label: 'Save as new html...',
        accelerator: 'CommandOrControl+Alt+S',
        type: 'normal',
        click: () => {
          global.bitsyWindow.webContents.executeJavaScript('window.exportGame()')
            .catch(reportError);
        }
      },
      { type: 'separator' },
      {
        label: 'Run bitsy game in browser',
        accelerator: 'CommandOrControl+R',
        type: 'normal',
        click: () => {
          if (!paths.patch) return;
          if (paths.unsavedChanges) {
            tryPatchAndExport(paths.patch, paths.export)
            .then(console.log)
            .catch(reportError);
          }
          shell.openItem(paths.patch);
        },
      },
      ...(!isMac ? [
        { type: 'separator' },
        {
          label: 'Settings',
          submenu: prefsSubmenu
        }
      ] : []),
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
      {
        role: 'reload',
        accelerator: 'F5'
      },
      {
        role: 'forcereload',
        accelerator: 'Shift+F5'
      },
      { type: 'separator' },
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
        label: 'Website',
        click: async () => {
          await shell.openExternal('https://github.com/aloelazoe/bitsy-savior');
        }
      },
      ...(!isMac ? [
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            if (isLinux) {
              app.showAboutPanel();
            } else {
              dialog.showMessageBox({
                type: 'info',
                buttons: [],
                title: 'bitsy-savior',
                message: `bitsy-savior v${app.getVersion()}`,
                detail: 'by Elkie Nova (@aloelazoe)',
                icon: aboutPanelImagePath
              });
            }
          }
        }
      ] : []),
    ]
  }
]

module.exports = Menu.buildFromTemplate(menuTemplate);
