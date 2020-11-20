lets you open [bitsy editor](https://ledoux.itch.io/bitsy) by [Adam Le Doux](https://twitter.com/adamledoux) and other [bitsy forks](https://aloelazoe.itch.io/bitsy-3d) in a desktop app that can save and patch your files directly  

bitsy cat the savior! here they come!!! no longer will you need to copy-paste bitsy data into your exported bitsy game with all the [hacks](https://github.com/seleb/bitsy-hacks) any time you want to change something and see how it works! because bitsy savior can update game data in that html file with your game as you work ✨✨✨ it also lets you save and load game data quickly as a file instead of having to copy it, and other useful features, and has a shortcut for every command.

if you like it and can support me on [ko-fi](https://ko-fi.com/aloelazoe) please do! it helps a lot 💜  

## how to use

aside from always having a compatible version of bitsy built-in, bitsy savior lets you open custom editors - bitsy forks, new versions of bitsy, or old versions of bitsy that might not be supported. when a bitsy savior feature is not available in the current editor you will see that the option will be grayed out in the 'File' menu. if you  need more details about why a feature isn't working, you can open the console (View -> Toggle Developer Tools) and look for bitsy savior feature status  

after you select and run the editor in the launcher window, you will find most of the  useful stuff in the 'File' menu  

also keep an eye on window title: it will show files that you are currently saving to. unsaved changes will be marked with • symbol

there are shortcuts for each action (use cmd instead of ctrl if you are on mac)

1.  ctrl+o: load game data from file and remember this file as a saving path for when you make changes in the editor. it is advised that you use this command instead of upload game from the download panel or copy-pasting new bitsy data in game data panel. it works more reliably when importing from html and provides a safer way to switch between different bitsy games. there are two kinds of files you can open:
    *   text file with bitsy data ending with .txt or .bitsy
    *   html file with a bitsy game
2.  ctrl+s: patch game data in html file with a bitsy game without modifying anything else. you can add hacks to your html file, patch data, and hacks are still going to be there
3.  ctrl+e: save game data as a separate text file
4.  ctrl+d: patch and export at the same time, ensuring that both files will have identical game data
5.  ctrl+shift+s: patch game data in html file, always opens a file-choosing dialog, like 'save as' option you would often see in other programs
6.  ctrl+shift+e: export game data, always show file-choosing dialog
7.  ctrl+alt+s: save as new html. equivalent of 'download game' from the download panel in web version of bitsy, but also remembers where you are saving so that you can patch this file later
8.  ctrl+r: run bitsy game in browser - will save everything and open html file you are patching

### advanced

you can set up a javascript file to act as a custom patch for bitsy-editor. you can think of it as a set of commands you would run in the console in web version of bitsy

go to "File -> Settings -> Set editor patch" if you are on windows or linux

or "bitsy-savior -> Preferences -> Set editor patch" if you are on mac

## notes

bitsy-savior is still in development and some things can change in the near future

please let me know about your experience! you can hit me up on bitsy discord or on twitter ([@aloelazoe](https://twitter.com/aloelazoe)) or report a bug [here](https://github.com/aloelazoe/bitsy-savior/issues)

there are also these things to keep in mind:

*   when you _patch_ html with a bitsy game, it will only update game data. things like window size or background color that you can configure in bitsy settings panel won't be updated
*   when you need to open a different bitsy game, please use "File -> Open" option to do that, rather than copy-pasting different game data. this will make sure you won't accidentally overwrite your other bitsy game with the new data
*   please keep the following in mind when you are working with both "patch" (html with a bitsy game) and "export" (game data exported to a separate text file) to save bitsy-data. when you reopen bitsy-savior, it remembers the paths and opens the files you worked on in your last session. it will load game data from the file you last saved to. if you worked with both "patch" and "export" files and saved both at the same time, it will load game data from "export" file, assuming that if you wanted to modify raw game data outside of the editor, you would do it in a separate text file then copy/paste everything wherever you need, rather than modifying the data in html file. if you want to load data from a different file, just open it through "File -> Open" menu before you save anything
*   the context menu for text fields (right click to copy/paste and such) isn't there yet, but you can use options from 'Edit' menu and the usual  ctrl+c/ctrl+v 
*   "new game" and "reset game data" buttons in the bitsy editor will also reset patch & export saving paths - you can be sure it won't accidentally overwrite those files with new data
*   it's still a good idea to be careful and make backups once in a while