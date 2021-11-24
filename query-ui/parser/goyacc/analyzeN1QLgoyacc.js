/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

/*
 * Use the goyacc parser to analyze the n1ql.y goyacc grammar, and rewrite it
 */

import antlr4 from 'antlr4';
import goyaccLexer from './goyaccParser/goyaccLexer.js';
import goyaccParser from './goyaccParser/goyaccParser.js';
import goyaccListener from './goyaccParser/goyaccListener.js';
import * as fs from 'fs';

const { CommonTokenStream, InputStream } = antlr4;

var reservedWords = /(let|delete|returns)/i;

class MyGoyaccListener extends goyaccListener {
  constructor(obuf) {
    super();
    this.obuf = obuf;
  }

  // We can't have rules with certain names, so add underscore
  renameIfNeeded(word) {
    var match = reservedWords.exec(word);
    if (match && match[0].length == word.length)
      return(word + "_");
    else
      return(word);
  }

  // Exit a parse tree produced by goyaccParser#file.
  exitFile(ctx) {
    console.log(this.obuf.join(''));
  }

  // Enter a parse tree produced by goyaccParser#parser_rule.
  enterParser_rule(ctx) {
    this.currentProductions = [];
  }

  // Exit a parse tree produced by goyaccParser#parser_rule.
  exitParser_rule(ctx) {
    var ruleName = this.renameIfNeeded(ctx.Word().getText());
    this.obuf.push(ruleName + ": " +
      this.currentProductions.join('\n\t| ') + '\n;\n');
  }

  // Exit a parse tree produced by goyaccParser#production.
  exitProduction(ctx) {
    // iterate over the words in the production, ignore the code blocks
    // iterate over the words in the production, ignore the code blocks
    var words = [];
    ctx.Word().forEach(token => words.push(token.getText()));

    // need to replace any instances of the reserved word "returns",
    // and also remove and %pred expressions
    for (var i = 0; i < words.length; i++)
      words[i] = this.renameIfNeeded(words[i]);

    // antlr doesn't support %prec
    if ((i = words.indexOf("%prec")) > -1) {
      words = words.slice(0,i-1);
    }


    this.currentProductions.push(words.join(' '));
  }


}

function main() {
  var n1ql = fs.readFileSync('../../../../goproj/src/github.com/couchbase/query/parser/n1ql/n1ql.y').toString();
  var n1ql_lexer_text = fs.readFileSync('./n1ql_lexer.g4.input');
  var chars = new antlr4.InputStream(n1ql);
  var lexer = new goyaccLexer(chars);
  var tokens = new CommonTokenStream(lexer);
  var parser = new goyaccParser(tokens);

  var tree = parser.file();
  var output = [n1ql_lexer_text]; // build array of strings with output
  var listener = new MyGoyaccListener(output);

  antlr4.tree.ParseTreeWalker.DEFAULT.walk(listener, tree);
}

main();
