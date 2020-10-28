const {
    remote,
    ipcRenderer
} = require('electron');

let editorListEl;
let editorInfoEl;
let storedData;

document.addEventListener('DOMContentLoaded', (event) => {
    editorListEl = document.getElementById('editorList');
    editorInfoEl = document.getElementById('editorInfo');

    storedData = remote.getGlobal('storedData');

    // todo: populate bitsy editors list according to data stored in global object
    storedData.editors.forEach((editor, index) => {
        const inputEl = document.createElement('input');
        inputEl.type = 'radio';
        const id = inputEl.id = 'editor' + index;
        inputEl.value = index;
        inputEl.name = 'editor';
        inputEl.addEventListener('change', onSwitchEditor);

        const labelEl = document.createElement('label');
        labelEl.htmlFor = id;
        labelEl.innerText = editor.name;

        editorListEl.appendChild(inputEl);
        editorListEl.appendChild(labelEl);
        editorListEl.appendChild(document.createElement('br'));
    });

    const editorListControls = editorListEl.elements;
    for (let index = 0; index < editorListControls.length; index++) {
        if (index === storedData.editorIndex) {
            editorListControls[index].checked = true;
        }
    }

    editorInfoEl.innerText = storedData.editors[storedData.editorIndex].description;
});

function onAddEditorShow(event) {
    // todo
}

function onAddEditorConfirm(event) {
    // todo
}

function onRemoveEditor(event) {
    // todo
}

function onSwitchEditor(event) {
    console.log('switched editor to ' + this.value);

    // update data
    storedData.editorIndex = parseInt(this.value);
    ipcRenderer.send('saveData');

    // update ui
    editorInfoEl.innerText = storedData.editors[storedData.editorIndex].description;
}

function onRunEditor(event) {
    console.log(`i'm going to run editor number ${storedData.editorIndex}, ${storedData.editors[storedData.editorIndex].name}!`)
    ipcRenderer.send('runEditor');
}
