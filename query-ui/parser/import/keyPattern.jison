/* This is a jison grammar for parsing cbimport key generation patterns.     */
/* The result of parsing in an array of pattern elements                     */
/* A pattern element is an object of the form:                               */
/*    {UUID: true}        - put a UUID into the key                          */
/*    {MONO_INCR: true}   - put a monotonically increasing number in the key */
/*    {FIELD: [<path expression as array of strings>]}                       */
/*    {OTHER: <string containing other text to insert into the key>}         */
/* lexical grammar */
%lex
%%
"#UUID#"          return 'UUID'
"#MONO_INCR#"     return 'MONO_INCR'
"#MONO_INCR["([0-9]+)"]#"     return 'MONO_INCR'
"%"               return 'PERCENT'
"##"              return 'QUOTED_HASH'
"."               return 'DOT'
[\w][\w\d]+       return 'IDENTIFIER'
"`"("``"|[^`])+"`"    return 'BACKTICK_IDENTIFIER'
[^%#]+            return 'OTHER'
<<EOF>>           return 'EOF'
/lex
%start top
%% /* language grammar */
top
: pattern {return $1;}
    ;
pattern
: patternElement EOF {$$ = [$1];}
| patternElement pattern {$$ = [$1, ...$2];}
    ;
patternElement
: UUID          {$$ = {UUID: true};}
| MONO_INCR     {$$ = {MONO_INCR: true}; if ($1.length == 11) $$.initialVal = 1; else $$.initialVal = Number($1.slice(11,-2));}
| fieldName     {$$ = {FIELD: $1};}
| OTHER         {$$ = {OTHER: $1};}
| IDENTIFIER    {$$ = {OTHER: $1};}
| BACKTICK_IDENTIFIER {$$ = {OTHER: $1};}
| QUOTED_HASH {$$ = {OTHER: '#'};}
| DOT {$$ = {OTHER: $1};}
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
