# bitsy-savior
[bitsy editor](https://ledoux.itch.io/bitsy) by [Adam Le Doux](https://twitter.com/adamledoux) packaged as a desktop app that can save things

bitsy cat the savior! here they come!!! no longer will you need to copy-paste bitsy data into your exported bitsy game with all the [hacks](https://github.com/seleb/bitsy-hacks)! because bitsy savior can update game data in that html file as you work ✨✨✨

whenever you make changes in the editor, it will update game data, keeping everything else in the file untouched

## how to use
you will find most of the new useful stuff in the 'File' menu

also keep an eye on the window title: it will show files that you are currently saving to

there are shortcuts for each action (use `cmd` instead of `ctrl` if you are on mac)

1. `ctrl+o`: load game data from file and remember this file as a saving path for when you make changes in the editor. it is advised that you use this command instead of `upload game` from the download panel or copy-pasting new bitsy data in game data panel. it works more reliably when importing from html and provides a safer way to switch between different bitsy games. there are two kinds of files you can open:
    * text files with bitsy data ending with `.txt` or `.bitsy`
    * html files with a bitsy game
1. `ctrl+s`: patch game data in html file with a bitsy game without modifying anything else. you can add hacks to your html file, patch data, and hacks are still going to be there
1. `ctrl+e`: save game data as a separate text file
1. `ctrl+d`: patch and export at the same time
1. `ctrl+shift+s`: patch game data in html file, always opens a file-choosing dialog, like 'save as' option you would often see in other programs
1. `ctrl+shift+e`: export game data, always show file-choosing dialog
1. `ctrl+alt+s`: save as new html. equivalent of 'download game' from the download panel in web version of bitsy, but also remembers where you are saving so that you can patch this file later
1. `ctrl+r`: run bitsy game in browser - will attempt to open html file you are patching

## custom editor patch
you can choose a javascript file to execute when bitsy-editor has finished loading

go to `File -> Settings -> Set editor patch` if you are on windows or linux

or `bitsy-savior -> Preferences -> Set editor patch` if you are on mac

this is useful to tweak style and layout of the editor, for [example](https://gist.github.com/aloelazoe/0e66f25714eca46aa30e718b6454f880) to have wider text areas for room and drawing names

## how to run bitsy-savior from source
you will need [git](https://git-scm.com/) and [node.js](https://nodejs.org/en/) to be installed
1. `git clone --recurse-submodule https://github.com/aloelazoe/bitsy-savior.git`
1. `cd bitsy-savior`
1. `npm install`
1. `npm start`
