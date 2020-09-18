#!/bin/bash
rm node\_modules -r -f
npm install
./script/build.sh
rm release -r -f
mkdir release
cd release
mkdir rdf-browser
mkdir rdf-browser/build
cp ../build/* rdf-browser/build/ -r
cp ../manifest.json rdf-browser/
#cp ../img rdf-browser/ -r
mkdir rdf-browser-sources
cp ../src rdf-browser-sources -r
cp ../script rdf-browser-sources -r
cp ../img rdf-browser-sources -r
cp ../manifest.json rdf-browser-sources/
cp ../package.json rdf-browser-sources/
cp ../README.md rdf-browser-sources/
cp ../LICENSE rdf-browser-sources/
zip -m rdf-browser.zip rdf-browser/* -r
rm rdf-browser -r -f
zip -m rdf-browser-sources.zip rdf-browser-sources/* -r
rm rdf-browser-sources -r -f
exit 0
