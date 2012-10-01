#!/bin/bash

# script for creating a zip and tarball for inclusion in node

unset CDPATH

set -e

rm -rf release *.tgz || true
mkdir release
npm pack --loglevel error >/dev/null
mv *.tgz release
cd release
tar xzf *.tgz

# remove some unnecessary stuff.
rm -rf package/node_modules/*/{test,bench,example}*
rm -rf package/test/{disabled,output,bin,root}*

mkdir node_modules
mv package node_modules/npm

# make the zip for windows users
cp node_modules/npm/bin/*.cmd .
zipname=npm-$(npm -v).zip
zip -q -9 -r -X "$zipname" *.cmd node_modules

# make the tar for node's deps
cd node_modules
tarname=npm-$(npm -v).tgz
tar czf "$tarname" npm

cd ..
mv "node_modules/$tarname" .

rm -rf *.cmd
rm -rf node_modules

echo "release/$tarname"
echo "release/$zipname"
