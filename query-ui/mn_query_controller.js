(function() {


  angular.module('mnQuery').controller('mnQueryController', queryController);

  queryController.$inject = ['$rootScope', '$uibModal', '$timeout', 'mnQueryService', 'mnPromiseHelper', 'validateQueryService'];

  function queryController ($rootScope, $uibModal, $timeout, mnQueryService, mnPromiseHelper, validateQueryService) {

    var qc = this;

    //
    // current UI version number
    //

    qc.version = "1.0.2";

    //
    // alot of state is provided by the mnQueryService
    //

    qc.buckets = mnQueryService.buckets;                // buckets on cluster
    qc.gettingBuckets = mnQueryService.gettingBuckets;  // busy retrieving?
    qc.updateBuckets = mnQueryService.updateBuckets;    // function to update
    qc.lastResult = mnQueryService.getResult(); // holds the current query and result
    qc.limit = mnQueryService.limit;            // automatic result limiter
    qc.executingQuery = mnQueryService.executingQuery;

    // some functions for handling query history, going backward and forward

    qc.prev = prevResult;
    qc.next = nextResult;

    qc.hasNext = mnQueryService.hasNextResult;
    qc.hasPrev = mnQueryService.hasPrevResult;

    qc.canCreateBlankQuery = mnQueryService.canCreateBlankQuery;

    qc.getCurrentIndex = mnQueryService.getCurrentIndex;
    qc.clearHistory= mnQueryService.clearHistory;

    // variable and code for managing the choice of output format in different tabs

    qc.selectTab = selectTab;
    qc.isSelected = mnQueryService.isSelected;

    qc.status_success = mnQueryService.status_success;
    qc.status_fail = mnQueryService.status_fail;

    //
    // options for the two editors, query and result
    //

    qc.aceInputLoaded = aceInputLoaded;
    qc.aceInputChanged = aceInputChanged;
    qc.aceOutputLoaded = aceOutputLoaded;
    qc.aceOutputChanged = aceOutputChanged;
    qc.updateEditorSizes = updateEditorSizes;

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
    qc.maxSizeMsg = {error: "Result size too large to display. Try using a lower limit."};
    qc.maxSizeMsgStr = "{\"error\": \"Result size too large to display. Try using a lower limit.\"}";

    //
    // call the activate method for initialization
    //

    activate();

    //
    // change the tab selection
    //

    function selectTab(tabNum) {
      mnQueryService.selectTab(tabNum);
      // select focus after a delay to try and force update of the editor
      $timeout(swapEditorFocus,10);
    };

    //
    // we need to define a wrapper around mn_query_server.nextResult, because if the
    // user creates a new blank query, we need to refocus on it.
    //

    function nextResult() {
      mnQueryService.nextResult();
      $timeout(swapEditorFocus,10);
    }

    function prevResult() {
      mnQueryService.prevResult();
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

      //console.log("last char: " + curSession.getLine(e[0].start.row).trim()[curSession.getLine(e[0].start.row).trim().length -1]);


      // if they hit enter and the query ends with a semicolon, run the query
      if (e[0].action === 'insert' && // they typed something
          e[0].end.column === 0 &&    // and ended up on a new line
          e[0].start.row+1 == e[0].end.row && // and added one line
          e[0].start.column > 0 && // and the previous line wasn't blank
          curSession.getLine(e[0].start.row).trim()[curSession.getLine(e[0].start.row).trim().length -1] === ';' &&
          endsWithSemi.test(qc.lastResult.query))
        qc.query();
    };

    function aceInputLoaded(_editor) {
      var langTools = ace.require("ace/ext/language_tools");

      _editor.$blockScrolling = Infinity;
      _editor.setOptions({enableBasicAutocompletion: true});
      _editor.setFontSize('13px');
      _editor.renderer.setPrintMarginColumn(false);
      qc.inputEditor = _editor;

      var identifierCompleter = {
          getCompletions: function(editor, session, pos, prefix, callback) {
            callback(null,mnQueryService.autoCompleteArray);
          }
      };
      langTools.addCompleter(identifierCompleter);

      focusOnInput();
    };


    function aceOutputLoaded(_editor) {
      //console.log("AceOutputLoaded");
      _editor.$blockScrolling = Infinity;
      _editor.setReadOnly(true);
      _editor.renderer.setPrintMarginColumn(false);
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

      //var width = $('#result_editor').width();

      //console.log(" editor_size: " + editor_size);
      $('#sidebar_body').height(editor_size + resultSummaryHeight + 25);
      $('#result_editor').height(editor_size);
      $('#result_table').height(editor_size+20);
      $('#result_tree').height(editor_size+20);

      $('#result_box').height(editor_size+109);
      //$('#result_editor').width(width);
      //$('#result_table').width(width);
      //$('#result_tree').width(width);

    }

    $(window).resize(function() {
      updateEditorSizes();
    });

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
      // don't let the user edit the query while it's running
      qc.inputEditor.setReadOnly(true);

      // remove trailing whitespace to keep query from growing, and avoid
      // syntax errors (query parser doesn't like \n after ;
      if (endsWithSemi.test(qc.lastResult.query))
        qc.lastResult.query = qc.lastResult.query.trim();

      var queryStr = qc.lastResult.query;
      var hasLimitExpr = /limit\s+\d+\s*;\s*$/gmi;
      var startsWithSelectExpr = /^\s*select/gmi;
      var hasElement = /^\s*select\s*(distinct)?\s*(raw|element|value)\s*/gmi;

      //console.log("HasElement: " + hasElement.test(queryStr));

      var hasLimit = hasLimitExpr.test(queryStr);
      var startsWithSelect = startsWithSelectExpr.test(queryStr);

      // add a limit to all "select" statements by wrapping
      if (startsWithSelect && !hasLimit && !hasElement.test(queryStr)) {
        // handle garbage in the limit dialog
        if (isNaN(Number(mnQueryService.limit.max)) ||
            mnQueryService.limit.max < 1)
          mnQueryService.limit.max = mnQueryService.defaultLimit;

        // remove ;
        if (endsWithSemi.test(queryStr))
          queryStr = queryStr.replace(endsWithSemi,"");

        // wrap the query in a new query with a limit
        queryStr = "select cbq_query_workbench_limit.* from (" + queryStr + ") cbq_query_workbench_limit limit " + mnQueryService.limit.max + ";";
      }

      //console.log("Running query: " + queryStr);
      // run the query and show a spinner

      var promise = mnQueryService.executeQuery(queryStr,qc.lastResult.query);

      if (promise) {
        // for long queries, show a spinner
        //mnPromiseHelper.promiseHelper(this,promise/*, dialog*/).showSpinner("queryInProgress");
        // also have the input grab focus at the end
        promise.success(doneWithQuery)
        .error(doneWithQuery);
      }
    };

    //
    // when a query finishes, we need to re-enable the query field, and try and put
    // the focus there
    //

    function doneWithQuery() {
      qc.inputEditor.setReadOnly(false);
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
        templateUrl: '/_p/ui/query/file_dialog/mn_query_file_dialog.html',
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
        templateUrl: '/_p/ui/query/file_dialog/mn_query_file_dialog.html',
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

      //
      // now let's make sure the window is the right size
      //

      $timeout(updateEditorSizes(),100);
    }
  }


})();
