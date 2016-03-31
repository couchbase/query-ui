(function() {

  // some globals used by both the highlighter and the autocompleter
  var keywords = (
      "all|alter|analyze|and|any|array|as|asc|begin|between|binary|boolean|break|bucket|build|by|call|case|cast|cluster|collate|collection|commit|connect|continue|correlate|create|database|dataset|datastore|declare|decrement|delete|derived|desc|describe|distinct|do|drop|each|element|else|end|every|except|exclude|execute|exists|explain|first|flatten|for|force|from|function|grant|group|gsi|having|if|ignore|ilike|in|include|increment|index|infer|inline|inner|insert|intersect|into|is|join|key|keys|keyspace|last|left|let|letting|like|limit|lsm|map|mapping|matched|materialized|merge|minus|missing|namespace|nest|not|null|number|object|offset|on|option|or|order|outer|over|parse|partition|password|path|pool|prepare|primary|private|privilege|procedure|public|raw|realm|reduce|rename|return|returning|revoke|right|role|rollback|satisfies|schema|select|self|semi|set|show|some|start|statistics|string|system:keyspaces|system:indexes|then|to|transaction|trigger|truncate|under|union|unique|unnest|unset|update|upsert|use|user|using|validate|value|valued|values|via|view|when|where|while|with|within|work|xor"
  );
  var keywords_array = keywords.split('|');

  var builtinConstants = (
      "true|false|indexes|keyspaces"
  );
  var builtinConstants_array = builtinConstants.split('|');

  var builtinFunctions = (
      "abs|acos|array_agg|array_append|array_avg|array_concat|array_contains|array_count|array_distinct|array_ifnull|array_length|array_max|array_min|array_position|array_prepend|array_put|array_range|array_remove|array_repeat|array_replace|array_reverse|array_sort|array_sum|asin|atan|atan2|avg|base64|ceil|clock_millis|clock_str|contains|cos|count|date_add_millis|date_add_str|date_diff_millis|date_diff_str|date_part_millis|date_part_str|date_trunc_millis|date_trunc_str|decode_json|degrees|encode_json|encoded_size|exp|floor|greatest|ifinf|ifmissing|ifmissingornull|ifnan|ifnanorinf|ifnull|initcap|is_array|is_atom|is_boolean|is_number|is_object|is_string|least|length|ln|log|lower|ltrim|max|meta|millis|millis_to_str|millis_to_utc|millis_to_zone_name|min|missingif|nanif|neginfif|now_millis|now_str|nullif|object_length|object_names|object_pairs|object_values|pi|poly_length|posinfif|position|power|radians|random|regexp_contains|regexp_like|regexp_position|regexp_replace|repeat|replace|round|rtrim|sign|sin|split|sqrt|str_to_millis|str_to_utc|str_to_zone_name|substr|sum|tan|title|to_array|to_atom|to_boolean|to_number|to_object|to_string|trim|trunc|type|upper|uuid"
  );
  var builtinFunctions_array = builtinFunctions.split('|');

  var dataTypes = (
      ""
  );
  var dataTypes_array = dataTypes.split('|');

  define("ace/mode/n1ql_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],
      function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var N1qlHighlightRules = function() {

      var keywordMapper = this.createKeywordMapper({
        "support.function": builtinFunctions,
        "keyword": keywords,
        "constant.language": builtinConstants,
        "storage.type": dataTypes
      }, "identifier", true);

      this.$rules = {
          "start" : [ {
            token : "comment",
            regex : "--.*$"
          },  {
            token : "comment",
            start : "/\\*",
            end : "\\*/"
          }, {
            token : "string",           // " string
            regex : '".*?"'
          }, {
            token : "string",           // ' string
            regex : "'.*?'"
          }, {
//          token : "string",
//          regex : "[`]?\\w+(\\.\\w+)*[`]?"
//          }, {
            token : "constant.numeric", // float
            regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
          }, {
            token : keywordMapper,
            regex : "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
          }, {
            token : "keyword.operator",
            regex : "\\+|\\-|\\/|\\/\\/|%|<@>|@>|<@|&|\\^|~|<|>|<=|=>|==|!=|<>|="
          }, {
            token : "paren.lparen",
            regex : "[\\(]"
          }, {
            token : "paren.rparen",
            regex : "[\\)]"
          }, {
            token : "text",
            regex : "\\s+"
          } ]
      };
      this.normalizeRules();
    };

    oop.inherits(N1qlHighlightRules, TextHighlightRules);

    exports.N1qlHighlightRules = N1qlHighlightRules;
  });


  /*
   * We need to override the 'retrievePrecedingIdentifier' which treats path
   * expressions separated by periods as separate identifiers, when for the purpose
   * of autocompletion, we want to treat paths as a single identifier.
   */

  var util = require("ace/autocomplete/util");
  var ID_REGEX = /[a-z\.:A-Z_0-9\$\-\u00A2-\uFFFF]/;

  util.retrievePrecedingIdentifier = function(text, pos, regex) {
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos-1; i >= 0; i--) {
      if (regex.test(text[i]))
        buf.push(text[i]);
      else
        break;
    }

    return buf.reverse().join("");
  };


  /*
   * Define the N1QL mode
   */

  define("ace/mode/n1ql_completions",["require","exports","module","ace/token_iterator"], function(require, exports, module) {
    "use strict";

    var TokenIterator = require("../token_iterator").TokenIterator;


    function is(token, type) {
      return token.type.lastIndexOf(type + ".xml") > -1;
    }

    function findTagName(session, pos) {
      var iterator = new TokenIterator(session, pos.row, pos.column);
      var token = iterator.getCurrentToken();
      while (token && !is(token, "tag-name")){
        token = iterator.stepBackward();
      }
      if (token)
        return token.value;
    }

    var N1qlCompletions = function() {
    };

    (function() {

      this.getCompletions = function(state, session, pos, prefix) {
        var token = session.getTokenAt(pos.row, pos.column);

        // return only matching keywords, constants, or datatypes
        var results = [];

        for (var i=0; i<keywords_array.length; i++)
          if (_.startsWith(keywords_array[i],prefix))
            results.push({value: keywords_array[i], meta: 'keyword', score: 1});

        for (var i=0; i<builtinConstants_array.length; i++)
          if (_.startsWith(builtinConstants_array[i],prefix))
            results.push({value: builtinConstants_array[i], meta: 'built-in', score: 1});

        for (var i=0; i<builtinFunctions_array.length; i++)
          if (_.startsWith(builtinFunctions_array[i],prefix))
            results.push({value: builtinFunctions_array[i], meta: 'function', score: 1});

        for (var i=0; i<dataTypes_array.length; i++)
          if (_.startsWith(dataTypes_array[i],prefix))
            results.push({value: dataTypes_array[i], meta: 'datatype', score: 1});

        return results;
      };


    }).call(N1qlCompletions.prototype);

    exports.N1qlCompletions = N1qlCompletions;
  });

  define("ace/mode/n1ql",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/n1ql_highlight_rules","ace/range"],
      function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var N1qlHighlightRules = require("./n1ql_highlight_rules").N1qlHighlightRules;
    var N1qlCompletions = require("./n1ql_completions").N1qlCompletions;
    var Range = require("../range").Range;

    var Mode = function() {
      this.HighlightRules = N1qlHighlightRules;
      this.$completer = new N1qlCompletions();
    };
    oop.inherits(Mode, TextMode);

    (function() {

      this.lineCommentStart = "--";

      this.getCompletions = function(state, session, pos, prefix) {
        return this.$completer.getCompletions(state, session, pos, prefix);
      };

      this.$id = "ace/mode/n1ql";
    }).call(Mode.prototype);

    exports.Mode = Mode;

  });

})();
