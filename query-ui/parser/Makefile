#
# Makefile for Antlr4 N1QL parser generator
#
# Steps:
#  - build an Antlr4 goyacc parser
#  - parse the goyacc n1ql.y file to extract the grammar rules, adding in a hand-build n1ql lexer from n1ql_lexer.g4.input
#  - compile the generated n1ql.g4 grammar into a javascript parsen
#  - get the antlr4 runtime

all: n1ql/n1qlParser n1ql/n1qlParser/antlr4.js

n1ql/n1qlParser: n1ql/n1ql.g4
	cd n1ql; make

n1ql/n1ql.g4: goyacc/goyaccParser

goyacc/goyaccParser:
	cd goyacc; make

n1ql/n1qlParser/antlr4.js: n1ql/n1qlParser
	cd antlr_runtime; make

clean:
	cd antlr_runtime; make clean
	cd goyacc; make clean
	cd n1ql; make clean
