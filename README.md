# bitsy-savior
[bitsy editor](https://ledoux.itch.io/bitsy) by [Adam Le Doux](https://twitter.com/adamledoux) packaged as a desktop app that can save things

bitsy cat the savior! here they come!!! no longer will you need to copy-paste bitsy data into your exported bitsy game with all the [hacks](https://github.com/seleb/bitsy-hacks)! because bitsy savior can update game data in that html file as you work ✨✨✨

whenever you make changes in the editor, it will update game data, keeping everything else in the file untouched

## how to use
you will find most of the new useful stuff in the 'File' menu

also keep an eye on window title: it will show files that you are currently saving to. unsaved changes will be marked with • symbol

there are shortcuts for each action (use `cmd` instead of `ctrl` if you are on mac)

1. `ctrl+o`: load game data from file and remember this file as a saving path for when you make changes in the editor. it is advised that you use this command instead of `upload game` from the download panel or copy-pasting new bitsy data in game data panel. it works more reliably when importing from html and provides a safer way to switch between different bitsy games. there are two kinds of files you can open:
    * text file with bitsy data ending with `.txt` or `.bitsy`
    * html file with a bitsy game
1. `ctrl+s`: patch game data in html file with a bitsy game without modifying anything else. you can add hacks to your html file, patch data, and hacks are still going to be there
1. `ctrl+e`: save game data as a separate text file
1. `ctrl+d`: patch and export at the same time, ensuring that both files will have identical game data
1. `ctrl+shift+s`: patch game data in html file, always opens a file-choosing dialog, like 'save as' option you would often see in other programs
1. `ctrl+shift+e`: export game data, always show file-choosing dialog
1. `ctrl+alt+s`: save as new html. equivalent of 'download game' from the download panel in web version of bitsy, but also remembers where you are saving so that you can patch this file later
1. `ctrl+r`: run bitsy game in browser - will save everything and open html file you are patching

## custom editor patch
you can choose a javascript file to execute when bitsy-editor has finished loading

go to `File -> Settings -> Set editor patch` if you are on windows or linux

or `bitsy-savior -> Preferences -> Set editor patch` if you are on mac

this is useful to tweak style and layout of the editor, for [example](https://gist.github.com/aloelazoe/0e66f25714eca46aa30e718b6454f880) to have wider text areas for room and drawing names

## notes
bitsy-savior is still in development and some things can change in the near future

all feedback is welcome. you can leave a comment [here](https://aloelazoe.itch.io/bitsy-savior), dm me on twitter [(@aloelazoe)](https://twitter.com/aloelazoe) or report a bug [here](https://github.com/aloelazoe/bitsy-savior/issues)

there are also these things to keep in mind:

* when you patch html with a bitsy game, it will only update game data. things like window size or background color that you can configure in bitsy settings panel won't be updated
* when you need to open a different bitsy game, please use "File -> Open" option to do that, rather than copy-pasting different game data. this will make sure you won't accidentally overwrite your other bitsy game with the new data
* please keep the following in mind when you are working with both "patch" (html with a bitsy game) and "export" (game data exported to a separate text file) to save bitsy-data. when you reopen bitsy-savior, it remembers the paths and opens the files you worked on in your last session. it will load game data from the file you last saved to. if you worked with both "patch" and "export" files and saved both at the same time, it will load game data from "export" file, assuming that if you wanted to modify raw game data outside of the editor, you would do it in a separate text file then copy/paste everything wherever you need, rather than modifying the data in html file. if you want to load data from a different file, just open it through "File -> Open" menu before you save anything
* the context menu for text fields (right click to copy/paste and such) isn't there yet, but you can use options from 'Edit' menu and the usual `ctrl+c`/`ctrl+v`
* `new game` and `reset game data` buttons in the bitsy editor will also reset patch & export saving paths - you can be sure it won't accidentally overwrite those files with new data

## how to run bitsy-savior from source
you will need [git](https://git-scm.com/) and [node.js](https://nodejs.org/en/) to be installed
1. `git clone --recurse-submodule https://github.com/aloelazoe/bitsy-savior.git`
1. `cd bitsy-savior`
1. `npm install`
1. `npm start`
