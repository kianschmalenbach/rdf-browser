#!/bin/bash
rm node_modules -r -f
npm install
./script/build.sh
rm release -r -f
mkdir release
cd release || exit 1
mkdir rdf-browser
mkdir rdf-browser/build
cp ../build/* rdf-browser/build/ -r
cp ../manifest.json rdf-browser/
mkdir rdf-browser-sources
cp ../src rdf-browser-sources -r
cp ../script rdf-browser-sources -r
cp ../manifest.json rdf-browser-sources/
cp ../package.json rdf-browser-sources/
cp ../README.md rdf-browser-sources/
cp ../LICENSE rdf-browser-sources/
cd rdf-browser || exit 1
zip -m rdf-browser.zip ./* -r
mv rdf-browser.zip ..
cd ..
rm rdf-browser -r -f
cd rdf-browser-sources || exit 1
zip -m rdf-browser-sources.zip ./* -r
mv rdf-browser-sources.zip ..
cd ..
rm rdf-browser-sources -r -f
exit 0
