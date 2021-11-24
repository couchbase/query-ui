#!/bin/sh

# Copyright 2021-Present Couchbase, Inc.
#
# Use of this software is governed by the Business Source License included in
# the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
# file, in accordance with the Business Source License, use of this software
# will be governed by the Apache License, Version 2.0, included in the file
# licenses/APL2.txt.

# you may want to see if a newer version is available
curl https://www.antlr.org/download/antlr-javascript-runtime-4.9.2.zip --output antlr.zip
# extract and webpack the runtime
unzip antlr.zip
npx webpack
# make sure runtime has export so we can import it
echo " export default antlr4;" >> dist/antlr4.js
# move runtime to where we need it
cp dist/antlr4.js ../n1ql/n1qlParser

