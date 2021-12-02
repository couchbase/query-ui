/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import ace                            from 'ace/ace';
import _                              from 'lodash';
import {MnLifeCycleHooksToStream}     from 'mn.core';
import {Component,
        ElementRef,
        ViewEncapsulation,
        ChangeDetectorRef}            from '@angular/core';
import {UIRouter}                     from '@uirouter/angular';

import { NgbModal, NgbModalConfig }   from '@ng-bootstrap/ng-bootstrap';

import { BehaviorSubject, fromEvent } from 'rxjs';

import { QwDialogService }            from '../../angular-directives/qw.dialog.service.js';
import { QwConstantsService }         from '../../angular-services/qw.constants.service.js';
import { QwQueryService }             from '../../angular-services/qw.query.service.js';

import {MnPermissions, MnPoolDefault }from 'ajs.upgraded.providers';

import { QwFileImportDialog }         from './dialogs/qw.file.import.dialog.component.js';
import { QwUnifiedFileDialog }        from './dialogs/qw.unified.file.dialog.component.js';
import { QwPrefsDialog }              from './dialogs/qw.prefs.dialog.component.js';
import { QwHistoryDialog }            from './dialogs/qw.history.dialog.component.js';

import N1qlParser                     from '../../parser/n1ql/myN1qlListener.js';

export {QwQueryComponent};


class QwQueryComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        templateUrl: "../_p/ui/query/angular-components/workbench/qw.query.html",
        //styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
        encapsulation: ViewEncapsulation.None,
      })
    ]
  }

  static get parameters() {
    return [
      ChangeDetectorRef,
      ElementRef,
      MnPermissions,
      MnPoolDefault,
      NgbModal,
      NgbModalConfig,
      QwConstantsService,
      QwDialogService,
      QwQueryService,
      UIRouter,
    ];
  }

  ngOnInit() {
    this.params = this.uiRouter.globals.params;
    this.resizeObservable = fromEvent(window,'resize');
    this.resizeSubscription = this.resizeObservable.subscribe( evt => this.qc && this.qc.updateEditorSizes && this.qc.updateEditorSizes());

  }

  ngAfterViewInit() {
    // for unknown reasons the context menu is not picking up the value on reload
    // force it to notice a change by setting to null, then resetting after some amount of time.
    if (this.qc.lastResult().query_context_bucket) {
      let cachedBucket = this.qc.lastResult().query_context_bucket;
      this.qc.lastResult().query_context_bucket = null;
      setTimeout(() => {
        this.qc.lastResult().query_context_bucket = cachedBucket;
      }, 500);

    }

    this.qc.editorElement = this.element.nativeElement.querySelector(".wb-ace-editor");
    this.qc.loadQuery = this.element.nativeElement.querySelector("#loadQuery");
    this.qc.insightsSidebar = this.element.nativeElement.querySelector(".insights-sidebar");
    this.qc.wbMainWrapper = this.element.nativeElement.querySelector(".wb-main-wrapper");
  }

  ngOnDestroy() {
    this.resizeSubscription.unsubscribe();
  }

  //
  // constructor
  //

  constructor(cdr,
              element,
              mnPermissions,
              mnPoolDefault,
              ngbModal,
              ngbModalConfig,
              qwConstantsService,
              qwDialogService,
              qwQueryService,
              uiRouter
  ) {
    super();

    // to simplify porting from AngularJS, make previous controller object, 'qc', a member
    // of this Component class
    var qc = {};
    this.qc = qc;
    this.uiRouter = uiRouter;
    this.element = element;
    this.QwDialogService = qwDialogService;
    qc.qwDialogService = qwDialogService;
    qc.modalService = ngbModal;

    qc.compat = mnPoolDefault.export.compat;

    //
    // alot of state is provided by the qwQueryService
    //

    qc.qwQueryService = qwQueryService;
    qc.buckets = qwQueryService.buckets;                // buckets on cluster
    qc.gettingBuckets = qwQueryService.gettingBuckets;  // busy retrieving?
    qc.updateBuckets = qwQueryService.updateBuckets;    // function to update
    qc.lastResult = qwQueryService.getCurrentResult; // holds the current query and result
    //qc.limit = qwQueryService.limit;            // automatic result limiter
    //qc.executingQuery = qwQueryService.executingQuery;
    qc.emptyQuery = function() {return(qwQueryService.getResult().query.length == 0);}
    qc.emptyResult = qwQueryService.emptyResult;
    qc.hasRecommendedIndex = qwQueryService.hasRecommendedIndex;

    qc.result_subject = new BehaviorSubject();

    qc.rbac = mnPermissions.export;
    qc.queryPermitted = function() {
      return (qc.rbac.cluster.collection['.:.:.'].data.docs.read &&
              qc.rbac.cluster.collection['.:.:.'].n1ql.select.execute) ||
        qc.rbac.cluster.collection['.:.:.'].n1ql.index.all;
    };

    // some functions for handling query history, going backward and forward

    qc.prev = prevResult;
    qc.next = nextResult;

    qc.hasNext = qwQueryService.hasNextResult;
    qc.hasPrev = qwQueryService.hasPrevResult;

    qc.canCreateBlankQuery = qwQueryService.canCreateBlankQuery;

    qc.getCurrentIndex = qwQueryService.getCurrentIndex;
    qc.clearHistory= qwQueryService.clearHistory;
    qc.options = this.options;

    qc.historyMenu = edit_history;

    // variable and code for managing the choice of output format in different tabs

    qc.selectTab = selectTab;
    qc.isSelected = qwQueryService.isSelected;

    qc.status_success = qwQueryService.status_success;
    qc.status_fail = qwQueryService.status_fail;
    qc.qqs = qwQueryService;

    //
    // options for the two editors, query and result
    //

    qc.aceInputLoaded = aceInputLoaded;
    qc.aceInputChanged = aceInputChanged;
    qc.aceOutputLoaded = aceOutputLoaded;
    qc.aceOutputChanged = aceOutputChanged;
    qc.updateEditorSizes = updateEditorSizes;

    qc.acePlanLoaded = acePlanLoaded;
    qc.acePlanChanged = acePlanChanged;

    //
    // expand/collapse/hide/show the analysis pane
    //

    qc.analysisExpanded = false;
    qc.toggleAnalysisSize = toggleAnalysisSize;
    qc.fullscreen = false;
    qc.toggleFullscreen = toggleFullscreen;

    //
    // functions for running queries and saving results
    //

    qc.query = query;
    qc.do_import = do_import;
    qc.unified_save = unified_save;

    qc.isDeveloperPreview = function() {return qwQueryService.pools.isDeveloperPreview;};

    // show we expand the query editor or the results pane?

    qc.setUserInterest = function(interest) {if (interest != qwQueryService.workbenchUserInterest) {qwQueryService.workbenchUserInterest = interest;updateEditorSizes();}}
    qc.getUserInterest = function()         {return(qwQueryService.workbenchUserInterest);}

    // for USE menu, get the scopes for the currently selected bucket
    qc.getContextBuckets = getContextBuckets;
    qc.getContextScopes = getContextScopes;

    //
    // options for the two Ace editors, the input and the output
    //
    // unbind ^F for all ACE editors
    var default_commands = ace.require("ace/commands/default_commands");
    for (var i=0; i< default_commands.commands.length; i++)
      if (default_commands.commands[i].name.startsWith("find")) {
        default_commands.commands.splice(i,1);
        i--;
      }

    qc.aceInputOptions = {
      mode: 'ace/mode/n1ql',
      showGutter: true,
      //onLoad: qc.aceInputLoaded,
      //onChange: qc.aceInputChanged,
      //$blockScrolling: Infinity
    };

    qc.aceOutputOptions = {
      mode: 'ace/mode/json',
      showGutter: true,
      //useWrapMode: true,
      //onLoad: qc.aceOutputLoaded,
      //onChange: qc.aceOutputChanged,
      //$blockScrolling: Infinity
    };

    qc.acePlanOptions = {
      mode: 'ace/mode/json',
      showGutter: true,
      //useWrapMode: true,
      //onLoad: qc.acePlanLoaded,
      //onChange: qc.acePlanChanged,
      //$blockScrolling: Infinity
    };

    qc.aceSearchOutput = aceSearchOutput;

    //
    // Do we have a REST API to work with?
    //

    qc.validated = qwQueryService.validateQueryService;
    qc.validNodes = qc.validated.validNodes;
    qc.updateNodes = qc.validated.updateNodes;    // function to update

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

    // should we have the extra explain tabs?

    qc.autoExplain = qwConstantsService.autoExplain;

    qc.showBucketAnalysis = qwConstantsService.showBucketAnalysis;

    qc.showOptions = qwConstantsService.showOptions;

    qc.format = format;

    //
    // does the browser support file choosing?
    //

    qc.fileSupport = (window.File && window.FileReader && window.FileList && window.Blob);

    //
    // labels for bucket analysis pane
    qc.fullyQueryableBuckets = qwConstantsService.fullyQueryableBuckets;
    qc.queryOnIndexedBuckets = qwConstantsService.queryOnIndexedBuckets;
    qc.nonIndexedBuckets = qwConstantsService.nonIndexedBuckets;

    // are we enterprise?

    qc.isEnterprise = qc.validated.isEnterprise;

    qc.copyResultAsCSV = function() {copyResultAsCSV();};

    qc.runAdviseOnLatest = function() {
      qwQueryService.runAdviseOnLatest()
        .then(function success() {qc.result_subject.next(qc.lastResult());},
          function error() {qc.result_subject.next(qc.lastResult());});
    }

    // what kinds of buckets do we have?

    qc.has_prim_buckets = function() {for (var i=0; i < qwQueryService.buckets.length; i++) if (qwQueryService.buckets[i].has_prim) return true; return false;}
    qc.has_sec_buckets = function() {for (var i=0; i < qwQueryService.buckets.length; i++) if (!qwQueryService.buckets[i].has_prim && qwQueryService.buckets[i].has_sec) return true; return false;}
    qc.has_unindexed_buckets = function() {for (var i=0; i < qwQueryService.buckets.length; i++) if (!qwQueryService.buckets[i].has_prim && !qwQueryService.buckets[i].has_sec) return true; return false;}

    //
    // code for handling when collections need a primary index to run queries
    //

    qc.needsPrimaryIndex = needsPrimaryIndex;
    qc.createPrimaryIndex = createPrimaryIndex;
    qc.canCreateOtherIndexes = canCreateOtherIndexes;

    //
    // call the activate method for initialization
    //

    this.activate();

    //
    // Is the data too big to display for the selected results pane?
    //

    function dataTooBig() {
      if (qwQueryService.isSelected(1))
        return(qc.lastResult().resultSize / qc.maxAceSize) > 1.1;
      else if (qwQueryService.isSelected(2))
        return(qc.lastResult().resultSize / qc.maxTableSize) > 1.1;

      return(false);
    }

    //
    // get a string to describe why the dataset is large
    //

    function getBigDataMessage() {
      var fraction;
      switch (qwQueryService.outputTab) {
        case 1: fraction = qc.lastResult().resultSize / qc.maxAceSize; break;
        case 2: fraction = qc.lastResult().resultSize / qc.maxTableSize; break;
        case 3: fraction = qc.lastResult().resultSize / qc.maxTreeSize; break;
      }
      var timeEstimate = Math.round(fraction * 2.5);
      var timeUnits = "seconds";
      if (timeEstimate > 60) {
        timeEstimate = Math.round(timeEstimate/60);
        timeUnits = "minutes";
      }
      var message = "The current dataset, " + qc.lastResult().resultSize + " " +
        "bytes, is too large to display quickly.<br>Using a lower limit or a more " +
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
      setTimeout(swapEditorFocus,10);
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
      setTimeout(swapEditorFocus,10);
    };

    //
    // we need to define a wrapper around qw_query_server.nextResult, because if the
    // user creates a new blank query, we need to refocus on it.
    //

    function nextResult() {
      qc.showBigDatasets = false;
      qwQueryService.nextResult();
      qc.result_subject.next(qc.lastResult());
      setTimeout(swapEditorFocus,10);
    }

    function prevResult() {
      qc.showBigDatasets = false;
      qwQueryService.prevResult();
      qc.result_subject.next(qc.lastResult());
      setTimeout(swapEditorFocus,10);
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
    var matchNonQuotedSmartQuotes = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|([\u201C\u201D\u201E\u201F\u2033\u2036\u2018\u2019\u201A\u201B\u2032\u2035])/ig;

    qc.langTools = ace.require("ace/ext/language_tools");
    qc.autocomplete = ace.require("ace/autocomplete");


    function aceInputChanged(e) {
      //console.log("input changed, action: " + JSON.stringify(e[0]));
      //console.log("current text : " + JSON.stringify(qc.inputEditor.getSession().getValue()));
      //console.log("current query: " + qc.lastResult.query);

      //
      // set up auto-complete
      //

      if (!qc.inputEditor.getOption("enableBasicAutocompletion") && qc.autocomplete) {
        // make autocomplete work with 'tab', and auto-insert if 1 match
        qc.autocomplete.Autocomplete.startCommand.bindKey = "Ctrl-Space|Ctrl-Shift-Space|Alt-Space|Tab";
        qc.autocomplete.Autocomplete.startCommand.exec = autocomplete_exec;
        // enable autocomplete
        qc.inputEditor.setOptions({enableBasicAutocompletion: true});
        // add completer that works with path expressions with '.'
        qc.langTools.setCompleters([identifierCompleter,qc.langTools.keyWordCompleter]);
      }

      // weird bug - sometimes the query is not up to date with the text area
      if (qc.inputEditor.getSession().getValue() != qc.lastResult().query)
        qc.lastResult().set_query(qc.inputEditor.getSession().getValue());

      // show a placeholder when nothing has been typed
      var curSession = qc.inputEditor.getSession();
      var noText = curSession.getValue().length == 0;
      var emptyMessageNode = qc.inputEditor.renderer.emptyMessageNode;

      // when the input is changed, clear all the markers
      curSession.clearAnnotations();
      if (qc.markerIds) {
        for (var i=0; i< qc.markerIds.length; i++)
          curSession.removeMarker(qc.markerIds[i]);
        qc.markerIds.length = 0;
      }

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

      // for inserts, by default move the cursor to the end of the insert
      // and replace any smart quotes with dumb quotes

      if (e.action === 'insert') {

        // detect and remove smart quotes, but only outside existing quoted strings. The regex
        // pattern matches either quoted strings or smart quotes outside quoted strings. If we
        // see any matched  for group 1, a bare smart quote, replace it.
        var matchArray = matchNonQuotedSmartQuotes.exec(qc.lastResult().query);
        if (matchArray != null) {
          var newBytes = "";
          var curBytes = qc.lastResult().query;
          while (matchArray != null)  {
            if (matchArray[1]) { // we want group 1
              newBytes += curBytes.substring(0,matchNonQuotedSmartQuotes.lastIndex - 1) + '"';
              curBytes = curBytes.substring(matchNonQuotedSmartQuotes.lastIndex);
              matchNonQuotedSmartQuotes.lastIndex = 0;
            }
            matchArray = matchNonQuotedSmartQuotes.exec(curBytes);
          }

          if (newBytes.length > 0)
            set_query(newBytes + curBytes);
        }

        // after past grab focus, move to end

        updateEditorSizes();
        //qc.inputEditor.moveCursorToPosition(e.end);
        qc.inputEditor.focus();

        // if they pasted more than one line, and we're at the end of the editor, trim
        var pos = qc.inputEditor.getCursorPosition();
        var line = qc.inputEditor.getSession().getLine(pos.row);
        if (e.lines && e.lines.length > 1 && e.lines[0].length > 0 &&
          pos.row == (qc.inputEditor.getSession().getLength()-1) &&
          pos.column == line.length)
          set_query(qc.lastResult().query.trim());

        // if they hit enter and the query ends with a semicolon, run the query
        if (qwConstantsService.autoExecuteQueryOnEnter && // auto execute enabled
          !qc.inputEditor.ignoreCR && // make sure it's not a special CR
          e.lines && e.lines.length == 2 && // <cr> marked by two empty lines
          e.lines[0].length == 0 &&
          e.lines[1].length == 0 &&
          e.start.column > 0 && // and the previous line wasn't blank
          curSession.getLine(e.start.row).trim()[curSession.getLine(e.start.row).trim().length -1] === ';' &&
          endsWithSemi.test(qc.lastResult().query))
          qc.query({});

        qc.inputEditor.ignoreCR = false;
      }
    }

    //
    // function for adding a carriage return to the query editor without tripping the
    // automatic return-after-semicolon-causes-query-to-execute
    //

    function insertReturn(editor) {
      editor.ignoreCR = true; // make sure editor doesn't launch query
      qc.inputEditor.insert('\n');
    }

    //
    // initialize the query editor
    //

    function aceInputLoaded(_editor) {
      qc.inputEditor = _editor;

      _editor.setOptions({
        mode: 'ace/mode/n1ql',
        showGutter: true,
      });

      _editor.$blockScrolling = Infinity;
      _editor.setFontSize('13px');
      _editor.renderer.setPrintMarginColumn(false);
      //_editor.setReadOnly(qc.lastResult().busy);

      _editor.commands.addCommand({
        name: 'enterSpecial',
        bindKey: {win: 'Ctrl-Return',mac:'Ctrl-Return'},
        exec: insertReturn,
        readOnly: true
      });

      _editor.commands.addCommand({
        name: 'enterSpecial2',
        bindKey: {win: 'Command-Return',mac:'Command-Return'},
        exec: insertReturn,
        readOnly: true
      });

      _editor.commands.addCommand({
        name: 'enterSpecial3',
        bindKey: {win: 'Shift-Return',mac:'Shift-Return'},
        exec: insertReturn,
        readOnly: true
      });

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      // if they scroll the query window and it's not already of interest, make it so
      _editor.getSession().on('changeScrollTop',function() {qc.setUserInterest('editor');});
      _editor.focus();

      //
      // make the query editor "catch" drag and drop files
      //

      qc.editorElement.addEventListener('dragover',qc.handleDragOver,false);
      qc.editorElement.addEventListener('drop',qc.handleFileDrop,false);
      _editor.getSession().on("change", qc.aceInputChanged);
    }

    //
    // format the contents of the query field
    //

    var mode_n1ql = ace.require("ace/mode/n1ql");

    function format() {
      set_query(mode_n1ql.Instance.format(qc.lastResult().query,4));
    }

    // this function is used for autocompletion of dynamically known names such
    // as bucket names, field names, and so on. We only want to return items that
    // either start with the prefix, or items where the prefix follows a '.'
    // (meaning that the prefix is a field name from a path)

    var identifierCompleter = {
      getCompletions: function(editor, session, pos, prefix, callback) {
        //console.log("Completing: *" + prefix + "*");

        var results = [];
        var modPrefix = '.' + prefix;
        var modPrefix2 = _.startsWith(prefix,'`') ? prefix : '`' + prefix;
        for (var i=0; i<qwQueryService.autoCompleteArray.length; i++) {
          //console.log("  *" + qwQueryService.autoCompleteArray[i].caption + "*");
          if (_.startsWith(qwQueryService.autoCompleteArray[i].caption,prefix) ||
            qwQueryService.autoCompleteArray[i].caption.indexOf(modPrefix) >= 0 ||
            qwQueryService.autoCompleteArray[i].caption.indexOf(modPrefix2) >= 0) {
            //console.log("    Got it, pushing: " + qwQueryService.autoCompleteArray[i]);
            results.push(qwQueryService.autoCompleteArray[i]);
          }
        }

        callback(null,results);
      },

      /*
       * We need to override the 'retrievePrecedingIdentifier' regex which treats path
       * expressions separated by periods as separate identifiers, when for the purpose
       * of autocompletion, we want to treat paths as a single identifier. We also need
       * to recognize backtick as part of an identifier.
       */

      identifierRegexps: [/[a-z\.`:A-Z_0-9\$\-\u00A2-\uFFFF]/]
    };

    //
    // for autocompletion, we want to override the 'exec' function so that autoInsert
    // is the default (i.e., if there is only one match, don't bother showing the menu).
    //

    var autocomplete_exec =  function(editor) {
      if (!editor.completer)
        editor.completer = new qc.autocomplete.Autocomplete();
      editor.completer.autoInsert = true;
      editor.completer.autoSelect = true;
      editor.completer.showPopup(editor);
      editor.completer.cancelContextMenu();
    };

    //
    // We want to be able to handle a file drop on the query editor. Default behavior
    // is to change the browser to a view of that file, so we need to override that
    //

    function handleDragOver(evt) {
      evt.stopPropagation();
      evt.preventDefault();
      evt.dataTransfer.dropEffect = 'copy';
    }

    //
    // loading queries and history
    //

    function loadHistoryFileList(files) {
      qc.input_selection.selected.item = 0; // reset
      // make sure we have a file
      if (files.length == 0)
        return;

      // make sure the file ends .n1ql
      var file = files.item(0);
      if (!file.name.toLowerCase().endsWith(".json")) {
        showErrorMessage("Can't load: " + file.name + ".\nHistory import only supports files ending in '.json'")
        return;
      }

      // files is a FileList of File objects. load the first one into the editor, if any.
      var reader = new FileReader();
      reader.addEventListener("loadend",function() {
        try {
          var newHistory = JSON.parse(reader.result);
          if (!_.isArray(newHistory.pastQueries)) {
            showErrorMessage("Unrecognized query history format.");
            return;
          }

          newHistory.pastQueries.forEach(function(aResult) {
            // make sure it at least has query text
            if (_.isString(aResult.query)) {
              qwQueryService.addSavedQueryAtEndOfHistory(aResult);
            }
          });
        } catch (e) {
          showErrorMessage("Error processing history file: " + e);
        }
      });
      reader.readAsText(files[0]);
    }


    function handleFileDrop(evt) {
      evt.stopPropagation();
      evt.preventDefault();

      var files = evt.dataTransfer.files; // FileList object.
      loadQueryFileList(files);
    }

    // when they click the Import button
    var import_selection = {item: "0"};

    function do_import() {
      this.dialogRef = qc.modalService.open(QwFileImportDialog);
      this.dialogRef.componentInstance.file_type = 'query';
      this.dialogRef.componentInstance.file_options = [
        {kind: "txt", label:  "Query - load the contents of a text file into the query editor."},    // 0
        {kind: "json", label: "Query History - load a file into the end of the current query history."}, // 1
      ];
      this.dialogRef.componentInstance.selected = import_selection;
      this.dialogRef.result.then(
        function success(res) {
          qc.loadQuery.value = null;
          qc.loadQuery.addEventListener('change', function() {
            if (import_selection && import_selection.item == 1)
              loadHistoryFileList(this.files);
            else
              loadQueryFileList(this.files);
          },false);
          qc.loadQuery.click();
        },
        function cancel(res) {}
      );
    }

    function loadQueryFileList(files) {
      // make sure we have a file
      if (files.length == 0)
        return;

      // make sure the file ends in .txt or .n1ql
      var file = files.item(0);
      if (!file.name.toLowerCase().endsWith(".n1ql") && !file.name.toLowerCase().endsWith(".txt")) {
        showErrorMessage("Can't load: " + file.name + ".\nQuery import only supports files ending in '.txt'");
        return;
      }

      // files is a FileList of File objects. load the first one into the editor, if any.
      var reader = new FileReader();
      reader.addEventListener("loadend",function() {addNewQueryContents(reader.result);});
      reader.readAsText(files[0]);
    }

    // bring the contents of a file into the query editor and history

    function addNewQueryContents(contents) {
      // move to the end of history
      qwQueryService.addNewQueryAtEndOfHistory(contents);
      qc.inputEditor.getSession().setValue(contents);
    }

    //
    // Initialize the output ACE editor
    //

    function aceOutputLoaded(_editor) {
      //console.log("AceOutputLoaded");
      _editor.setOptions({
        mode: 'ace/mode/json',
        showGutter: true,
      });

      _editor.$blockScrolling = Infinity;
      _editor.setReadOnly(true);
      _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      _editor.getSession().on('changeScrollTop',function() {qc.setUserInterest('results');});

      qc.outputEditor = _editor;
      _editor.getSession().on("change", qc.aceOutputChanged);
      updateEditorSizes();
    }

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

    }


    //
    // programatically open up the JSON results search dialog
    //

    var config = ace.require("ace/config" );
    function aceSearchOutput() {
      config.loadModule("ace/ext/cb-searchbox",
        function(e) {e.Search(qc.outputEditor)});
    }

    //
    // callback when plan text editor loaded
    //

    function acePlanLoaded(_editor) {
      //console.log("AcePlanLoaded");
      _editor.setOptions({
        mode: 'ace/mode/json',
        showGutter: true,
      });
      _editor.$blockScrolling = Infinity;
      _editor.setReadOnly(true);
      _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      //qc.outputEditor = _editor;
      _editor.getSession().on("change", qc.acePlanChanged);
      updateEditorSizes();
    }

    function acePlanChanged(e) {
      //e.$blockScrolling = Infinity;

      updateEditorSizes();
    }

    //
    // called when the JSON output changes. We need to make sure the editor is the correct size,
    // since it doesn't auto-resize
    //

    var updateEditorSizes = _.debounce(updateEditorSizesInner,100);
    var minEditorHeight = 66;

    function updateEditorSizesInner() {
      var totalHeight = window.innerHeight - 130; // window minus header size
      var aceEditorHeight = 0;

      // how much does the query editor need?
      if (qc.inputEditor) {
        // give the query editor at least 3 lines, but it might want more if the query has > 3 lines
        var lines = qc.inputEditor.getSession().getLength();       // how long in the query?
        var desiredQueryHeight = Math.max(23,lines*22);         // make sure height no less than 23

        // when focused on the query editor, give it up to 3/4 of the total height, but make sure the results
        // never gets smaller than 270
        var maxEditorSize = Math.min(totalHeight*3/4,totalHeight - 270);

        // if the user has been clicking on the results, minimize the query editor
        if (qc.getUserInterest() == 'results' || desiredQueryHeight < minEditorHeight)
          aceEditorHeight = minEditorHeight;
        else
          aceEditorHeight = Math.min(maxEditorSize,desiredQueryHeight);      // don't give it more than it wants

        qc.editorElement.style.height = aceEditorHeight + "px";
        setTimeout(resizeInputEditor,200); // wait until after transition
      }

      //
      // Since the query editor might have changed, inform the ACE editor for JSON output that
      // it might need to resize.
      //

      if (qwQueryService.outputTab == 1)
        setTimeout(resizeOutputEditor,200);
    }

   //
    // convenience functions for safely refreshing the ACE editors
    //

    function resizeInputEditor() {
      try {
        if (qc.inputEditor && qc.inputEditor.renderer && qc.inputEditor.resize)
          qc.inputEditor.resize(true);
      } catch (e) {console.log("Input error: " + e);/*ignore*/}
    }

    function resizeOutputEditor() {
      try {
        if (qc.outputEditor && qc.outputEditor.renderer && qc.outputEditor.resize)
          qc.outputEditor.resize();
      } catch (e) {console.log("Output error: " + e);/*ignore*/}
    }
    //
    // keep track of which parts of the UI the user is clicking, indicating their interest
    //

    qc.handleClick = function(detail) {
      qc.setUserInterest(detail);
      updateEditorSizes();
    }

    //
    // make the focus go to the input field, so that backspace doesn't trigger
    // the browser back button
    //

    function focusOnInput()  {
      if (qc.inputEditor && qc.inputEditor.focus)
        qc.inputEditor.focus();
    }

    //
    // check a n1ql parse tree for dodgy queries, like delete without where
    //

    function checkTree(tree) {
    }

    //
    // The Ace editor uses, as its model, the query from the current selection in the query history.
    // there seems to be an occasional race condition when setting the query in the query history, only
    // to have it overwritten by the Ace editor. This function changes both at the same time, to avoid
    // a race.
    //

    function set_query(new_query) {
      if (new_query != qc.lastResult().query) {
        qc.lastResult().set_query(new_query);
        qc.inputEditor.getSession().setValue(new_query);
      }
    }

    //
    // functions for running queries and saving results to a file
    //

    function query({explainOnly= false,txImplicit= false}) {
      // make sure there is a query to run
      if (qc.lastResult().query.trim().length == 0)
        return;

      // if a query is already running, we should cancel it
      if (qc.lastResult().busy) {
        qwQueryService.cancelQuery(qc.lastResult());
        return;
      }

      // don't let the user edit the query while it's running
      //qc.inputEditor.setReadOnly(true);

      // remove trailing whitespace to keep query from growing, and avoid
      // syntax errors (query parser doesn't like \n after ;
      if (endsWithSemi.test(qc.lastResult().query))
        set_query(qc.lastResult().query.trim());

      // if the user wants auto-formatting, format the query
      if (qwQueryService.get_auto_format())
        format();

      // do a sanity check to warn users about dangerous queries
      var warningPromise = null;
      try {
        var parseResults = N1qlParser.parse(qc.lastResult().query);

        if (_.isArray(parseResults)) for (var i=0; i< parseResults.length; i++) {
          var result = parseResults[i];
          if (result && (result.isUpdate || result.isDelete) && !result.has_where && !result.use_keys) {
            warningPromise = qc.qwDialogService.showNoticeDialog("Warning",
              "Query contains UPDATE/DELETE with no WHERE clause or USE KEYS. Such a query would affect all documents. Proceed anyway?");
            break;
          }
        }
      }
      catch (except) {console.log("Error parsing queries: " + except);}

      // if there is a warning, make sure they want to proceed
      if (warningPromise)
        warningPromise.then(
          function success() {
            var promise = qwQueryService.executeUserQuery(explainOnly,txImplicit);
            // also have the input grab focus at the end
            if (promise)
              promise.then(doneWithQuery,doneWithQuery);
            else
              doneWithQuery();
          },
          function error() {/* they cancelled, nothing to do */}
        );
      // otherwise just proceed

      else {
        var promise = qwQueryService.executeUserQuery(explainOnly,txImplicit);
        // also have the input grab focus at the end
        if (promise)
          promise.then(doneWithQuery,doneWithQuery);
        else
          doneWithQuery();
      }
    }

    //
    // when a query finishes, we need to re-enable the query field, and try and put
    // the focus there
    //
    var aceRange = ace.require('ace/range').Range;

    function doneWithQuery() {
      // if there are possibly bad fields in the query, mark them
      var annotations = [];
      var markers = [];
      var markerIds = [];
      var session = qc.inputEditor.getSession();

      //console.log("Explain result: " + JSON.stringify(qc.lastResult().explainResult));
      //console.log("Explain result probs: " + JSON.stringify(qc.lastResult().explainResult.problem_fields));

      if (qc.lastResult() && qc.lastResult().explainResult && qc.lastResult().explainResult.problem_fields &&
        qc.lastResult().explainResult.problem_fields.length > 0) {
        var lines = session.getLines(0,session.getLength()-1);
        var fields = qc.lastResult().explainResult.problem_fields;

        var allFields = "";
        var field_names = [];

        for (var i=0;i<fields.length;i++) {
          allFields += " " + fields[i].bucket + "." + fields[i].field.replace(/\[0\]/gi,"[]") + "\n";
          // find the final name in the field path, extracting any array expr
          var field = fields[i].field.replace(/\[0\]/gi,"");
          var lastDot = field.lastIndexOf(".");
          if (lastDot > -1)
            field = field.substring(lastDot);
          field_names.push(field);
        }

        // one generic warning for all unknown fields
        annotations.push(
          {row: 0,column: 0,
            text: "Some fields not found in inferred schema (they may be misspelled):\n"+allFields,
            type: "warning"});

        // for each line, for each problem field, find all matches and add an info annotation
        for (var l=0; l < lines.length; l++)
          for (var f=0; f < field_names.length; f++) {
            var startFrom = 0;
            var curIdx = -1;
            while ((curIdx = lines[l].indexOf(field_names[f],startFrom)) > -1) {
              markers.push({start_row: l, end_row: l, start_col: curIdx, end_col: curIdx + field_names[f].length});
              startFrom = curIdx + 1;
            }
          }
      }

      for (var i=0; i<markers.length; i++)
        markerIds.push(session.addMarker(new aceRange(markers[i].start_row,markers[i].start_col,
          markers[i].end_row,markers[i].end_col),
          "ace_selection","text"));

      if (annotations.length > 0)
        session.setAnnotations(annotations);
      else
        session.clearAnnotations();

      // now update everything
      //qc.inputEditor.setReadOnly(false);
      qc.markerIds = markerIds;
      qc.setUserInterest('results');
      updateEditorSizes();
      focusOnInput();
      qc.result_subject.next(qc.lastResult());
    }

    //
    // save the results to a file. Here we need to use a scope to to send the file name
    // to the file name dialog and get it back again.
    //

    var dialogScope = {};

    // default names for save and save_query
    dialogScope.data_file = {name: "data.json"};
    dialogScope.query_file = {name: "n1ql_query.txt"};
    dialogScope.file = {name: "output"};

    //
    // going forward we will have a single file dialog that allows the user to select
    // "Results" or "Query"
    //

    function unified_save() {
      dialogScope.safari = /^((?!chrome).)*safari/i.test(navigator.userAgent);

      // but for those that do, get a name for the file
      var dialogRef = qc.modalService.open(QwUnifiedFileDialog);
      var file_name = {name:'output'};
      var selected_option = {item: "0"};
      dialogRef.componentInstance.file_type = 'query';
      dialogRef.componentInstance.file = file_name;
      dialogRef.componentInstance.file_options = [
        {kind: "json", label: "Current query results (JSON)"},           // 0
        {kind: "txt", label: "Current results as tab-separated (text)"}, // 1
        {kind: "json", label: "Query history (JSON)"},                   // 2
        {kind: "json", label: "Query history including results (JSON)"}  // 3
      ];
      if (qc.lastResult().query && qc.lastResult().query.length > 0)
        dialogRef.componentInstance.file_options.push({kind: "txt", label: "Current Query Statement (txt)"}); // 4
      dialogRef.componentInstance.selected = selected_option;

      // now save it
      dialogRef.result.then(
        function success(res) {
        var file;
        var file_extension;

        switch (selected_option.item) {
          case "0":
            file = new Blob([qc.lastResult().result],{type: "text/json", name: "data.json"});
            file_extension = ".json";
            break;

          case "1":
            var csv = qwJsonCsvService.convertDocArrayToTSV(qc.lastResult().data);
            if (!csv || csv.length == 0) {
              qwDialogService.showErrorDialog("Save Error",
                "Unable to create tab-separated values, perhaps source data is not an array.", true);
              return;
            }
            file = new Blob([csv],{type: "text/plain", name: "data.txt"});
            file_extension = ".txt";
            break;

          case "2":
            file = new Blob([qwQueryService.getQueryHistory()],{type: "text/json", name: "query_history.json"});
            file_extension = ".json";
            break;

          case "3":
            file = new Blob([qwQueryService.getQueryHistory(true)],{type: "text/json", name: "query_history_full.json"});
            file_extension = ".json";
            break;

          case "4":
            file = new Blob([qc.lastResult().query],{type: "text/plain", name: "query.txt"});
            file_extension = ".txt";
            break;

          default:
            console.log("Error saving content, no match, selected item: " + selected_options.item);
            break;
        }

        saveAs(file,file_name.name + file_extension);
      }, function cancel(res) {});

    }

    //
    // save the current query to a file. Here we need to use a scope to to send the file name
    // to the file name dialog and get it back again.
    //

    function edit_history() {

      // bring up the dialog
      this.dialogRef = this.modalService.open(QwHistoryDialog);

      this.dialogRef.result.then(
        function ok(result) {
          if (result === 'run')
            query(false);
        },
        function cancel() {});
    }


    //
    // toggle the size of the bucket insights pane
    //

    function toggleAnalysisSize() {
      if (!qc.analysisExpanded) {
        qc.insightsSidebar.classList.remove("width-3");
        qc.insightsSidebar.classList.add("width-6");
        qc.wbMainWrapper.classList.remove("width-9");
        qc.wbMainWrapper.classList.add("width-6")
      }
      else {
        qc.insightsSidebar.classList.remove("width-6");
        qc.insightsSidebar.classList.add("width-3");
        qc.wbMainWrapper.classList.remove("width-6");
        qc.wbMainWrapper.classList.add("width-9");
      }
      qc.analysisExpanded = !qc.analysisExpanded;
    }
    //
    // hide & show the bucket insights pane for a full-screen view of the wb
    //

    function toggleFullscreen() {
      if (!qc.fullscreen) {
        qc.insightsSidebar.classList.remove("width-3");
        qc.insightsSidebar.classList.add("fix-width-0");
        qc.wbMainWrapper.classList.remove("width-9");
        qc.wbMainWrapper.classList.add("width-12");
        mnPoolDefault.setHideNavSidebar(true);
      }
      else {
        qc.insightsSidebar.classList.remove("fix-width-0");
        qc.insightsSidebar.classList.add("width-3");
        qc.wbMainWrapper.classList.remove("width-12");
        qc.wbMainWrapper.classList.add("width-9");
        mnPoolDefault.setHideNavSidebar(false);
      }
      qc.fullscreen = !qc.fullscreen;
    }

    //
    // convert the current query result to Tab-Separated format
    //

    function copyResultAsCSV() {
      var csv = qwJsonCsvService.convertDocArrayToTSV(qc.lastResult().data);

      // error check
      if (!csv || csv.length == 0) {
        qwDialogService.showErrorDialog("CSV Error","Unable to create tab-separated values, perhaps source data is not an array.");
        return;
      }

      // create temp element
      var copyElement = document.createElement("textarea");
      angular.element(document.body.append(copyElement));
      copyElement.value = csv;
      copyElement.focus();
      copyElement.select();
      document.execCommand('copy');
      copyElement.remove();
    }

    //
    // what buckets and scopes exist for the currently selected context bucket
    //

    function getContextBuckets() {
      return qc.buckets.map(bucket => bucket.name);
    }

    function getContextScopes() {
      var scopes = [];

      if (qc.lastResult().query_context_bucket) {
        var bucket = qc.buckets.find(b => b.name == qc.lastResult().query_context_bucket);
        if (bucket) {
          bucket.scopeArray.forEach(scope => scopes.push(scope.id));
          if ((!qc.lastResult().query_context_scope || scopes.indexOf(qc.lastResult().query_context_scope) < 0) && scopes.length > 0)
            qc.lastResult().query_context_scope = scopes[0];
        }
      }
      return scopes;
    }

    //
    // dealing with collections in need of a primary index
    //

    function needsPrimaryIndex() {
      var res = qc.lastResult().data;
      return(_.isArray(res) && res.length > 0 && res[0].code == 4000 &&
        res[0].msg && res[0].msg.indexOf("CREATE PRIMARY") >= 0);
    }

    function createPrimaryIndex() {
      var res = qc.lastResult().data;
      var createCmd = res[0].msg.substring(res[0].msg.indexOf("CREATE PRIMARY"),
        res[0].msg.indexOf(" to create a primary index"));
      if (createCmd && createCmd.length)
        qc.qwQueryService.executeQueryUtil(createCmd,false)
          .then(
            function success(resp) {
              // bring up a dialog to warn that building indexes may take time.
              qc.qwDialogService
                .showNoticeDialog("Creating primary index...","Creating primary index. This will take a moment.",
                  null,true);
            },
            function error(resp)
            {
              var message = "Error creating primary index.";
              var message_details = [];
              if (resp && resp.config && resp.config.data && resp.config.data.statement)
                message_details.push(resp.config.data.statement);
              if (resp && resp.data && resp.data.errors)
                resp.data.errors.forEach(error => message_details.push(error.msg));

              qc.qwQueryService.showErrorDialog(message,message_details);
            });
    }

    // do we have advice indicating other indexes might help?
    function canCreateOtherIndexes() {
      var advice = qc.lastResult().advice;
      return(advice && advice.recommended_indexes && advice.recommended_indexes.indexes);
    }
  }

  //
  // let's start off with a list of the buckets
  //

  activate() {
    //
    // make sure we stay on top of the latest query nodes
    //

    this.qc.updateBuckets();

    //$rootScope.$on("nodesChanged", function () {
    // qc.updateNodes();
    //});

    // if we receive a query parameter, and it's not the same as the current query,
    // insert it at the end of history
    var params = this.uiRouter.globals.params;

    if (params && _.isString(params.query) && params.query.length > 0 &&
      params.query != this.qc.lastResult().query) {
      this.qc.qwQueryService.addNewQueryAtEndOfHistory(params.query);
    }

    // Prevent the backspace key from navigating back. Thanks StackOverflow!
    // $(document).unbind('keydown').bind('keydown', function (event) {
    //   var doPrevent = false;
    //   if (event.keyCode === 8) {
    //     var d = event.srcElement || event.target;
    //     if ((d.tagName.toUpperCase() === 'INPUT' &&
    //         (
    //           d.type.toUpperCase() === 'TEXT' ||
    //           d.type.toUpperCase() === 'PASSWORD' ||
    //           d.type.toUpperCase() === 'FILE' ||
    //           d.type.toUpperCase() === 'SEARCH' ||
    //           d.type.toUpperCase() === 'EMAIL' ||
    //           d.type.toUpperCase() === 'NUMBER' ||
    //           d.type.toUpperCase() === 'DATE' )
    //       ) ||
    //       d.tagName.toUpperCase() === 'TEXTAREA') {
    //       doPrevent = d.readOnly || d.disabled;
    //     }
    //     else {
    //       doPrevent = true;
    //     }
    //   }
    //
    //   if (doPrevent) {
    //     event.preventDefault();
    //   }
    // });

    //
    // check bucket counts every 5 seconds
    //

    //if (!qwQueryService.pollSizes) {
    //  qwQueryService.pollSizes = $interval(function () {
    //$rootScope.$broadcast("checkBucketCounts");
    //  }, 10000);

    //$scope.$on('$destroy', function () {
    //$interval.cancel(qwQueryService.pollSizes);
    //  qwQueryService.pollSizes = null;
    //});
    //}

    /*
     * Watch whether a query is running, meaning that the query input should be read-only
     */

    //$scope.$watch($interpolate("{{qc.lastResult().busy}}"),function(newValue) {
    //  if (qc.inputEditor) {
    //    qc.inputEditor.setReadOnly(qc.lastResult().busy);
    //  }
    //});

    //
    // now let's make sure the window is the right size
    //

    setTimeout(this.qc.updateEditorSizes,100);
  }

  //
  // bring up the options dialog
  //

  options() {
    var qwQueryService = this.qwQueryService;
    var prefOptions = this.qwQueryService.clone_options();
    var pp = prefOptions.positional_parameters;
    var np = prefOptions.named_parameters;
    prefOptions.positional_parameters = [];
    prefOptions.named_parameters = [];
    prefOptions.isEnterprise = this.isEnterprise();

    // the named & positional parameters are values, convert to JSON
    if (pp)
      for (var i=0; i < pp.length; i++)
        prefOptions.positional_parameters[i] =
          JSON.stringify(pp[i]);

    if (np)
      for (var i=0; i < np.length; i++) {
        prefOptions.named_parameters.push({
          name: np[i].name,
          value: JSON.stringify(np[i].value)
        });
      }

    // bring up the dialog
    this.dialogRef = this.modalService.open(QwPrefsDialog);
    this.dialogRef.componentInstance.options = prefOptions;

    this.dialogRef.result
      .then(function success(res) {
      // any named or positional parameters are entered as JSON, and must be parsed into
      // actual values
      if (prefOptions.positional_parameters)
        for (var i=0; i < prefOptions.positional_parameters.length; i++)
          prefOptions.positional_parameters[i] =
            JSON.parse(prefOptions.positional_parameters[i]);

      if (prefOptions.named_parameters)
        for (var i=0; i < prefOptions.named_parameters.length; i++)
          prefOptions.named_parameters[i].value =
            JSON.parse(prefOptions.named_parameters[i].value);

      qwQueryService.set_options(prefOptions);
      qwQueryService.saveStateToStorage();
    },
        function cancel() {});

  }

}
