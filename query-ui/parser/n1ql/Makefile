#
# Makefile for the javascript N1QL parser
#
# this relies on n1ql.g4 which is created in ../goyacc
#

all: javascript_n1ql

javascript_n1ql: n1ql.g4
	java -jar /usr/local/lib/antlr-4.9.1-complete.jar -Dlanguage=JavaScript -o n1qlParser n1ql.g4
	sed -i .bak "s+'antlr4'+'./antlr4.js'+g" n1qlParser/n1ql*.js
	rm n1qlParser/*.bak

clean:
