(function() {

  //
  // the qwQueryPlanService contains utility functions for processing N1QL query
  // plans (a JSON tree-like structure) into other, more useful forms.
  //

  angular.module('qwQuery').factory('qwQueryPlanService', getQwQueryPlanService);

  getQwQueryPlanService.$inject = [];

  function getQwQueryPlanService() {

    var qwQueryPlanService = {};

    //
    qwQueryPlanService.convertPlanJSONToPlanNodes = convertPlanJSONToPlanNodes;
    qwQueryPlanService.analyzePlan = analyzePlan;
    qwQueryPlanService.convertTimeToNormalizedString = convertTimeToNormalizedString;

    //
    // convertPlanJSONToPlanNodes
    //
    // We need to take the query plan, which is a somewhat arbitrary JSON
    // structure and turn it into more of a data-flow tree of PlanNodes, where
    // the root of the tree is the final output of the query, and the root's
    // children are those operators that feed data in to the result, all the way
    // back to the leaves which are the original data scans.
    //
    // usually, elements in JSON all have #operator fields, but in the case
    // of prepared queries, the tree starts as a field called "operator"
    //
    // Some nodes have children that must be traversed:
    //   Sequence has '~children'
    //   Parallel has '~child'
    //   UnionAll has 'children'
    //   UnionScan/IntersectScan have 'scans'
    //   ExceptAll/IntersetAll have 'first' and 'second'
    //   DistinctScan has 'scan'
    //   Authorize has 'child'
    //   Merge has 'as', 'key', 'keyspace', 'delete' and 'update'
    //
    //  Update has 'set_terms' (array of {"path":"...","value":"..."}),
    //             'unset_terms' (array of {"path":"..."})
    //  Let?

    function convertPlanJSONToPlanNodes(plan, predecessor, lists) {

      // sanity check
      if (_.isString(plan))
        return(null);

      // special case: prepared queries

      if (plan.operator)
        return(convertPlanJSONToPlanNodes(plan.operator,null,lists));

      //console.log("Inside analyzePlan");

      // iterate over fields, look for "#operator" field
      var operatorName;
      var fields = [];

      _.forIn(plan,function(value,key) {
        if (key === '#operator')
          operatorName = value;

        var type;
        if (_.isString(value)) type = 'string';
        else if (_.isArray(value)) type = 'array';
        else if (_.isObject(value)) type = 'object';
        else if (_.isNumber(value)) type = 'number';
        else if (_.isNull(value)) type = 'null';
        else type = 'unknown';

        var field = {};
        field[key] = type;
        fields.push(field);
      });

      // at this point we should have an operation name and a field array

      //console.log("  after analyze, got op name: " + operatorName);

      // we had better have an operator name at this point

      if (!operatorName) {
        console.log("Error, no operator found for item, fields were:");
        _.forIn(plan,function(value,key) {
          console.log(" key: " + key);
        });
        console.log(JSON.stringify(plan));
        return(null);
      }

      // if we have a sequence, we analyze the children and append them to the predecessor
      if (operatorName === "Sequence" && plan['~children']) {
        for (var i = 0; i < plan['~children'].length; i++)
          predecessor = convertPlanJSONToPlanNodes(plan['~children'][i],predecessor,lists);

        return(predecessor);
      }

      // parallel groups are like sequences, but they need to wrap their child to mark it as parallel
      else if (operatorName === "Parallel" && plan['~child']) {
        var subsequence = convertPlanJSONToPlanNodes(plan['~child'],null,lists);
        // mark the elements of a parallel subsequence for later annotation
        for (var subNode = subsequence; subNode != null; subNode = subNode.predecessor) {
          if (subNode == subsequence)
            subNode.parallelBegin = true;
          if (subNode.predecessor == null)
            subNode.parallelEnd = true;
          subNode.parallel = true;
        }
        return(new PlanNode(predecessor,plan,subsequence,lists.total_time));
      }

      // Prepare operators have their plan inside prepared.operator
      else if (operatorName === "Prepare" && plan.prepared && plan.prepared.operator) {
        return(convertPlanJSONToPlanNodes(plan.prepared.operator,null,lists));
      }

      // ExceptAll and InterceptAll have 'first' and 'second' subqueries
      else if (operatorName === "ExceptAll" || operatorName === "InterceptAll") {
        var children = [];

        if (plan['first'])
          children.push(convertPlanJSONToPlanNodes(plan['first'],null,lists));

        if (plan['second'])
          children.push(convertPlanJSONToPlanNodes(plan['second'],null,lists));

        if (children.length > 0)
          return(new PlanNode(children,plan,null,lists.total_time));
        else
          return(null);
      }

      // Merge has two children: 'delete' and 'update'
      else if (operatorName === "Merge") {
        var children = [];

        if (plan['delete'])
          children.push(convertPlanJSONToPlanNodes(plan['delete'],null,lists));

        if (plan['update'])
          children.push(convertPlanJSONToPlanNodes(plan['update'],null,lists));

        if (children.length > 0)
          return(new PlanNode(children,plan,null,lists.total_time));
        else
          return(null);
      }

      // Authorize operators have a single child called 'child'
      else if (operatorName === "Authorize" && plan['child']) {
        return(new PlanNode(convertPlanJSONToPlanNodes(plan['child'],null,lists),plan,null,lists.total_time));
      }

      // DistinctScan operators have a single child called 'scan'
      else if (operatorName === "DistinctScan" && plan['scan']) {
        return(new PlanNode(convertPlanJSONToPlanNodes(plan['scan'],null,lists),plan),null,lists.total_time);
      }

      // UNION operators will have an array of predecessors drawn from their "children".
      // we expect predecessor to be null if we see a UNION
      else if (operatorName === "UnionAll" && plan['children']) {
        if (predecessor != null)
          console.log("ERROR: Union with unexpected predecessor: " + JSON.stringify(predecessor));

        var unionChildren = [];

        for (var i = 0; i < plan['children'].length; i++)
          unionChildren.push(convertPlanJSONToPlanNodes(plan['children'][i],null,lists));

        return(new PlanNode(unionChildren,plan,null,lists.total_time));
      }

      // Similar to UNIONs, IntersectScan, UnionScan group a number of different scans
      // have an array of 'scan' that are merged together

      else if ((operatorName == "UnionScan") || (operatorName == "IntersectScan")) {
        var scanChildren = [];

        for (var i = 0; i < plan['scans'].length; i++)
          scanChildren.push(convertPlanJSONToPlanNodes(plan['scans'][i],null,lists));

        return(new PlanNode(scanChildren,plan,null,lists.total_time));
      }

      // ignore FinalProject, IntermediateGroup, and FinalGRoup, which don't add anything

      else if (operatorName == "FinalProject" ||
          operatorName == "IntermediateGroup" ||
          operatorName == "FinalGroup") {
        return(predecessor);
      }

      // for all other operators, create a plan node
      else {
        return(new PlanNode(predecessor,plan,null,lists.total_time));
      }

    }


    //
    // structure analyzing explain plans. A plan is an object with an "#operator" field, and possibly
    // other fields depending on the operator, some of the fields may indicate child operators
    //

    function PlanNode(predecessor, operator, subsequence, total_query_time) {
      this.predecessor = predecessor; // might be an array if this is a Union node
      this.operator = operator;       // object from the actual plan
      this.subsequence = subsequence; // for parallel ops, arrays of plan nodes done in parallel
      if (total_query_time && operator['#time_absolute'])
        this.time_percent = Math.round(operator['#time_absolute']*1000/total_query_time)/10;
    }

    // how 'wide' is our plan tree?
    PlanNode.prototype.BranchCount = function() {
      if (this.predecessor == null)
        return(1);
      else {
        // our width is the max of the predecessor and the subsequence widths
        var predWidth = 0;
        var subsequenceWidth = 0;

        if (!_.isArray(this.predecessor))
          predWidth = this.predecessor.BranchCount();
        else
          for (var i=0; i < this.predecessor.length; i++)
            predWidth += this.predecessor[i].BranchCount();

        if (this.subsequence != null)
          subsequenceWidth = this.subsequence.BranchCount();

        if (subsequenceWidth > predWidth)
          return(subsequenceWidth);
        else
          return(predWidth);
      }
    }

    // how 'deep' is our plan tree?
    PlanNode.prototype.Depth = function() {
      var ourDepth = this.subsequence ? this.subsequence.Depth() : 1;

      if (this.predecessor == null)
        return(ourDepth);
      else if (!_.isArray(this.predecessor))
        return(ourDepth + this.predecessor.Depth());
      else {
        var maxPredDepth = 0;
        for (var i=0; i < this.predecessor.length; i++)
          if (this.predecessor[i].Depth() > maxPredDepth)
            maxPredDepth = this.predecessor[i].Depth();

        return(maxPredDepth + 1);
      }
    }

    //
    // get the user-visible name for a PlanNode
    //

    PlanNode.prototype.GetName = function() {
      // make sure we actually have a name
      if (!this.operator || !this.operator['#operator'])
        return(null);

      switch (this.operator['#operator']) {
      case "InitialProject": // we really want to all InitialProject just plain "Project"
        return("Project");

      case "InitialGroup":
        return("Group");

        // default: return the operator's name
      default:
        return(this.operator['#operator']);
      }
    }

    //
    // should the op be marked for:
    //  2) warning (probably expensive),
    //  1) attention (possibly expensive)
    //  0) don't mark
    //

    PlanNode.prototype.GetCostLevel = function() {
      var op = this.operator;
      // for now, the only unambiguously expensive operations are:
      // - PrimaryScan
      // - IntersectScan
      // we want to add correlated subqueries, but info on those in not yet
      // in the query plan. Other ops may be added in future.

      if (!op || !op['#operator'])
        return(0);

      switch (op['#operator']) {
      case "PrimaryScan":
      case "IntersectScan":
        return(2);

      }

      return(0);
    }

    //
    // get an array of node attributes that should be shown to the user
    //

    PlanNode.prototype.GetDetails = function() {
      var result = [];
      var op = this.operator;

      if (!op || !op['#operator'])
        return(result);

      // depending on the operation, extract different fields
      switch (op['#operator']) {

      case "IndexScan": // for index scans, show the keyspace
        result.push("by: " + op.keyspace + "." + op.index);
        break;

      case "PrimaryScan": // for primary scan, show the index name
        result.push(op.keyspace);
        break;

      case "InitialProject":
        result.push(op.result_terms.length + " terms");
        break;

      case "Fetch":
        result.push(op.keyspace + (op.as ? " as "+ op.as : ""));
        break;

      case "Alias":
        result.push(op.as);
        break;

      case "Limit":
      case "Offset":
        result.push(op.expr);
        break;

      case "Join":
        result.push(op.keyspace + (op.as ? " as "+op.as : "") + ' on ' + op.on_keys);
        break;

      case "Order":
        if (op.sort_terms) for (var i = 0; i < op.sort_terms.length; i++)
          result.push(op.sort_terms[i].expr);
        break;

      case "InitialGroup":
      case "IntermediateGroup":
      case "FinalGroup":
        if (op.aggregates && op.aggregates.length > 0) {
          var aggr = "Aggrs: ";
          for (var i=0; i < op.aggregates.length; i++)
            aggr += op.aggregates[i];
          result.push(aggr);
        }

        if (op.group_keys && op.group_keys.length > 0) {
          var keys = "By: ";
          for (var i=0; i < op.group_keys.length; i++)
            keys += op.group_keys[i];
          result.push(keys);
        }
        break;

      case "Filter":
        result.push(op.condition);
        break;
      }

      // if we get operator timings, put them at the end of the details
      if (op['#time_normal']) {
        result.push('Time: ' + op['#time_normal']);
      }
      if (this.time_percent && this.time_percent > 0)
        result.push('(' + this.time_percent + '%)');

      return(result);
    }

    //
    // for debugging, this function prints out the plan to console.log
    //

    PlanNode.prototype.Print = function(indent) {
      var result = '';
      for (var i = 0; i < indent; i++)
        result += ' ';
      var opName = this.operator['#operator'];
      result += opName ? opName : "unknown op";
      result += " (" + this.BranchCount() + "," + this.Depth() + "), pred: " + this.predecessor;
      console.log(result);

      if (this.subsequence)
        this.subsequence.Print(indent + 2);

      if (this.predecessor)
        if (_.isArray(this.predecessor)) for (var i = 0; i < this.predecessor.length; i++) {
          result = '';
          for (var j = 0; j < indent+2; j++)
            result += ' ';
          console.log(result + "branch " + i)
          this.predecessor[i].Print(indent + 4);
        }
        else
          this.predecessor.Print(indent);
    }


    //
    // When we get a query plan, we want to create a list of buckets and fields referenced
    // by the query, so we can point out possible misspelled names
    //
    //   Sequence has '~children'
    //   Parallel has '~child'
    //   UnionAll has 'children'
    //   UnionScan/IntersectScan have 'scans'
    //   ExceptAll/IntersetAll have 'first' and 'second'
    //   DistinctScan has 'scan'
    //   Authorize has 'child'
    //   Merge has 'as', 'key', 'keyspace', 'delete' and 'update'


    function analyzePlan(plan, lists) {

      if (!lists)
        lists = {buckets : {}, fields : {}, indexes: {}, aliases: [], total_time: 0.0};

      // make

      if (!plan || _.isString(plan))
        return(null);

      // special case: prepared queries are marked by an "operator" field

      if (plan.operator)
        return(analyzePlan(plan.operator,null));

      //console.log("Inside analyzePlan: " + JSON.stringify(plan,null,true));

      // iterate over fields, look for "#operator" field
      var operatorName;
      var fields = [];

      _.forIn(plan,function(value,key) {
        if (key === '#operator')
          operatorName = value;

        var type;
        if (_.isString(value)) type = 'string';
        else if (_.isArray(value)) type = 'array';
        else if (_.isObject(value)) type = 'object';
        else if (_.isNumber(value)) type = 'number';
        else if (_.isNull(value)) type = 'null';
        else type = 'unknown';

        var field = {};
        field[key] = type;
        fields.push(field);
      });

      // at this point we should have an operation name and a field array
      //console.log("  after analyze, got op name: " + operatorName);
      // we had better have an operator name at this point

      if (!operatorName) {
        console.log("Error, no operator found for item: " + JSON.stringify(plan));
        return(lists);
      }

      // if the operator has timing information, convert to readable and analyzable forms:
      if (plan['#time']) {
        var parsedTime = convertTimeToNormalizedString(plan['#time']);
        plan['#time_normal'] = parsedTime;
        plan['#time_absolute'] = parseInt(parsedTime.substr(1,2))*60 + parseFloat(parsedTime.substr(3));
        lists.total_time += plan['#time_absolute'];
        //console.log("Got time:" + plan['#time'] + ", parsed: " + plan['#time_normal'] + ', abs: ' + plan['#time_absolute']);
      }

      // if we have a sequence, we analyze the children in order
      if (operatorName === "Sequence" && plan['~children']) {
        // a sequence may have aliases that rename buckets, but those aliases become invalid after
        // the sequence. Remember how long the sequence was at the beginning.
        var initialAliasLen = lists.aliases.length;

        for (var i = 0; i < plan['~children'].length; i++) {
          // if we see a fetch, remember the keyspace for subsequent projects
          if (plan['~children'][i]['#operator'] == "Fetch")
            lists.currentKeyspace = plan['~children'][i].keyspace;
          analyzePlan(plan['~children'][i], lists);
        }

        // remove any new aliases
        lists.aliases.length = initialAliasLen;
        return(lists);
      }

      // parallel groups are like sequences, but with only one child
      else if (operatorName === "Parallel" && plan['~child']) {
        analyzePlan(plan['~child'],lists);
        return(lists);
      }





      // Prepare operators have their plan inside prepared.operator
      else if (operatorName === "Prepare" && plan.prepared && plan.prepared.operator) {
        analyzePlan(plan.prepared.operator,lists);
        return(lists);
      }

      // ExceptAll and InterceptAll have 'first' and 'second' subqueries
      else if (operatorName === "ExceptAll" || operatorName === "InterceptAll") {
        if (plan['first'])
          analyzePlan(plan['first'],lists);

        if (plan['second'])
          analyzePlan(plan['second'],lists);

        return(lists);
      }

      // Merge has two children: 'delete' and 'update'
      else if (operatorName === "Merge") {
        if (plan.as)
          lists.aliases.push({keyspace: plan.keyspace, as: plan.as});

        if (plan['delete'])
          analyzePlan(plan['delete'],lists);

        if (plan['update'])
          analyzePlan(plan['update'],lists);

        if (plan.keyspace)
          getFieldsFromExpression(plan.keyspace,lists);

        if (plan.key)
          getFieldsFromExpression(plan.key,lists);

        return(lists);
      }

      // Authorize operators have a single child called 'child'
      else if (operatorName === "Authorize" && plan['child']) {
        analyzePlan(plan['child'],lists);
        return(lists);
      }

      // DistinctScan operators have a single child called 'scan'
      else if (operatorName === "DistinctScan" && plan['scan']) {
        analyzePlan(plan['scan'],lists);
        return(lists);
      }

      // Similar to UNIONs, IntersectScan, UnionScan group a number of different scans
      // have an array of 'scan' that are merged together

      else if ((operatorName == "UnionScan") || (operatorName == "IntersectScan")) {
        for (var i = 0; i < plan['scans'].length; i++)
          analyzePlan(plan['scans'][i],lists);

        return(lists);
      }







      // UNION operators will have an array of predecessors drawn from their "children".
      // we expect predecessor to be null if we see a UNION
      else if ((operatorName == "Union" || operatorName === "UnionAll") && plan['children']) {
        for (var i = 0; i < plan['children'].length; i++)
          analyzePlan(plan['children'][i],lists);

        return(lists);
      }

      // for all other operators, certain fields will tell us stuff:
      //  - keyspace is a bucket name
      //  - index is an index name
      //  - condition is a string containing an expression, fields there are of the form (`keyspace`.`field`)
      //  - expr is the same as condition
      //  - on_keys is an expression
      //  - group_keys is an array of fields

      if (plan.keyspace)
        lists.buckets[plan.keyspace] = true;
      if (plan.index && plan.keyspace)
        lists.indexes[plan.keyspace + "." + plan.index] = true;
      else if (plan.index)
        lists.indexes[plan.index] = true;
      if (plan.group_keys) for (var i=0; i < plan.group_keys.length; i++)
        lists.fields[plan.group_keys[i]] = true;
      if (plan.condition)
        getFieldsFromExpression(plan.condition,lists);
      if (plan.expr)
        getFieldsFromExpression(plan.expr,lists);
      if (plan.on_keys)
        getFieldsFromExpression(plan.on_keys,lists);
      if (plan.as && plan.keyspace)
        lists.aliases.push({keyspace: plan.keyspace, as: plan.as});
      if (plan.result_terms && _.isArray(plan.result_terms))
        for (var i=0; i< plan.result_terms.length; i++) if (plan.result_terms[i].expr )
          if (plan.result_terms[i].expr == "self" && plan.result_terms[i].star &&
              lists.currentKeyspace)
            lists.fields[lists.currentKeyspace + '.*'] = true;
          else
            getFieldsFromExpression(plan.result_terms[i].expr,lists);

      return(lists);
    }

    //
    // pull bucket and field names out of arbitrary expressions
    //
    // field names are expressed in nested parents, the simplest case is:
    //    (`bucket`.`field`)
    // but if there is a subfield, it looks like:
    //    ((`bucket`.`field`).`subfield`)
    // and array references are of the form:
    //    (((`bucket`.`field`)[5]).`subfield`)
    //
    // we need to work inside out, pulling out the bucket name and initial
    // field, then building as we go out.
    //

    function getFieldsFromExpression(expression,lists) {

      //console.log("Got field expr: " + expression);

      var quotation = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/ig;
      var coreFieldRef = /\(`((?:[^`\\]|\\.)+)`\.`((?:[^`\\]|\\.)+)`\)/i;
      var innerFieldRef = /\(inner(?:\.`((?:[^`\\]|\\.)+)`|(\[[^\]]*\]))\)/i;

      // remove anything in quotes, since we want to ignore user strings
      var expr = expression.replace(quotation,"");

      // now look for core field references, record the bucket name, and look
      // for subfield or array references
      var match;
      while ((match = expr.match(coreFieldRef)) != null) {

        // get the bucket name, and see if there is an alias for it
        var bucket = match[1];
        for (var i=0; i < lists.aliases.length; i++)
          if (lists.aliases[i].as == bucket) {
            bucket = lists.aliases[i].keyspace;
            break;
          }
        lists.buckets[bucket] = true;

        // get the first field name
        var field = match[2];

        if (field.indexOf(' ') >= 0 || field.indexOf('-') >= 0)
          field = '`' + field + '`';

        expr = expr.replace(coreFieldRef,"inner");
        while (match = expr.match(innerFieldRef)) {
          if (match[1]) {
            if (match[1].indexOf(' ') >= 0 || match[1].indexOf('-') >= 0)
              field = field + '.`' + match[1] + '`';
            else
              field = field + '.' + match[1];
          }
          else if (match[2]) field = field + "[0]";
          expr = expr.replace(innerFieldRef,"inner");
        }
        lists.fields[bucket + "." + field] = true;
        //console.log("got field: " + bucket + "." + field);
      }

    }

    //
    // convert a duration expression, which might be 3m23.7777s or 234.9999ms or 3.8888s
    // or even 44.999us, to a real time value
    //

    function convertTimeToNormalizedString(timeValue)
    {
      // regex for parsing time values like 3m23.7777s or 234.9999ms or 3.8888s
      // groups: 1: minutes, 2: secs, 3: fractional secs, 4: millis, 5: fract millis
      var durationExpr = /(?:(\d+)m)?(?:(\d+)\.(\d+)s)?(?:(\d+)\.(\d+)ms)?(?:(\d+)\.(\d+)µs)?/;

      var m = timeValue.match(durationExpr);
      //console.log(m[0]);

      if (m) {
        // minutes
        var minutes = "00";
        if (m[1]) // minutes value, should be an int
          if (m[1].length > 1)
            minutes = m[1];
          else
            minutes = '0' + m[1];

        // seconds
        var seconds = "00";
        if (m[2])
          if (m[2].length > 1)
            seconds = m[2];
          else
            seconds = '0' + m[2];

        // milliseconds
        var millis = "0000";
        if (m[3])
          if (m[3].length > 4)
            millis = m[3].substring(0,4);
          else
            millis = m[3];

        if (m[4] && m[5]) {
          // pad millis if necessary
          millis = m[4];
          while (millis.length < 3)
            millis = '0' + millis;

          // add remaining digits and trim
          millis = millis + m[5];
          millis = millis.substring(0,4);
        }

        // ooh, microseconds!
        if (m[6] && m[7]) {
          millis = "000" + m[6];
        }

        return(minutes + ":" + seconds + "." + millis);

        //for (var j=0; j < m.length; j++)
        // console.log("  m[" + j + "] = " + m[j]);
      }
    }


    //
    //
    //
    // all done creating the service, now return it
    //

    return qwQueryPlanService;
  }



})();