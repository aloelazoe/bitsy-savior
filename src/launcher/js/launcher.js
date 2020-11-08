const {
    remote,
    ipcRenderer
} = require('electron');

let isAddingNewEditor = false;

let editorListEl;

let editorNameEl;
let editorTypeEl;
let editorDescriptionEl;
let editorPathEl;

let editorNameInputEl;
let editorDescriptionInputEl;
let editorPathButtonEl;
let newEditorWarningEl;
let locationTipEl;

let setUpEditorButtonEl;
let deleteEditorButtonEl;

let buttonsEl;

let infoDisplayedEls;
let infoEditableEls;

let storedData;
let newEditor;

function init() {
    editorListEl = document.getElementById('editorList');

    editorNameEl = document.getElementById('editorName');
    editorTypeEl = document.getElementById('editorType');
    editorDescriptionEl = document.getElementById('editorDescription');
    editorPathEl = document.getElementById('editorPath');
    setUpEditorButtonEl = document.getElementById('setUpEditorButton');
    deleteEditorButtonEl = document.getElementById('deleteEditorButton');

    editorNameInputEl = document.getElementById('editorNameInput');
    editorDescriptionInputEl = document.getElementById('editorDescriptionInput');
    editorPathButtonEl = document.getElementById('editorPathButton');
    
    newEditorWarningEl = document.getElementById('newEditorWarning');
    newEditorWarningEl.style.display = 'none';
    locationTipEl = document.getElementById('locationTip');
    locationTipEl.style.display = 'none';

    buttonsEl = document.getElementById('buttons');

    infoDisplayedEls = Array.prototype.slice.call(document.getElementsByClassName('infoDisplayed'));
    infoEditableEls = Array.prototype.slice.call(document.getElementsByClassName('infoEditable'));

    storedData = remote.getGlobal('storedData');
    newEditor = remote.getGlobal('newEditor');

    updateEditorList();
    checkSelectedEditor();
    setInfoEditable(false);
    updateDisplayedInfo();
}

function getCurEditor() {
    return isAddingNewEditor? newEditor: storedData.editors[storedData.editorIndex];
}

function updateEditorList() {
    // clear the previous list
    editorListEl.innerHTML = '';

    // populate bitsy editors list according to data stored in global object
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
        labelEl.className = 'editorListLabel bigText';

        editorListEl.appendChild(inputEl);
        editorListEl.appendChild(labelEl);
    });
}

function checkSelectedEditor() {
    const editorListControls = editorListEl.elements;
    for (let index = 0; index < editorListControls.length; index++) {
        if (index === storedData.editorIndex) {
            editorListControls[index].checked = true;
        }
    }
}

function onAddEditorShow(event) {
    isAddingNewEditor = true;

    // uncheck all editors in the list, but don't change editorIndex in data yet
    const editorListControls = editorListEl.elements;
    for (let index = 0; index < editorListControls.length; index++) {
        editorListControls[index].checked = false;
    }

    // hide buttons
    buttonsEl.style.display = 'none';

    // reset editable fields in editor info panel
    clearInputs();

    // for now it can only be local
    editorTypeEl.innerText = 'local';

    // show editable fields in editor info panel
    setInfoEditable(true);
}

function onConfirmEditor(event) {
    // todo: check if all fields are valid and add editor data
    // todo: update editor list
    // todo: change editor index so that new editor is selected
    const curEditor = getCurEditor();
    const newName = editorNameInputEl.value;
    console.log('newName ' + newName);
    // console.log('path ' + curEditor.editorPath);
    if (newName.length < 1 || (!curEditor.editorPath || curEditor.editorPath.length < 1)) {
        // show warning
        newEditorWarningEl.style.display = 'block';
        return;
    }

    curEditor.name = newName;
    curEditor.description = editorDescriptionInputEl.value;
    // editor path is already set

    if (isAddingNewEditor) {
        // just pushing into storedData.editors doesn't work for some reason..
        const updatedEditors = [...storedData.editors, curEditor];
        storedData.editors = updatedEditors;
        console.log(curEditor);
        console.log(storedData.editors);
        storedData.editorIndex = storedData.editors.length - 1;
    }

    ipcRenderer.send('saveData');

    exitEditing();
}

function onCancelEditor(event) {
    exitEditing();
}

function exitEditing() {
    ipcRenderer.send('resetNewEditor');
    updateEditorList();
    isAddingNewEditor = false;
    setInfoEditable(false);
    checkSelectedEditor();
    updateDisplayedInfo();
    buttonsEl.style.display = 'block';
}

function onSetUpEditor(event) {
    // hide buttons
    buttonsEl.style.display = 'none';

    // update editable fields in editor info panel
    updateInputs();

    // show editable fields in editor info panel
    setInfoEditable(true);
}

ipcRenderer.on('resetNewEditorReply', (event, arg) => {
    newEditor = remote.getGlobal('newEditor');
})

ipcRenderer.on('setEditorPathReply', (event, arg) => {
    // update path display
    editorPathEl.innerText = getCurEditor().editorPath;
})

function onSetEditorPath(event) {
    const kind = isAddingNewEditor? 'new': 'current';
    ipcRenderer.send('setEditorPath', kind);
}

function onDeleteEditor(event) {
    if (!window.confirm(`delete ${getCurEditor().name} from the list of editors?`)) {
        return;
    }
    // just changing storedData.editors directly doesn't work for some reason..
    const updatedEditors = [...storedData.editors];
    updatedEditors.splice(storedData.editorIndex, 1);
    storedData.editors = updatedEditors;
    storedData.editorIndex = Math.max(storedData.editorIndex - 1, 0);
    ipcRenderer.send('saveData');
    updateEditorList();
    checkSelectedEditor();
    setInfoEditable(false);
    updateDisplayedInfo();
}

function onSwitchEditor(event) {
    console.log('switched editor to ' + this.value);

    // update data
    storedData.editorIndex = parseInt(this.value);
    ipcRenderer.send('saveData');

    // update ui
    updateDisplayedInfo();

    // if (isAddingNewEditor) {
        onCancelEditor(event);
    // }
}

function updateDisplayedInfo() {
    const curEditor = getCurEditor();
    editorNameEl.innerText = curEditor.name;
    editorTypeEl.innerText = curEditor.type.replace(/([A-Z]+)/g, " $1").replace(/([A-Z][a-z])/g, " $1").toLowerCase();
    editorDescriptionEl.innerText = curEditor.description;
    if (curEditor.type === 'builtinVanilla') {
        setUpEditorButtonEl.style.display = "none";
        deleteEditorButtonEl.style.display = "none";
    } else {
        setUpEditorButtonEl.style.display = "inline";
        deleteEditorButtonEl.style.display = "inline";
    }
}

function updateInputs() {
    const curEditor = getCurEditor();
    
    editorNameInputEl.value = curEditor.name;
    editorDescriptionInputEl.value = curEditor.description;
    editorPathEl.innerText = curEditor.editorPath;
}

function clearInputs() {
    editorNameInputEl.value = '';
    editorDescriptionInputEl.value = '';
    editorPathEl.innerText = '';
}

function onToggleEditorTip(event) {
    const newDisplay = locationTipEl.style.display === 'none'? 'block': 'none';
    locationTipEl.style.display = newDisplay;
}

function setInfoEditable(bool) {
    infoEditableEls.forEach(el => {
        const on = el.tagName === 'SPAN'? 'inline': 'block';
        el.style.display = bool? on: 'none';
    });
    infoDisplayedEls.forEach(el => {
        const on = el.tagName === 'SPAN'? 'inline': 'block';
        el.style.display = bool? 'none': on;
        newEditorWarningEl.style.display = 'none';
        locationTipEl.style.display = 'none';
    });
}

function onRunEditor(event) {
    console.log(`i'm going to run editor number ${storedData.editorIndex}, ${storedData.editors[storedData.editorIndex].name}!`)
    ipcRenderer.send('runEditor');
}

document.addEventListener('DOMContentLoaded', init);
