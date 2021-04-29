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
