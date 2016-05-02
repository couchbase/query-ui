(function() {


  angular.module('qwQuery').controller('qwQueryController', queryController);

  queryController.$inject = ['$rootScope', '$uibModal', '$timeout', 'qwQueryService', 'validateQueryService','mnPools'];

  function queryController ($rootScope, $uibModal, $timeout, qwQueryService, validateQueryService, mnPools) {

    var qc = this;

    //
    // current UI version number
    //

    qc.version = "1.0.2";

    //
    // alot of state is provided by the qwQueryService
    //

    qc.buckets = qwQueryService.buckets;                // buckets on cluster
    qc.gettingBuckets = qwQueryService.gettingBuckets;  // busy retrieving?
    qc.updateBuckets = qwQueryService.updateBuckets;    // function to update
    qc.lastResult = qwQueryService.getResult(); // holds the current query and result
    //qc.limit = qwQueryService.limit;            // automatic result limiter
    qc.executingQuery = qwQueryService.executingQuery;

    // some functions for handling query history, going backward and forward

    qc.prev = prevResult;
    qc.next = nextResult;

    qc.hasNext = qwQueryService.hasNextResult;
    qc.hasPrev = qwQueryService.hasPrevResult;

    qc.canCreateBlankQuery = qwQueryService.canCreateBlankQuery;

    qc.getCurrentIndex = qwQueryService.getCurrentIndex;
    qc.clearHistory= qwQueryService.clearHistory;

    // variable and code for managing the choice of output format in different tabs

    qc.selectTab = selectTab;
    qc.isSelected = qwQueryService.isSelected;

    qc.status_success = qwQueryService.status_success;
    qc.status_fail = qwQueryService.status_fail;

    //
    // options for the two editors, query and result
    //

    qc.aceInputLoaded = aceInputLoaded;
    qc.aceInputChanged = aceInputChanged;
    qc.aceOutputLoaded = aceOutputLoaded;
    qc.aceOutputChanged = aceOutputChanged;
    qc.updateEditorSizes = updateEditorSizes;

    //
    // expand/collapse the analysis pane
    //

    qc.analysisExpanded = false;
    qc.toggleAnalysisSize = toggleAnalysisSize;

    //
    // functions for running queries and saving results
    //

    qc.query = query;
    qc.save = save;
    qc.save_query = save_query;

    //
    // options for the two Ace editors, the input and the output
    //

    qc.aceInputOptions = {
        mode: 'n1ql',
        showGutter: true,
        onLoad: qc.aceInputLoaded,
        onChange: qc.aceInputChanged,
        $blockScrolling: Infinity
    };

    qc.aceOutputOptions = {
        mode: 'json',
        showGutter: true,
        useWrapMode: true,
        onLoad: qc.aceOutputLoaded,
        onChange: qc.aceOutputChanged,
        $blockScrolling: Infinity
    };

    //
    // Do we have a REST API to work with?
    //

    qc.validated = validateQueryService;

    //
    // error message when result is too large to display
    //

    qc.maxTableSize = 750000;
    qc.maxTreeSize = 750000;
    qc.maxAceSize = 10485760;
    qc.maxSizeMsgTable = {error: "The table view is slow with results sized > " + qc.maxTableSize + " bytes. Try using the JSON view or specifying a lower limit in your query."};
    qc.maxSizeMsgTree = {error: "The tree view is slow with results sized > " + qc.maxTreeSize + " bytes. Try using the JSON view or specifying a lower limit in your query."};
    qc.maxSizeMsgJSON = "{\"error\": \"The JSON view is slow with results sized > " + qc.maxAceSize + " bytes. Try specifying a lower limit in your query.\"}";

    qc.showBigDatasets = false;     // allow the user to override the limit on showing big datasets

    qc.dataTooBig = dataTooBig;
    qc.setShowBigData = setShowBigData;
    qc.getBigDataMessage = getBigDataMessage;

    qc.renderPage = function() {updateEditorSizes();};
    //
    // call the activate method for initialization
    //

    activate();


    //
    // Is the data too big to display for the selected results pane?
    //

    function dataTooBig() {
      switch (qwQueryService.outputTab) {
      case 1: return(qc.lastResult.resultSize / qc.maxAceSize) > 1.1;
      case 2: return(qc.lastResult.resultSize / qc.maxTableSize) > 1.1;
      case 3: return(qc.lastResult.resultSize / qc.maxTreeSize) > 1.1;
      }

    }

    //
    // get a string to describe why the dataset is large
    //

    function getBigDataMessage() {
      var fraction;
      switch (qwQueryService.outputTab) {
      case 1: fraction = qc.lastResult.resultSize / qc.maxAceSize; break;
      case 2: fraction = qc.lastResult.resultSize / qc.maxTableSize; break;
      case 3: fraction = qc.lastResult.resultSize / qc.maxTreeSize; break;
      }
      var timeEstimate = Math.round(fraction * 2.5);
      var timeUnits = "seconds";
      if (timeEstimate > 60) {
        timeEstimate = Math.round(timeEstimate/60);
        timeUnits = "minutes";
      }
      var message = "The current dataset, " + qc.lastResult.resultSize + " " +
        "bytes, is too large to display quickly. Using a lower limit or a more " +
        "specific where clause in your query can reduce result size. Rendering " +
        "might freeze your browser for " + timeEstimate + " to " + timeEstimate*4 +
        " " + timeUnits + " or more. ";

      if (qwQueryService.outputTab != 1) {
        message += "The JSON view is about 10x faster. ";
      }

      return(message);
    }

    function setShowBigData(show)
    {
      qc.showBigDatasets = show;
      $timeout(swapEditorFocus,10);
    }

    //
    // change the tab selection
    //

    function selectTab(tabNum) {
      if (qc.isSelected(tabNum))
        return; // avoid noop

      qc.showBigDatasets = false;
      qwQueryService.selectTab(tabNum);
      // select focus after a delay to try and force update of the editor
      $timeout(swapEditorFocus,10);
    };

    //
    // we need to define a wrapper around qw_query_server.nextResult, because if the
    // user creates a new blank query, we need to refocus on it.
    //

    function nextResult() {
      qc.showBigDatasets = false;
      qwQueryService.nextResult();
      $timeout(swapEditorFocus,10);
    }

    function prevResult() {
      qc.showBigDatasets = false;
      qwQueryService.prevResult();
      $timeout(swapEditorFocus,10);
    }

    //
    // the text editor doesn't update visually if changed when off screen. Force
    // update by focusing on it
    //

    function swapEditorFocus() {
      if (qc.outputEditor) {
        qc.outputEditor.focus();
        qc.inputEditor.focus();
      }
      updateEditorSizes();
    }

    //
    // manage the ACE code editors for query input and JSON output
    //

    var endsWithSemi = /;\s*$/i;

    function aceInputChanged(e) {
      // show a placeholder when nothing has been typed
      var curSession = qc.inputEditor.getSession();
      var noText = curSession.getValue().length == 0;
      var emptyMessageNode = qc.inputEditor.renderer.emptyMessageNode;

      //console.log("Notext: " +noText + ", emptyMessageNode: " + emptyMessageNode);
      if (noText && !emptyMessageNode) {
        emptyMessageNode = qc.inputEditor.renderer.emptyMessageNode = document.createElement("div");
        emptyMessageNode.innerText = "Enter a query here.";
        emptyMessageNode.className = "ace_invisible ace_emptyMessage";
        emptyMessageNode.style.padding = "0 5px";
        qc.inputEditor.renderer.scroller.appendChild(emptyMessageNode);
      }
      else if (!noText && emptyMessageNode) {
        qc.inputEditor.renderer.scroller.removeChild(emptyMessageNode);
        qc.inputEditor.renderer.emptyMessageNode = null;
      }

      qc.inputEditor.$blockScrolling = Infinity;

      //
      // allow the query editor to grow and shrink a certain amount based
      // on the number of lines in the query
      //

      //console.log("last char: " + curSession.getLine(e[0].start.row).trim()[curSession.getLine(e[0].start.row).trim().length -1]);

      // if they hit enter and the query ends with a semicolon, run the query
      if (e[0].action === 'insert' && // they typed something
          e[0].end.column === 0 &&    // and ended up on a new line
          e[0].start.row+1 == e[0].end.row && // and added one line
          e[0].start.column > 0 && // and the previous line wasn't blank
          curSession.getLine(e[0].start.row).trim()[curSession.getLine(e[0].start.row).trim().length -1] === ';' &&
          endsWithSemi.test(qc.lastResult.query))
        qc.query();

      // as the query is edited, allow it more vertical space, but max sure it
      // doesn't have fewer than 5 lines or more than
      var lines = curSession.getLength();
      var height = Math.min(Math.max(75,(lines-1)*17),240);
      $("#query_editor").height(height);
    };

    function aceInputLoaded(_editor) {
      var langTools = ace.require("ace/ext/language_tools");

      _editor.$blockScrolling = Infinity;
      _editor.setFontSize('13px');
      _editor.renderer.setPrintMarginColumn(false);
      _editor.setReadOnly(qc.executingQuery.busy);

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      qc.inputEditor = _editor;

      // this function is used for autocompletion of dynamically known names such
      // as bucket names, field names, and so on. We only want to return items that
      // either start with the prefix, or items where the prefix follows a '.'
      // (meaning that the prefix is a field name from a path

      var identifierCompleter = {
          getCompletions: function(editor, session, pos, prefix, callback) {
            var results = [];
            var modPrefix = '.' + prefix;
            var modPrefix2 = '`' + prefix;
            //console.log("Looking for: *" + prefix + "*");
            for (var i=0; i<qwQueryService.autoCompleteArray.length; i++) {
              //console.log("  *" + qwQueryService.autoCompleteArray[i].caption + "*");
              if (_.startsWith(qwQueryService.autoCompleteArray[i].caption,prefix) ||
                  qwQueryService.autoCompleteArray[i].caption.indexOf(modPrefix) >= 0 ||
                  qwQueryService.autoCompleteArray[i].caption.indexOf(modPrefix2) >= 0) {
                //console.log("    Got it!");
                results.push(qwQueryService.autoCompleteArray[i]);
              }
            }
            callback(null,results);
          }
      };

      //
      // only support auto-complete if we're in enterprise mode
      //

      if (mnPools.export.isEnterprise) {
        _editor.setOptions({enableBasicAutocompletion: true});
        langTools.addCompleter(identifierCompleter);
      }

      focusOnInput();
    };


    function aceOutputLoaded(_editor) {
      //console.log("AceOutputLoaded");
      _editor.$blockScrolling = Infinity;
      _editor.setReadOnly(true);
      _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      qc.outputEditor = _editor;
      updateEditorSizes();
    };

    function aceOutputChanged(e) {
      updateEditorSizes();

      // show a placeholder when nothing has been typed
      var curSession = qc.outputEditor.getSession();
      var noText = curSession.getValue().length == 0;
      var emptyMessageNode = qc.outputEditor.renderer.emptyMessageNode;

      //console.log("Notext: " +noText + ", emptyMessageNode: " + emptyMessageNode);
      if (noText && !emptyMessageNode) {
        emptyMessageNode = qc.outputEditor.renderer.emptyMessageNode = document.createElement("div");
        emptyMessageNode.innerText =
          'See JSON, Table, and Tree formatted query results here.\n'+
          'Hover over field names (in the tree layout) to see their full path.';
        emptyMessageNode.className = "ace_invisible ace_emptyMessage";
        emptyMessageNode.style.padding = "0 5px";
        qc.outputEditor.renderer.scroller.appendChild(emptyMessageNode);
      }
      else if (!noText && emptyMessageNode) {
        qc.outputEditor.renderer.scroller.removeChild(emptyMessageNode);
        qc.outputEditor.renderer.emptyMessageNode = null;
      }

    };


    //
    // called when the JSON output changes. We need to make sure the editor is the correct size,
    // since it doesn't auto-resize
    //

    function updateEditorSizes() {
      var margins = 200;
      //if (navigator.userAgent.match(/safari/i))
      //	constant = 10;
      var windowHeight = document.body.offsetHeight;
      var pageHeaderHeight =  $('#page_header').height();
      var pageFooterHeight =  $('#page_footer').height();
      var headerNavHeight =  $('#headerNav').height();
      var queryBoxHeight = $('#query_box').height();
      var resultHeaderHeight =  $('#result_header').height();
      var resultSummaryHeight = $('#result_summary').height();

      var otherStuff = pageHeaderHeight + pageFooterHeight + headerNavHeight + queryBoxHeight;
      var editor_size = windowHeight - otherStuff - margins;

      //console.log(" editor_size: " + editor_size);
      $('#sidebar_body').height(editor_size + resultSummaryHeight + 25);
      $('#result_editor').height(editor_size + 10);
      $('#result_table').height(editor_size+20);
      $('#result_tree').height(editor_size+20);

      $('#result_box').height(editor_size+109);
    }

    $(window).resize(updateEditorSizes);

    //
    // make the focus go to the input field, so that backspace doesn't trigger
    // the browser back button
    //

    function focusOnInput()  {
      if (qc.inputEditor && qc.inputEditor.focus)
        qc.inputEditor.focus();
    }

    //
    // functions for running queries and saving results to a file
    //

    function query() {
      // if a query is already running, we should cancel it
      if (qc.executingQuery.busy) {
        qwQueryService.cancelQuery();
        return;
      }

      // don't let the user edit the query while it's running
      qc.inputEditor.setReadOnly(true);

      // remove trailing whitespace to keep query from growing, and avoid
      // syntax errors (query parser doesn't like \n after ;
      if (endsWithSemi.test(qc.lastResult.query))
        qc.lastResult.query = qc.lastResult.query.trim();

      var queryStr = qc.lastResult.query;
      //var hasLimitExpr = /limit\s+\d+\s*;\s*$/gmi;
      //var startsWithSelectExpr = /^\s*select/gmi;
      //var hasElement = /^\s*select\s*(distinct)?\s*(raw|element|value)\s*/gmi;

      //console.log("HasElement: " + hasElement.test(queryStr));

      //var hasLimit = hasLimitExpr.test(queryStr);
      //var startsWithSelect = startsWithSelectExpr.test(queryStr);

      // add a limit to all "select" statements by wrapping
//      if (startsWithSelect && !hasLimit && !hasElement.test(queryStr)) {
//        // handle garbage in the limit dialog
//        if (isNaN(Number(qwQueryService.limit.max)) ||
//            qwQueryService.limit.max < 1)
//          qwQueryService.limit.max = qwQueryService.defaultLimit;
//
//        // remove ;
//        if (endsWithSemi.test(queryStr))
//          queryStr = queryStr.replace(endsWithSemi,"");
//
//        // wrap the query in a new query with a limit
//        queryStr = "select cbq_query_workbench_limit.* from (" + queryStr + ") cbq_query_workbench_limit limit " + qwQueryService.limit.max + ";";
//      }

      //console.log("Running query: " + queryStr);
      // run the query and show a spinner

      var promise = qwQueryService.executeQuery(queryStr,qc.lastResult.query);

      if (promise) {
        // also have the input grab focus at the end
        promise.success(doneWithQuery)
        .error(doneWithQuery);
      }
      else
        doneWithQuery();
    };

    //
    // when a query finishes, we need to re-enable the query field, and try and put
    // the focus there
    //

    function doneWithQuery() {
      qc.inputEditor.setReadOnly(false);
      updateEditorSizes();
      focusOnInput();
    }

    //
    // save the results to a file. Here we need to use a scope to to send the file name
    // to the file name dialog and get it back again.
    //

    var dialogScope = $rootScope.$new(true);
    dialogScope.data_file = {name: "data.json"};

    function save() {
      var isSafari = /^((?!chrome).)*safari/i.test(navigator.userAgent);

      // safari does'nt support saveAs
      if (isSafari) {
        var file = new Blob([qc.lastResult.result],{type: "text/json", name: "data.json"});
        saveAs(file,dialogScope.data_file.name);
        return;
      }

      // but for those that do, get a name for the file
      dialogScope.file_type = 'json ';
      dialogScope.file = dialogScope.data_file;

      var promise = $uibModal.open({
        templateUrl: '/_p/ui/query/file_dialog/qw_query_file_dialog.html',
        scope: dialogScope
      }).result;

      // now save it
      promise.then(function (res) {
        //console.log("Promise, file: " + tempScope.file.name + ", res: " + res);
        var file = new Blob([qc.lastResult.result],{type: "text/json"});
        saveAs(file,dialogScope.file.name);
      });
    };


    //
    // save the current query to a file. Here we need to use a scope to to send the file name
    // to the file name dialog and get it back again.
    //

    dialogScope.query_file = {name: "n1ql_query.txt"};

    function save_query() {
      var isSafari = /^((?!chrome).)*safari/i.test(navigator.userAgent);

      // safari does'nt support saveAs
      if (isSafari) {
        var file = new Blob([qc.lastResult.query],{type: "text/json", name: "data.json"});
        saveAs(file,dialogScope.query_file.name);
        return;
      }

      // but for those that do, get a name for the file
      dialogScope.file_type = 'query ';
      dialogScope.file = dialogScope.query_file;

      var promise = $uibModal.open({
        templateUrl: '/_p/ui/query/file_dialog/qw_query_file_dialog.html',
        scope: dialogScope
      }).result;

      // now save it
      promise.then(function (res) {
        //console.log("Promise, file: " + tempScope.file.name + ", res: " + res);
        var file = new Blob([qc.lastResult.query],{type: "text/plain"});
        saveAs(file,dialogScope.file.name);
      });
    };

    //
    // toggle the size of the analysis pane
    //

    function toggleAnalysisSize() {
      if (!qc.analysisExpanded) {
        $("#metadata").removeClass("cbui-column25");
        $("#result_box").removeClass("cbui-column75");
        $("#metadata").addClass("cbui-column66");
        $("#result_box").addClass("cbui-column33");
      }
      else {
        $("#metadata").removeClass("cbui-column66");
        $("#result_box").removeClass("cbui-column33");
        $("#metadata").addClass("cbui-column25");
        $("#result_box").addClass("cbui-column75");
      }
      qc.analysisExpanded = !qc.analysisExpanded;
    }
    //
    // let's start off with a list of the buckets
    //

    function activate() {
      // Prevent the backspace key from navigating back. Thanks StackOverflow!
      $(document).unbind('keydown').bind('keydown', function (event) {
        var doPrevent = false;
        if (event.keyCode === 8) {
          var d = event.srcElement || event.target;
          if ((d.tagName.toUpperCase() === 'INPUT' &&
              (
                  d.type.toUpperCase() === 'TEXT' ||
                  d.type.toUpperCase() === 'PASSWORD' ||
                  d.type.toUpperCase() === 'FILE' ||
                  d.type.toUpperCase() === 'SEARCH' ||
                  d.type.toUpperCase() === 'EMAIL' ||
                  d.type.toUpperCase() === 'NUMBER' ||
                  d.type.toUpperCase() === 'DATE' )
          ) ||
          d.tagName.toUpperCase() === 'TEXTAREA') {
            doPrevent = d.readOnly || d.disabled;
          }
          else {
            doPrevent = true;
          }
        }

        if (doPrevent) {
          event.preventDefault();
        }
      });

      // get the list of buckets
      qc.updateBuckets();

      //$( "#resizable-2" ).resizable({
      //  animate: true
    // });
      //$(".resizable").resizable({handles: "w"});

      //
      // now let's make sure the window is the right size
      //

      $timeout(updateEditorSizes(),100);
    }
  }


})();
