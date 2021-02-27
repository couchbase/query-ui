#
# Makefile for Antlr4 N1QL parser generator
#
# Steps:
#  - build an Antlr4 goyacc parser
#  - parse the goyacc n1ql.y file to extract the grammar rules, adding in a hand-build n1ql lexer from n1ql_lexer.g4.input
#  - compile the generated n1ql.g4 grammar into whatever languages are needd
#

all: javascript_n1ql

javascript_n1ql: n1ql.g4
	java -jar /usr/local/lib/antlr-4.9.1-complete.jar -Dlanguage=JavaScript -o n1qlParser n1ql.g4

n1ql.g4: analyzeN1QLgoyacc.js goyacc_parser n1ql_lexer.g4.input ../../../goproj/src/github.com/couchbase/query/parser/n1ql/n1ql.y
	node analyzeN1QLgoyacc.js > n1ql.g4

goyacc_parser: goyacc.g4
	java -jar /usr/local/lib/antlr-4.9.1-complete.jar -Dlanguage=JavaScript -o goyaccParser goyacc.g4
