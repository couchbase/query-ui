#
# Make a parsers for goyacc gramars, and translate n1ql.y (a goyacc grammar) into n1ql.g4 (an antlr4 grammar)
#

all: n1ql.g4
	cp n1ql.g4 ../n1ql

n1ql.g4: analyzeN1QLgoyacc.js goyacc_parser n1ql_lexer.g4.input ../../../../goproj/src/github.com/couchbase/query/parser/n1ql/n1ql.y
	echo '{"type":"module"}' > package.json
	node analyzeN1QLgoyacc.js > n1ql.g4

goyacc_parser: goyacc.g4
	java -jar /usr/local/lib/antlr-4.9.1-complete.jar -Dlanguage=JavaScript -o goyaccParser goyacc.g4

clean:
	rm -rf goyaccParser n1ql.g4 package.json

