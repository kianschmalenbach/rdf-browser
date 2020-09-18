#!/bin/bash
rm build/* -r
npm run browserify
cp src/lib build/ -r
cp src/view build/ -r
cp img build/ -r
exit 0
