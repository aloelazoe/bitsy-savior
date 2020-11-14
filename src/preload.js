const {
    contextBridge,
    ipcRenderer,
} = require('electron');

window.contextBridge = contextBridge;
window.ipcRenderer = ipcRenderer;
