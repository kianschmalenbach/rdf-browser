#!/bin/bash
rm build/* -r
cp src/controller build/ -r
cp src/view build/ -r
cp img build/ -r
npm run browserify
exit 0
