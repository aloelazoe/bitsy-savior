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
2. `ctrl+s`: patch game data in html file with bitsy game without modifying anything else. so you can add hacks to your html file, then patch data, and hacks are still going to be there
3. `ctrl+e`: save game data as a separate text file
4. `ctrl+shift+s`: patch game data in html file, always opens a file-choosing dialog, like 'save as' option you would often see in other programs
5. `ctrl+shift+e`: export game data, always show file-choosing dialog
6. `ctrl+d`: patch and export at the same time

## how to run bitsy-savior from source
you will need [node.js and npm](https://nodejs.org/en/) to be installed
1. clone or download this repository
2. navigate to bitsy-savior folder with command line
3. run `npm install`
4. run `npm start`
