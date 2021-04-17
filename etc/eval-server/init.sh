#!/bin/bash

mkdir public
mkdir public/conformance
rm public/conformance/* -r 
mkdir public/conformance/upload
rm public/conformance/upload/* -r
mkdir public/performance
rm public/performance/* -r
mkdir public/performance/upload
rm public/performance/upload/* -r
docker build -t eval-server .
