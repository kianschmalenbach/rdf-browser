#!/bin/bash
rm build/* -r
mkdir build
mkdir build/controller
mkdir build/view
mkdir build/img
cp src/controller/* build/controller -r
cp src/view/* build/view -r
cp img/* build/img -r
npm run browserify
exit 0
