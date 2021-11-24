/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

const path = require('path');

module.exports = {
  entry: './antlr4/index.js',
  output: {
    filename: 'antlr4.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: "var",
    library: "antlr4",
  },
  resolve: { fallback: { fs: false }},
  optimization: { minimize: true },
};
