const {
    remote,
    ipcRenderer
} = require('electron');

let isAddingEditor = false;

let editorListEl;

let editorNameEl;
let editorTypeEl;
let editorDescriptionEl;
let editorPathEl;

let editorNameInputEl;
let editorDescriptionInputEl;
let editorPathButtonEl;

let setUpEditorButtonEl;
let deleteEditorButtonEl;

let buttonsEl;

let infoDisplayedEls;
let infoEditableEls;

let storedData;

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

    buttonsEl = document.getElementById('buttons');

    infoDisplayedEls = Array.prototype.slice.call(document.getElementsByClassName('infoDisplayed'));
    infoEditableEls = Array.prototype.slice.call(document.getElementsByClassName('infoEditable'));

    storedData = remote.getGlobal('storedData');

    updateEditorList();
    checkSelectedEditor();
    setInfoEditable(false);
    updateDisplayedInfo();
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
    isAddingEditor = true;

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
    // todo: change editor index so that new editor is selected
    // todo: update editor list
    exitEditing();
}

function onCancelEditor(event) {
    exitEditing();
}

function exitEditing() {
    isAddingEditor = false;
    setInfoEditable(false);
    checkSelectedEditor();
    updateDisplayedInfo();
    buttonsEl.style.display = 'block';
}

function onSetUpEditor(event) {
    // todo
}

function onDeleteEditor(event) {
    // todo
}

function onSwitchEditor(event) {
    console.log('switched editor to ' + this.value);

    // update data
    storedData.editorIndex = parseInt(this.value);
    ipcRenderer.send('saveData');

    // update ui
    updateDisplayedInfo();

    if (isAddingEditor) onCancelEditor(event);
}

function updateDisplayedInfo() {
    const curEditor =  storedData.editors[storedData.editorIndex];
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
    const curEditor =  storedData.editors[storedData.editorIndex];
    
    editorNameInputEl.value = curEditor.name;
    editorDescriptionInputEl.value = curEditor.description;
    editorPathEl.innerText = curEditor.editorPath;
}

function clearInputs() {
    editorNameInputEl.value = '';
    editorDescriptionInputEl.value = '';
    editorPathEl.innerText = '';
}

function setInfoEditable(bool) {
    infoEditableEls.forEach(el => {
        const on = el.tagName === 'SPAN'? 'inline': 'block';
        el.style.display = bool? on: 'none';
    });
    infoDisplayedEls.forEach(el => {
        const on = el.tagName === 'SPAN'? 'inline': 'block';
        el.style.display = bool? 'none': on;
    });
}

function onRunEditor(event) {
    console.log(`i'm going to run editor number ${storedData.editorIndex}, ${storedData.editors[storedData.editorIndex].name}!`)
    ipcRenderer.send('runEditor');
}

document.addEventListener('DOMContentLoaded', init);
