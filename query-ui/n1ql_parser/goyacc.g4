/*
 * goyaccLexer.g4
 *
 * The N1QL parser is written is goyacc, and thus is very tightly tied to golang. Furthermore, N1QL is
 * constantly evolving. This has made creating a JavaScript client-side parser highly challenging. The
 * goal of this parser is to parse the N1QL goyacc description, and create an abstract syntax tree from
 * which we can automatically emit an equivalent Antlr grammar.
 */

/* lexer */

grammar goyacc;

MultiLineComment:      '/*' .*? '*/'             -> skip;
SingleLineComment:     '//' ~[\r\n\u2028\u2029]* -> skip;

CodeSection:           '%{' .*? '%}';
UnionSection:          '%union {' .*? '}';

CodeBlock:             '{' ( CodeBlock | ~[{}] )* '}' ;

WhiteSpace:            [ \t\n\r]+ -> skip;

TokenDef:              '%token';
Left:                  '%left';
Right:                 '%right';
Nonassoc:              '%nonassoc';
Type:                  '%type';
Start:                 '%start';
GrammarStart:          '%%';

OpenBrace:             '{';
CloseBrace:            '}';
Colon:                 ':';
SemiColon:             ';';
Comma:                 ',';
Bar:                   '|';

Word:                  ~[\p{White_Space}:]+;



file: header GrammarStart parser_body
;

header: (headerElement)*
;

headerElement: CodeSection
    | UnionSection
    | MultiLineComment
    | SingleLineComment
    | TokenDef (Word)+
    | Left (Word)+
    | Right (Word)+
    | Nonassoc (Word)+
    | Type (Word)+
    | Start (Word)+
;

parser_body: (parser_rule)*
;

parser_rule: Word Colon def
;

def: production SemiColon
    | production Bar def
;

production: (Word | CodeBlock)+
    |
;
