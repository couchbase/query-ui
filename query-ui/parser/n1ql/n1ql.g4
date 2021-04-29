/*
 * This is an automotically generated Antlr4 N1QL parser.
 *
 * Actually, the lexer part is hand-generated, and the parser rules are extracted
 * using an Antlr4 parser that parses the rules from the goyacc n1ql.y file.
 */

grammar n1ql;

fragment SingleStringCharacter:   '\'\'' | '\\\'' | '\\' ~['] | ~['\r\n\\];
fragment DoubleStringCharacter:   '\\"'  | '\\' ~["] | ~["\\];

STR:           '\'' SingleStringCharacter* '\''
|              '"' DoubleStringCharacter* '"';

fragment NumStart: '0' | [1-9];
fragment Digit:    [0-9];

fragment Int:      '0' | NumStart Digit*;
fragment Exponent: [eE][+-]? Digit+;

INT:           Int;

NUM:           Int '.' Digit+ Exponent? | Int Exponent;
BLOCK_COMMENT: '/*' .*? '*/';

LINE_COMMENT:  '--' ~[\n\r]*;
WHITESPACE:    [ \t\n\r\f\u00a0]+ -> skip;
DOT:           '.';
PLUS:          '+';
MINUS:         '-' | [mM][iI][nN][uU][sS];
STAR:          '*';
DIV:           '/';
MOD:           '%';
DEQ:           '==';
EQ:            '=';
NE:            '!=' | '<>';
LT:            '<';
LE:            '<=';
GT:            '>';
GE:            '>=';
CONCAT:        '||';
LPAREN:        '(';
RPAREN:        ')';
LBRACE:        '{';
RBRACE:        '}';
COMMA:         ',';
COLON:         ':';
LBRACKET:      '[';
RBRACKET:      ']';
RBRACKET_ICASE:']i';
SEMI:          ';';
NOT_A_TOKEN:   '!';

NAMESPACE_ID: [dD][eE][fF][aA][uU][lL][tT];

ADVISE:       [aA][dD][vV][iI][sS][eE];
ALL:          [aA][lL][lL];
ALTER:        [aA][lL][tT][eE][rR];
ANALYZE:      [aA][nN][aA][lL][yY][zZ][eE];
AND:          [aA][nN][dD];
ANY:          [aA][nN][yY];
ARRAY:        [aA][rR][rR][aA][yY];
AS:           [aA][sS];
ASC:          [aA][sS][cC];
AT:           [aA][tT];
BEGIN:        [bB][eE][gG][iI][nN];
BETWEEN:      [bB][eE][tT][wW][eE][eE][nN];
BINARY:       [bB][iI][nN][aA][rR][yY];
BOOLEAN:      [bB][oO][oO][lL][eE][aA][nN];
BREAK:        [bB][rR][eE][aA][kK];
BUCKET:       [bB][uU][cC][kK][eE][tT];
BUILD:        [bB][uU][iI][lL][dD];
BY:           [bB][yY];
CALL:         [cC][aA][lL][lL];
CASE:         [cC][aA][sS][eE];
CAST:         [cC][aA][sS][tT];
CLUSTER:      [cC][lL][uU][sS][tT][eE][rR];
COLLATE:      [cC][oO][lL][lL][aA][tT][eE];
COLLECTION:   [cC][oO][lL][lL][eE][cC][tT][iI][oO][nN];
COMMIT:       [cC][oO][mM][mM][iI][tT];
COMMITTED:    [cC][oO][mM][mM][iI][tT][tT][eE][dD];
CONNECT:      [cC][oO][nN][nN][eE][cC][tT];
CONTINUE:     [cC][oO][nN][tT][iI][nN][uU][eE];
CORRELATED:   [cC][oO][rR][rR][eE][lL][aA][tT][eE][dD];
COVER:        [cC][oO][vV][eE][rR];
CREATE:       [cC][rR][eE][aA][tT][eE];
CURRENT:      [cC][uU][rR][rR][eE][nN][tT];
DATABASE:     [dD][aA][tT][aA][bB][aA][sS][eE];
DATASET:      [dD][aA][tT][aA][sS][eE][tT];
DATASTORE:    [dD][aA][tT][aA][sS][tT][oO][rR][eE];
DECLARE:      [dD][eE][cC][lL][aA][rR][eE];
DECREMENT:    [dD][eE][cC][rR][eE][mM][eE][nN][tT];
DELETE_:      [dD][eE][lL][eE][tT][eE];
DERIVED:      [dD][eE][rR][iI][vV][eE][dD];
DESC:         [dD][eE][sS][cC];
DESCRIBE:     [dD][eE][sS][cC][rR][iI][bB][eE];
DISTINCT:     [dD][iI][sS][tT][iI][nN][cC][tT];
DO:           [dD][oO];
DROP:         [dD][rR][oO][pP];
EACH:         [eE][aA][cC][hH];
ELEMENT:      [eE][lL][eE][mM][eE][nN][tT];
ELSE:         [eE][lL][sS][eE];
END:          [eE][nN][dD];
EVERY:        [eE][vV][eE][rR][yY];
EXCEPT:       [eE][xX][cC][eE][pP][tT];
EXCLUDE:      [eE][xX][cC][lL][uU][dD][eE];
EXECUTE:      [eE][xX][eE][cC][uU][tT][eE];
EXISTS:       [eE][xX][iI][sS][tT][sS];
EXPLAIN:      [eE][xX][pP][lL][aA][iI][nN];
FALSE:        [fF][aA][lL][sS][eE];
FETCH:        [fF][eE][tT][cC][hH];
FILTER:       [fF][iI][lL][tT][eE][rR];
FIRST:        [fF][iI][rR][sS][tT];
FLATTEN:      [fF][lL][aA][tT][tT][eE][nN];
FLUSH:        [fF][lL][uU][sS][hH];
FOLLOWING:    [fF][oO][lL][lL][oO][wW][iI][nN][gG];
FOR:          [fF][oO][rR];
FORCE:        [fF][oO][rR][cC][eE];
FROM:         [fF][rR][oO][mM];
FTS:          [fF][tT][sS];
FUNCTION:     [fF][uU][nN][cC][tT][iI][oO][nN];
GOLANG:       [gG][oO][lL][aA][nN][gG];
GRANT:        [gG][rR][aA][nN][tT];
GROUP:        [gG][rR][oO][uU][pP];
GROUPS:       [gG][rR][oO][uU][pP][sS];
GSI:          [gG][sS][iI];
HASH:         [hH][aA][sS][hH];
HAVING:       [hH][aA][vV][iI][nN][gG];
IF:           [iI][fF];
IGNORE:       [iI][gG][nN][oO][rR][eE];
ILIKE:        [iI][lL][iI][kK][eE];
IN:           [iI][nN];
INCLUDE:      [iI][nN][cC][lL][uU][dD][eE];
INCREMENT:    [iI][nN][cC][rR][eE][mM][eE][nN][tT];
INDEX:        [iI][nN][dD][eE][xX];
INFER:        [iI][nN][fF][eE][rR];
INLINE:       [iI][nN][lL][iI][nN][eE];
INNER:        [iI][nN][nN][eE][rR];
INSERT:       [iI][nN][sS][eE][rR][tT];
INTERSECT:    [iI][nN][tT][eE][rR][sS][eE][cC][tT];
INTO:         [iI][nN][tT][oO];
IS:           [iI][sS];
ISOLATION:    [iI][sS][oO][lL][aA][tT][iI][oO][nN];
JAVASCRIPT:   [jJ][aA][vV][aA][sS][cC][rR][iI][pP][tT];
JOIN:         [jJ][oO][iI][nN];
KEY:          [kK][eE][yY];
KEYS:         [kK][eE][yY][sS];
KEYSPACE:     [kK][eE][yY][sS][pP][aA][cC][eE];
KNOWN:        [kK][nN][oO][wW][nN];
LANGUAGE:     [lL][aA][nN][gG][uU][aA][gG][eE];
LAST:         [lL][aA][sS][tT];
LEFT:         [lL][eE][fF][tT];
LET_:          [lL][eE][tT];
LETTING:      [lL][eE][tT][tT][iI][nN][gG];
LEVEL:        [lL][eE][vV][eE][lL];
LIKE:         [lL][iI][kK][eE];
LIMIT:        [lL][iI][mM][iI][tT];
LSM:          [lL][sS][mM];
MAP:          [mM][aA][pP];
MAPPING:      [mM][aA][pP][pP][iI][nN][gG];
MATCHED:      [mM][aA][tT][cC][hH][eE][dD];
MATERIALIZED: [mM][aA][tT][eE][rR][iI][aA][lL][iI][zZ][eE][dD];
MERGE:        [mM][eE][rR][gG][eE];
MISSING:      [mM][iI][sS][sS][iI][nN][gG];
NAMESPACE:    [nN][aA][mM][eE][sS][pP][aA][cC][eE];
NEST:         [nN][eE][sS][tT];
NL:           [nN][lL];
NO:           [nN][oO];
NOT:          [nN][oO][tT];
NTH_VALUE:    [nN][tT][hH][_][vV][aA][lL][uU][eE];
NULL:         [nN][uU][lL][lL];
NULLS:        [nN][uU][lL][lL][sS];
NUMBER:       [nN][uN][mM][bB][eE][rR];
OBJECT:       [oO][bB][jJ][eE][cC][tT];
OFFSET:       [oO][fF][fF][sS][eE][tT];
ON:           [oO][nN];
OPTION:       [oO][pP][tT][iI][oO][nN];
OPTIONS:      [oO][pP][tT][iI][oO][nN][sS];
OR:           [oO][rR];
ORDER:        [oO][rR][dD][eE][rR];
OTHERS:       [oO][tT][hH][eE][rR][sS];
OUTER:        [oO][uU][tT][eE][rR];
OVER:         [oO][vV][eE][rR];
PARSE:        [pP][aA][rR][sS][eE];
PARTITION:    [pP][aA][rR][tT][iI][tT][iI][oO][nN];
PASSWORD:     [pP][aA][sS][sS][wW][oO][rR][dD];
PATH:         [pP][aA][tT][hH];
POOL:         [pP][oO][oO][lL];
PRECEDING:    [pP][rR][eE][cC][eE][dD][iI][nN][gG];
PREPARE:      [pP][rR][eE][pP][aA][rR][eE];
PRIMARY:      [pP][rR][iI][mM][aA][rR][yY];
PRIVATE:      [pP][rR][iI][vV][aA][tT][eE];
PRIVILEGE:    [pP][rR][iI][vV][iI][lL][eE][gG][eE];
PROCEDURE:    [pP][rR][oO][cC][eE][dD][uU][rR][eE];
PROBE:        [pP][rR][oO][bB][eE];
PUBLIC:       [pP][uU][bB][lL][iI][cC];
RANGE:        [rR][aA][nN][gG][eE];
RAW:          [rR][aA][wW];
READ:         [rR][eE][aA][dD];
REALM:        [rR][eE][aA][lL][mM];
REDUCE:       [rR][eE][dD][uU][cC][eE];
RENAME:       [rR][eE][nN][aA][mM][eE];
REPLACE:      [rR][eE][pP][lL][aA][cC][eE];
RESPECT:      [rR][eE][sS][pP][eE][cC][tT];
RETURN:       [rR][eE][tT][uU][rR][nN];
RETURNING:    [rR][eE][tT][uU][rR][nN][iI][nN][gG];
REVOKE:       [rR][eE][vV][oO][kK][eE];
RIGHT:        [rR][iI][gG][hH][tT];
ROLE:         [rR][oO][lL][eE];
ROLLBACK:     [rR][oO][lL][lL][bB][aA][cC][kK];
ROW:          [rR][oO][wW];
ROWS:         [rR][oO][wW][sS];
SATISFIES:    [sS][aA][tT][iI][sS][fF][iI][eE][sS];
SAVEPOINT:    [sS][aA][vV][eE][pP][oO][iI][nN][tT];
SCHEMA:       [sS][cC][hH][eE][mM][aA];
SCOPE:        [sS][cC][oO][pP][eE];
SELECT:       [sS][eE][lL][eE][cC][tT];
SELF:         [sS][eE][lL][fF];
SET:          [sS][eE][tT];
SHOW:         [sS][hH][oO][wW];
SOME:         [sS][oO][mM][eE];
START:        [sS][tT][aA][rR][tT];
STATISTICS:   [sS][tT][aA][tT][iI][sS][tT][iI][cC][sS];
STRING:       [sS][tT][rR][iI][nN][gG];
SYSTEM:       [sS][yY][sS][tT][eE][mM];
THEN:         [tT][hH][eE][nN];
TIES:         [tT][iI][eE][sS];
TO:           [tT][oO];
TRAN:         [tT][rR][aA][nN];
TRANSACTION:  [tT][rR][aA][nN][sS][aA][cC][tT][iI][oO][nN];
TRIGGER:      [tT][rR][iI][gG][gG][eE][rR];
TRUE:         [tT][rR][uU][eE];
TRUNCATE:     [tT][rR][uU][nN][cC][aA][tT][eE];
UNBOUNDED:    [uU][nN][bB][oO][uU][nN][dD][eE][dD];
UNDER:        [uU][nN][dD][eE][rR];
UNION:        [uU][nN][iI][oO][nN];
UNIQUE:       [uU][nN][iI][qQ][uU][eE];
UNKNOWN:      [uU][nN][kK][nN][oO][wW][nN];
UNNEST:       [uU][nN][nN][eE][sS][tT];
UNSET:        [uU][nN][sS][eE][tT];
UPDATE:       [uU][pP][dD][aA][tT][eE];
UPSERT:       [uU][pP][sS][eE][rR][tT];
USE:          [uU][sS][eE];
USER:         [uU][sS][eE][rR];
USING:        [uU][sS][iI][nN][gG];
VALIDATE:     [vV][aA][lL][iI][dD][aA][tT][eE];
VALUE:        [vV][aA][lL][uU][eE];
VALUED:       [vV][aA][lL][uU][eE][dD];
VALUES:       [vV][aA][lL][uU][eE][sS];
VIA:          [vV][iI][aA];
VIEW:         [vV][iI][eE][wW];
WHEN:         [wW][hH][eE][nN];
WHERE:        [wW][hH][eE][rR][eE];
WHILE:        [wW][hH][iI][lL][eE];
WINDOW:       [wW][iI][nN][dD][oO][wW];
WITH:         [wW][iI][tT][hH];
WITHIN:       [wW][iI][tT][hH][iI][nN];
WORK:         [wW][oO][rR][kK];
XOR:          [xX][oO][rR];

fragment IdentChar:      '``' | ~[`];
fragment IdentFirstChar: [a-zA-Z_];
fragment IdentLaterChar: [a-zA-Z0-9_];

IDENT_ICASE:   '`' IdentChar+ '`i';
IDENT:         '`' IdentChar+ '`' | IdentFirstChar IdentLaterChar*;
NAMED_PARAM:  '$' IdentFirstChar IdentLaterChar*;
POSITIONAL_PARAM: '$' [1-9] [0-9]*;
NEXT_PARAM:    '?';
input: stmt_body opt_trailer
	| expr_input
;
opt_trailer:
	| opt_trailer SEMI
;
stmt_body: advise
	| explain
	| prepare
	| execute
	| stmt
;
stmt: select_stmt
	| dml_stmt
	| ddl_stmt
	| infer
	| update_statistics
	| role_stmt
	| function_stmt
	| transaction_stmt
;
advise: ADVISE opt_index stmt
;
opt_index:
	| INDEX
;
explain: EXPLAIN stmt
;
prepare: PREPARE opt_force opt_name stmt
;
opt_force:
	| FORCE
;
opt_name:
	| IDENT from_or_as
	| STR from_or_as
;
from_or_as: FROM
	| AS
;
execute: EXECUTE expr execute_using
;
execute_using:
	| USING construction_expr
;
infer: INFER opt_keyspace_collection simple_keyspace_ref opt_infer_using opt_infer_ustat_with
;
opt_keyspace_collection:
	| KEYSPACE
	| COLLECTION
;
opt_infer_using:
;
opt_infer_ustat_with:
	| infer_ustat_with
;
infer_ustat_with: WITH expr
;
select_stmt: fullselect
;
dml_stmt: insert
	| upsert
	| delete_
	| update
	| merge
;
ddl_stmt: index_stmt
	| scope_stmt
	| collection_stmt
;
role_stmt: grant_role
	| revoke_role
;
index_stmt: create_index
	| drop_index
	| alter_index
	| build_index
;
scope_stmt: create_scope
	| drop_scope
;
collection_stmt: create_collection
	| drop_collection
	| flush_collection
;
function_stmt: create_function
	| drop_function
	| execute_function
;
transaction_stmt: start_transaction
	| commit_transaction
	| rollback_transaction
	| savepoint
	| set_transaction_isolation
;
fullselect: select_terms opt_order_by
	| select_terms opt_order_by limit opt_offset
	| select_terms opt_order_by offset opt_limit
;
select_terms: subselect
	| select_terms UNION select_term
	| select_terms UNION ALL select_term
	| select_terms INTERSECT select_term
	| select_terms INTERSECT ALL select_term
	| select_terms EXCEPT select_term
	| select_terms EXCEPT ALL select_term
	| subquery_expr UNION select_term
	| subquery_expr UNION ALL select_term
	| subquery_expr INTERSECT select_term
	| subquery_expr INTERSECT ALL select_term
	| subquery_expr EXCEPT select_term
	| subquery_expr EXCEPT ALL select_term
;
select_term: subselect
	| subquery_expr
;
subselect: from_select
	| select_from
;
from_select: opt_with from opt_let opt_where opt_group opt_window_clause select_clause
;
select_from: opt_with select_clause opt_from opt_let opt_where opt_group opt_window_clause
;
select_clause: SELECT projection
;
projection: opt_quantifier projects
	| opt_quantifier raw expr opt_as_alias
;
opt_quantifier:
	| ALL
	| DISTINCT
;
raw: RAW
	| ELEMENT
	| VALUE
;
projects: project
	| projects COMMA project
;
project: STAR
	| expr DOT STAR
	| expr opt_as_alias
;
opt_as_alias:
	| as_alias
;
as_alias: alias
	| AS alias
;
alias: IDENT
;
opt_from:
	| from
;
from: FROM from_term
;
from_term: simple_from_term
	| from_term opt_join_type JOIN simple_from_term on_keys
	| from_term opt_join_type JOIN simple_from_term on_key FOR IDENT
	| from_term opt_join_type NEST simple_from_term on_keys
	| from_term opt_join_type NEST simple_from_term on_key FOR IDENT
	| from_term opt_join_type unnest expr opt_as_alias
	| from_term opt_join_type JOIN simple_from_term ON expr
	| from_term opt_join_type NEST simple_from_term ON expr
	| simple_from_term RIGHT opt_outer JOIN simple_from_term ON expr
;
simple_from_term: keyspace_term
	| expr opt_as_alias opt_use
;
unnest: UNNEST
	| FLATTEN
;
keyspace_term: keyspace_path opt_as_alias opt_use
;
keyspace_path: namespace_term keyspace_name
	| namespace_term bucket_name DOT scope_name DOT keyspace_name
;
namespace_term: namespace_name
	| SYSTEM COLON
;
namespace_name: NAMESPACE_ID COLON
;
bucket_name: IDENT
;
scope_name: IDENT
;
keyspace_name: IDENT
;
opt_use:
	| USE use_options
;
use_options: use_keys
	| use_index
	| join_hint
	| use_index join_hint
	| join_hint use_index
	| use_keys join_hint
	| join_hint use_keys
;
use_keys: opt_primary KEYS expr
;
use_index: INDEX LPAREN index_refs RPAREN
;
join_hint: HASH LPAREN use_hash_option RPAREN
	| NL
;
opt_primary:
	| PRIMARY
;
index_refs: index_ref
	| index_refs COMMA index_ref
;
index_ref: opt_index_name opt_index_using
;
use_hash_option: BUILD
	| PROBE
;
opt_use_del_upd: opt_use
;
opt_join_type:
	| INNER
	| LEFT opt_outer
;
opt_outer:
	| OUTER
;
on_keys: ON opt_primary KEYS expr
;
on_key: ON opt_primary KEY expr
;
opt_let:
	| let_
;
let_: LET_ bindings
;
bindings: binding
	| bindings COMMA binding
;
binding: alias EQ expr
;
opt_with:
	| WITH with_list
;
with_list: with_term
	| with_list COMMA with_term
;
with_term: alias AS paren_expr
;
opt_where:
	| where
;
where: WHERE expr
;
opt_group:
	| group
;
group: GROUP BY group_terms opt_letting opt_having
	| letting
;
group_terms: group_term
	| group_terms COMMA group_term
;
group_term: expr opt_as_alias
;
opt_letting:
	| letting
;
letting: LETTING bindings
;
opt_having:
	| having
;
having: HAVING expr
;
opt_order_by:
	| order_by
;
order_by: ORDER BY sort_terms
;
sort_terms: sort_term
	| sort_terms COMMA sort_term
;
sort_term: expr opt_dir opt_order_nulls
;
opt_dir:
	| dir
;
dir: ASC
	| DESC
;
opt_order_nulls:
	| nulls first_last
;
first_last: FIRST
	| LAST
;
nulls: NULLS
;
opt_limit:
	| limit
;
limit: LIMIT expr
;
opt_offset:
	| offset
;
offset: OFFSET expr
;
insert: INSERT INTO keyspace_ref opt_values_header values_list opt_returning
	| INSERT INTO keyspace_ref LPAREN key_val_options_expr_header RPAREN fullselect opt_returning
;
simple_keyspace_ref: keyspace_name opt_as_alias
	| keyspace_path opt_as_alias
	| bucket_name DOT scope_name DOT keyspace_name opt_as_alias
;
keyspace_ref: simple_keyspace_ref
	| param_expr opt_as_alias
;
opt_values_header:
	| LPAREN opt_primary KEY COMMA VALUE RPAREN
	| LPAREN opt_primary KEY COMMA VALUE COMMA OPTIONS RPAREN
;
key: opt_primary KEY
;
values_list: values
	| values_list COMMA next_values
;
values: VALUES key_val_expr
	| VALUES key_val_options_expr
;
next_values: values
	| key_val_expr
	| key_val_options_expr
;
key_val_expr: LPAREN expr COMMA expr RPAREN
;
key_val_options_expr: LPAREN expr COMMA expr COMMA expr RPAREN
;
opt_returning:
	| returning
;
returning: RETURNING returns_
;
returns_: projects
	| raw expr
;
key_expr_header: key expr
;
value_expr_header: VALUE expr
;
options_expr_header: OPTIONS expr
;
key_val_options_expr_header: key_expr_header
	| key_expr_header COMMA value_expr_header
	| key_expr_header COMMA value_expr_header COMMA options_expr_header
	| key_expr_header COMMA options_expr_header
;
upsert: UPSERT INTO keyspace_ref opt_values_header values_list opt_returning
	| UPSERT INTO keyspace_ref LPAREN key_val_options_expr_header RPAREN fullselect opt_returning
;
delete_: DELETE_ FROM keyspace_ref opt_use_del_upd opt_where opt_limit opt_returning
;
update: UPDATE keyspace_ref opt_use_del_upd set unset opt_where opt_limit opt_returning
	| UPDATE keyspace_ref opt_use_del_upd set opt_where opt_limit opt_returning
	| UPDATE keyspace_ref opt_use_del_upd unset opt_where opt_limit opt_returning
;
set: SET set_terms
;
set_terms: set_term
	| set_terms COMMA set_term
;
set_term: path EQ expr opt_update_for
	| function_meta_expr DOT path EQ expr
;
function_meta_expr: function_name LPAREN opt_exprs RPAREN
;
opt_update_for:
	| update_for
;
update_for: update_dimensions opt_when END
;
update_dimensions: FOR update_dimension
	| update_dimensions FOR update_dimension
;
update_dimension: update_binding
	| update_dimension COMMA update_binding
;
update_binding: variable IN expr
	| variable WITHIN expr
	| variable COLON variable IN expr
	| variable COLON variable WITHIN expr
;
variable: IDENT
;
opt_when:
	| WHEN expr
;
unset: UNSET unset_terms
;
unset_terms: unset_term
	| unset_terms COMMA unset_term
;
unset_term: path opt_update_for
;
merge: MERGE INTO simple_keyspace_ref opt_use_merge USING simple_from_term ON opt_key expr merge_actions opt_limit opt_returning
;
opt_use_merge: opt_use
;
opt_key:
	| key
;
merge_actions:
	| WHEN MATCHED THEN UPDATE merge_update opt_merge_delete_insert
	| WHEN MATCHED THEN DELETE_ merge_delete opt_merge_insert
	| WHEN NOT MATCHED THEN INSERT merge_insert
;
opt_merge_delete_insert:
	| WHEN MATCHED THEN DELETE_ merge_delete opt_merge_insert
	| WHEN NOT MATCHED THEN INSERT merge_insert
;
opt_merge_insert:
	| WHEN NOT MATCHED THEN INSERT merge_insert
;
merge_update: set opt_where
	| set unset opt_where
	| unset opt_where
;
merge_delete: opt_where
;
merge_insert: expr opt_where
	| key_val_expr opt_where
	| key_val_options_expr opt_where
	| LPAREN key_val_options_expr_header RPAREN opt_where
;
grant_role: GRANT role_list TO user_list
	| GRANT role_list ON keyspace_scope_list TO user_list
;
role_list: role_name
	| role_list COMMA role_name
;
role_name: IDENT
	| SELECT
	| INSERT
	| UPDATE
	| DELETE_
;
keyspace_scope_list: keyspace_scope
	| keyspace_scope_list COMMA keyspace_scope
;
keyspace_scope: keyspace_name
	| namespace_name keyspace_name
	| namespace_name bucket_name DOT scope_name DOT keyspace_name
	| bucket_name DOT scope_name DOT keyspace_name
	| namespace_name bucket_name DOT scope_name
	| bucket_name DOT scope_name
;
user_list: user
	| user_list COMMA user
;
user: IDENT
	| IDENT COLON IDENT
;
revoke_role: REVOKE role_list FROM user_list
	| REVOKE role_list ON keyspace_scope_list FROM user_list
;
create_scope: CREATE SCOPE named_scope_ref
;
drop_scope: DROP SCOPE named_scope_ref
;
create_collection: CREATE COLLECTION named_keyspace_ref
;
drop_collection: DROP COLLECTION named_keyspace_ref
;
flush_collection: flush_or_truncate COLLECTION named_keyspace_ref
;
flush_or_truncate: FLUSH
	| TRUNCATE
;
create_index: CREATE PRIMARY INDEX opt_primary_name ON named_keyspace_ref index_partition opt_index_using opt_index_with
	| CREATE INDEX index_name ON named_keyspace_ref LPAREN index_terms RPAREN index_partition index_where opt_index_using opt_index_with
;
opt_primary_name:
	| index_name
;
index_name: IDENT
;
opt_index_name:
	| index_name
;
named_keyspace_ref: simple_named_keyspace_ref
	| namespace_name bucket_name
	| bucket_name DOT scope_name DOT keyspace_name
;
simple_named_keyspace_ref: keyspace_name
	| namespace_name bucket_name DOT scope_name DOT keyspace_name
;
named_scope_ref: namespace_name bucket_name DOT scope_name
	| bucket_name DOT scope_name
;
index_partition:
	| PARTITION BY HASH LPAREN exprs RPAREN
;
opt_index_using:
	| index_using
;
index_using: USING VIEW
	| USING GSI
	| USING FTS
;
opt_index_with:
	| index_with
;
index_with: WITH expr
;
index_terms: index_term
	| index_terms COMMA index_term
;
index_term: index_term_expr opt_ikattr
;
index_term_expr: index_expr
	| all index_expr
	| all DISTINCT index_expr
	| DISTINCT index_expr
;
index_expr: expr
;
all: ALL
	| EACH
;
index_where:
	| WHERE index_expr
;
opt_ikattr:
	| ikattr
	| ikattr ikattr
;
ikattr: ASC
	| DESC
	| MISSING
;
drop_index: DROP PRIMARY INDEX ON named_keyspace_ref opt_index_using
	| DROP INDEX simple_named_keyspace_ref DOT index_name opt_index_using
	| DROP INDEX index_name ON named_keyspace_ref opt_index_using
;
alter_index: ALTER INDEX simple_named_keyspace_ref DOT index_name opt_index_using index_with
	| ALTER INDEX index_name ON named_keyspace_ref opt_index_using index_with
;
build_index: BUILD INDEX ON named_keyspace_ref LPAREN exprs RPAREN opt_index_using
;
create_function: CREATE opt_replace FUNCTION func_name LPAREN parm_list RPAREN func_body
;
opt_replace:
	| OR REPLACE
;
func_name: short_func_name
	| long_func_name
;
short_func_name: keyspace_name
;
long_func_name: namespace_term keyspace_name
	| namespace_term bucket_name DOT scope_name DOT keyspace_name
;
parm_list:
	| DOT DOT DOT
	| parameter_terms
;
parameter_terms: IDENT
	| parameter_terms COMMA IDENT
;
func_body: LBRACE expr RBRACE
	| LANGUAGE INLINE AS expr
	| LANGUAGE GOLANG AS STR AT STR
	| LANGUAGE JAVASCRIPT AS STR AT STR
;
drop_function: DROP FUNCTION func_name
;
execute_function: EXECUTE FUNCTION func_name LPAREN opt_exprs RPAREN
;
update_statistics: UPDATE STATISTICS opt_for named_keyspace_ref LPAREN update_stat_terms RPAREN opt_infer_ustat_with
	| UPDATE STATISTICS opt_for named_keyspace_ref DELETE_ LPAREN update_stat_terms RPAREN
	| UPDATE STATISTICS opt_for named_keyspace_ref DELETE_ ALL
	| UPDATE STATISTICS opt_for named_keyspace_ref INDEX LPAREN exprs RPAREN opt_index_using opt_infer_ustat_with
	| UPDATE STATISTICS opt_for named_keyspace_ref INDEX ALL opt_index_using opt_infer_ustat_with
	| UPDATE STATISTICS FOR INDEX simple_named_keyspace_ref DOT index_name opt_index_using opt_infer_ustat_with
	| UPDATE STATISTICS FOR INDEX index_name ON named_keyspace_ref opt_index_using opt_infer_ustat_with
	| ANALYZE opt_keyspace_collection named_keyspace_ref LPAREN update_stat_terms RPAREN opt_infer_ustat_with
	| ANALYZE opt_keyspace_collection named_keyspace_ref DELETE_ STATISTICS LPAREN update_stat_terms RPAREN
	| ANALYZE opt_keyspace_collection named_keyspace_ref DELETE_ STATISTICS
	| ANALYZE opt_keyspace_collection named_keyspace_ref INDEX LPAREN exprs RPAREN opt_index_using opt_infer_ustat_with
	| ANALYZE opt_keyspace_collection named_keyspace_ref INDEX ALL opt_index_using opt_infer_ustat_with
	| ANALYZE INDEX simple_named_keyspace_ref DOT index_name opt_index_using opt_infer_ustat_with
	| ANALYZE INDEX index_name ON named_keyspace_ref opt_index_using opt_infer_ustat_with
;
opt_for:
	| FOR
;
update_stat_terms: update_stat_term
	| update_stat_terms COMMA update_stat_term
;
update_stat_term: index_term_expr
;
path: IDENT
	| path DOT IDENT
	| path DOT IDENT_ICASE
	| path DOT LBRACKET expr RBRACKET
	| path DOT LBRACKET expr RBRACKET_ICASE
	| path LBRACKET expr RBRACKET
;
expr: c_expr
	| expr DOT IDENT
	| expr DOT IDENT_ICASE
	| expr DOT LBRACKET expr RBRACKET
	| expr DOT LBRACKET expr RBRACKET_ICASE
	| expr LBRACKET expr RBRACKET
	| expr LBRACKET expr COLON RBRACKET
	| expr LBRACKET expr COLON expr RBRACKET
	| expr LBRACKET STAR RBRACKET
	| expr PLUS expr
	| expr MINUS expr
	| expr STAR expr
	| expr DIV expr
	| expr MOD expr
	| expr CONCAT expr
	| expr AND expr
	| expr OR expr
	| NOT expr
	| expr EQ expr
	| expr DEQ expr
	| expr NE expr
	| expr LT expr
	| expr GT expr
	| expr LE expr
	| expr GE expr
	| expr BETWEEN b_expr AND b_expr
	| expr NOT BETWEEN b_expr AND b_expr
	| expr LIKE expr
	| expr NOT LIKE expr
	| expr IN expr
	| expr NOT IN expr
	| expr WITHIN expr
	| expr NOT WITHIN expr
	| expr IS NULL
	| expr IS NOT NULL
	| expr IS MISSING
	| expr IS NOT MISSING
	| expr IS valued
	| expr IS NOT valued
	| EXISTS expr
;
valued: VALUED
	| KNOWN
;
c_expr: literal
	| construction_expr
	| IDENT
	| IDENT_ICASE
	| SELF
	| param_expr
	| function_expr
	| MINUS
	| case_expr
	| collection_expr
	| paren_expr
	| COVER LPAREN expr RPAREN
;
b_expr: c_expr
	| b_expr DOT IDENT
	| b_expr DOT IDENT_ICASE
	| b_expr DOT LBRACKET expr RBRACKET
	| b_expr DOT LBRACKET expr RBRACKET_ICASE
	| b_expr LBRACKET expr RBRACKET
	| b_expr LBRACKET expr COLON RBRACKET
	| b_expr LBRACKET expr COLON expr RBRACKET
	| b_expr LBRACKET STAR RBRACKET
	| b_expr PLUS b_expr
	| b_expr MINUS b_expr
	| b_expr STAR b_expr
	| b_expr DIV b_expr
	| b_expr MOD b_expr
	| b_expr CONCAT b_expr
;
literal: NULL
	| MISSING
	| FALSE
	| TRUE
	| NUM
	| INT
	| STR
;
construction_expr: object
	| array
;
object: LBRACE opt_members RBRACE
;
opt_members:
	| members
;
members: member
	| members COMMA member
;
member: expr COLON expr
	| expr
;
array: LBRACKET opt_exprs RBRACKET
;
opt_exprs:
	| exprs
;
exprs: expr
	| exprs COMMA expr
;
param_expr: NAMED_PARAM
	| POSITIONAL_PARAM
	| NEXT_PARAM
;
case_expr: CASE simple_or_searched_case END
;
simple_or_searched_case: simple_case
	| searched_case
;
simple_case: expr when_thens opt_else
;
when_thens: WHEN expr THEN expr
	| when_thens WHEN expr THEN expr
;
searched_case: when_thens opt_else
;
opt_else:
	| ELSE expr
;
function_expr: NTH_VALUE LPAREN exprs RPAREN opt_from_first_last opt_nulls_treatment window_function_details
	| function_name LPAREN opt_exprs RPAREN opt_filter opt_nulls_treatment opt_window_function
	| function_name LPAREN agg_quantifier expr RPAREN opt_filter opt_window_function
	| function_name LPAREN STAR RPAREN opt_filter opt_window_function
	| long_func_name LPAREN opt_exprs RPAREN
;
function_name: IDENT
	| REPLACE
;
collection_expr: collection_cond
	| collection_xform
;
collection_cond: ANY coll_bindings satisfies END
	| SOME coll_bindings satisfies END
	| EVERY coll_bindings satisfies END
	| ANY AND EVERY coll_bindings satisfies END
	| SOME AND EVERY coll_bindings satisfies END
;
coll_bindings: coll_binding
	| coll_bindings COMMA coll_binding
;
coll_binding: variable IN expr
	| variable WITHIN expr
	| variable COLON variable IN expr
	| variable COLON variable WITHIN expr
;
satisfies: SATISFIES expr
;
collection_xform: ARRAY expr FOR coll_bindings opt_when END
	| FIRST expr FOR coll_bindings opt_when END
	| OBJECT expr COLON expr FOR coll_bindings opt_when END
;
paren_expr: LPAREN expr RPAREN
	| LPAREN all_expr RPAREN
	| subquery_expr
;
subquery_expr: CORRELATED LPAREN fullselect RPAREN
	| LPAREN fullselect RPAREN
;
expr_input: expr
	| all_expr
;
all_expr: all expr
	| all DISTINCT expr
	| DISTINCT expr
;
opt_window_clause:
	| WINDOW window_list
;
window_list: window_term
	| window_list COMMA window_term
;
window_term: IDENT AS window_specification
;
window_specification: LPAREN opt_window_name opt_window_partition opt_order_by opt_window_frame RPAREN
;
opt_window_name:
	| IDENT
;
opt_window_partition:
	| PARTITION BY exprs
;
opt_window_frame:
	| window_frame_modifier window_frame_extents opt_window_frame_exclusion
;
window_frame_modifier: ROWS
	| RANGE
	| GROUPS
;
opt_window_frame_exclusion:
	| EXCLUDE NO OTHERS
	| EXCLUDE CURRENT ROW
	| EXCLUDE TIES
	| EXCLUDE GROUP
;
window_frame_extents: window_frame_extent
	| BETWEEN window_frame_extent AND window_frame_extent
;
window_frame_extent: UNBOUNDED PRECEDING
	| UNBOUNDED FOLLOWING
	| CURRENT ROW
	| expr window_frame_valexpr_modifier
;
window_frame_valexpr_modifier: PRECEDING
	| FOLLOWING
;
opt_nulls_treatment:
	| nulls_treatment
;
nulls_treatment: RESPECT NULLS
	| IGNORE NULLS
;
opt_from_first_last:
	| FROM first_last
;
agg_quantifier: ALL
	| DISTINCT
;
opt_filter:
	| FILTER LPAREN where RPAREN
;
opt_window_function:
	| window_function_details
;
window_function_details: OVER IDENT
	| OVER window_specification
;
start_transaction: start_or_begin transaction opt_isolation_level
;
commit_transaction: COMMIT opt_transaction
;
rollback_transaction: ROLLBACK opt_transaction opt_savepoint
;
start_or_begin: START
	| BEGIN
;
opt_transaction:
	| transaction
;
transaction: TRAN
	| TRANSACTION
	| WORK
;
opt_savepoint:
	| TO SAVEPOINT savepoint_name
;
savepoint_name: IDENT
;
opt_isolation_level:
	| isolation_level
;
isolation_level: ISOLATION LEVEL isolation_val
;
isolation_val: READ COMMITTED
;
set_transaction_isolation: SET TRANSACTION isolation_level
;
savepoint: SAVEPOINT savepoint_name
;

