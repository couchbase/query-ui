define("ace/snippets/n1ql",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.snippetText = "snippet tbl\n\
snippet ind\n\
	create index ${3:$1_$2} on ${1:table}(${2:column});\n\
";
exports.scope = "n1ql";

});
