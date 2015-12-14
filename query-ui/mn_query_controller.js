(function() {


  angular.module('mnQuery').controller('mnQueryController', queryController);

  queryController.$inject = ['$rootScope', '$uibModal', '$timeout', 'mnQueryService', 'mnPromiseHelper'];

  function queryController ($rootScope, $uibModal, $timeout, mnQueryService, mnPromiseHelper) {

    var fakePromise = {then: function() {}};

    var qc = this;

    //
    // current UI version number
    //

    qc.version = "1.0.2";

    //
    // alot of state is provided by the mnQueryService
    //

    qc.buckets = mnQueryService.buckets;                      // buckets on cluster
    qc.busyGettingBuckets = mnQueryService.busyGettingBuckets;// busy retrieving?
    qc.updateBuckets = mnQueryService.updateBuckets;          // function to update
    qc.lastResult = mnQueryService.getResult(); // holds the current query and result 
    qc.limit = mnQueryService.limit;            // automatic result limiter
    qc.busyExecutingQuery = mnQueryService.busyExecutingQuery;

    // some functions for handling query history, going backward and forward

    qc.prev = mnQueryService.prevResult;
    qc.next = mnQueryService.nextResult;            

    qc.hasNext = mnQueryService.hasNextResult;
    qc.hasPrev = mnQueryService.hasPrevResult;

    // variable and code for managing the choice of output format in different tabs

    qc.selectTab = selectTab;
    qc.isSelected = mnQueryService.isSelected;

    //
    // options for the two editors, query and result
    //

    qc.aceInputLoaded = aceInputLoaded;
    qc.aceInputChanged = aceInputChanged;
    qc.aceOutputLoaded = aceOutputLoaded;
    qc.updateEditorSizes = updateEditorSizes;

    //
    // functions for running queries and saving results
    //

    qc.query = query;
    qc.save = save;

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
        onLoad: qc.aceOutputLoaded,
        onChange: qc.updateEditorSizes,
        $blockScrolling: Infinity
    };

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
        emptyMessageNode.textContent = "Enter a query here...";
        emptyMessageNode.className = "ace_invisible ace_emptyMessage";
        emptyMessageNode.style.padding = "0 5px";
        qc.inputEditor.renderer.scroller.appendChild(emptyMessageNode);
      }
      else if (!noText && emptyMessageNode) {
        qc.inputEditor.renderer.scroller.removeChild(emptyMessageNode);
        qc.inputEditor.renderer.emptyMessageNode = null;
      }

      qc.inputEditor.$blockScrolling = Infinity;

      // if they hit enter and the query ends with a semicolon, run the query
      if (e[0].action === 'insert' && // they typed something 
          e[0].end.column === 0 &&    // and ended up on a new line
          e[0].start.row+1 == e[0].end.row && // and added one line
          e[0].start.column > 0 && // and the previous line wasn't blank
          curSession.getLine(e[0].start.row)[e[0].start.column-1] === ';' &&
          endsWithSemi.test(qc.lastResult.query))
        qc.query();
    };

    function aceInputLoaded(_editor) {
      var langTools = ace.require("ace/ext/language_tools");

      _editor.$blockScrolling = Infinity;
      _editor.setOptions({enableBasicAutocompletion: true});
      _editor.setFontSize('13px');
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
      qc.outputEditor = _editor;
      updateEditorSizes();
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
      $('#metadata').height(editor_size + resultHeaderHeight + resultSummaryHeight + 5);
      $('#result_editor').height(editor_size);
      $('#result_table').height(editor_size);
      $('#result_tree').height(editor_size);

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
      var queryStr = qc.lastResult.query;
      var hasLimit = /limit\s+\d+\s*;\s*$/gmi;
      var startsWithSelect = /^\s*select/gmi;

      // add a limit to all "select" statements by wrapping
      if (startsWithSelect.test(queryStr) && !hasLimit.test(queryStr)) {
        // strip out any ending semicolon
        if (endsWithSemi.test(queryStr))
          queryStr = queryStr.replace(endsWithSemi,"");

        // handle garbage in the limit dialog
        if (isNaN(Number(mnQueryService.limit.max)))
          mnQueryService.limit.max = 50;

        // wrap the query in a new query with a limit 
        queryStr = "select cbq_query_workbench_limit.* from (" + queryStr + ") cbq_query_workbench_limit limit " + mnQueryService.limit.max + ";";
      }

      //console.log("Running query: " + queryStr);
      // run the query and show a spinner

      var promise = mnQueryService.executeQuery(queryStr);

      if (promise) {
        // for long queries, show a spinner
        //mnPromiseHelper.promiseHelper(this,promise/*, dialog*/).showSpinner("queryInProgress");
        // also have the input grab focus at the end
        promise.success(focusOnInput)
        .error(focusOnInput);
      }
    };

    //
    // save the results to a file. Here we need to use a scope to to send the file name
    // to the file name dialog and get it back again.
    //

    var dialogScope = $rootScope.$new(true);
    dialogScope.file = {name: "data.json"};

    function save() {
      var isSafari = /^((?!chrome).)*safari/i.test(navigator.userAgent);

      // safari does'nt support saveAs
      if (isSafari) {
        var file = new Blob([qc.lastResult.result],{type: "text/json", name: "data.json"});
        saveAs(file,dialogScope.file.name);      
        return;
      }

      // but for those that do, get a name for the file
      var promise = $uibModal.open({
        templateUrl: '/query/ui/file_dialog/mn_query_file_dialog.html',
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
      
      //console.log("activate");
      
      //if (!qc.isSelected(1)) { // some tab other than the editor
      $timeout(updateEditorSizes(),100);
      //}
    }
  }


})();
