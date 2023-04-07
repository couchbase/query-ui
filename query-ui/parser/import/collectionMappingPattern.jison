/* This is a jison grammar for parsing cbimport collection generation patterns. */
/* modified version of keyPattern.jison available in query-ui repo           */
/* The result of parsing in an array of pattern elements                     */
/* A pattern element is an object of the form:                               */
/*    {FIELD: [<path expression as array of strings>]}                       */
/*    {OTHER: <string containing other text to insert into the key>}         */

/* lexical grammar */
%lex
%%

"%"               return 'PERCENT'
"##"              return 'QUOTED_HASH'
"."               return 'DOT'
[\w]+       return 'IDENTIFIER'
"`"("``"|[^`])+"`"    return 'BACKTICK_IDENTIFIER'
[^%# ]+            return 'OTHER'
<<EOF>>           return 'EOF'
/lex

%start top
%% /* language grammar */

top
    : pattern DOT pattern EOF {return [$1, $3];}
    ;
pattern
    : patternElement {$$ = [$1];}
    | patternElement pattern {$$ = [$1, ...$2];}
    ;

patternElement
    : fieldName     {$$ = {FIELD: $1};}
    | OTHER         {$$ = {OTHER: $1};}
    | IDENTIFIER    {$$ = {OTHER: $1};}
    | BACKTICK_IDENTIFIER {$$ = {OTHER: $1};}
    | QUOTED_HASH {$$ = {OTHER: '#'};}
    ;

fieldName
    : PERCENT path PERCENT {$$ = $2;}
    ;

path
    : pathElement {$$ = [$1];}
    | pathElement DOT path {$$ = [$1, ...$3];}
    ;

pathElement
    : IDENTIFIER           {$$ = $1;}
    | BACKTICK_IDENTIFIER  {$$ = $1.slice(1,-1);}
    ;
