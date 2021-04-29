#!/bin/sh
# you may want to see if a newer version is available
curl https://www.antlr.org/download/antlr-javascript-runtime-4.9.2.zip --output antlr.zip
# extract and webpack the runtime
unzip antlr.zip
npx webpack
# make sure runtime has export so we can import it
echo " export default antlr4;" >> dist/antlr4.js
# move runtime to where we need it
cp dist/antlr4.js ../n1ql/n1qlParser

