/**
 * A controller for browser-based data import
 */

(function() {

  angular.module('qwQuery').controller('qwImportController', importController);

  importController.$inject = ['$rootScope', '$scope', '$http','$uibModal', '$uibModalStack', '$timeout',
    'qwQueryService', 'validateQueryService', 'qwImportService'];

  function importController ($rootScope, $scope, $http, $uibModal, $uibModalStack, $timeout, qwQueryService,
      validateQueryService, qwImportService) {

    var ic = this;
    var qis = qwImportService;

    // get our buckets and options from the import service, so they persist
    // between invocations (especially when an import is in progress)
    ic.buckets = qis.buckets;
    ic.options = qis.options;
    ic.doImport = qis.doImport;

    // local state that doesn't need to persist
    ic.status = "";

    // local functions and variables
    ic.aceOutputLoaded = aceOutputLoaded;
    ic.parseAs = parseAs;
    ic.getCbimport = getCbimport;
    ic.showTableChanged = showTableChanged;

    ic.formats = ["CSV","TSV","JSON List","JSON Lines"];
    ic.options.selectedFormat = ic.formats[0];

    ic.selectFile = function() {
      $("#loadQuery")[0].value = null;
      $("#loadQuery")[0].addEventListener('change',handleFileSelect,false);
      $("#loadQuery")[0].click();
    };

    ic.aceFileOptions = {
        mode: 'text',
        showGutter: true,
        useWrapMode: true,
        onLoad: ic.aceOutputLoaded,
        //onChange: ic.aceOutputChanged,
        $blockScrolling: Infinity
    };

    // data pills
    ic.selected = 1;
    ic.isSelected = function(tab) {return ic.selected == tab};
    ic.selectTab = function(tab) {
      if (tab != ic.selected) {
        ic.selected = tab;
        // if they switched to show JSON and we don't have JSON yet, create it
        if (ic.selected == 3 && ic.options.docJson.length == 0)
          ic.options.docJson = JSON.stringify(ic.options.docData,null,2);
      }
    };

    // regex to figure out what format the data appears to be
    var looksLikeTSV = /^[^\t\n]+[\t]/;
    var looksLikeCSV = /^[^,\n]+[,]/;
    var looksLikeJSONList = /^\s*\[[\s\n]*\{/;
    var looksLikeJSONLines = /^\s*\{[^\n]*\}\s*\n/;

    //
    // call the activate method for initialization
    //

    activate();

    //
    // the user selected a new file to import
    //

    function handleFileSelect() {
      ic.options.fileName = "";
      ic.options.fileSize = "";
      ic.options.fileData = "";
      ic.options.docData = "";
      ic.options.selectedDocIDField = "";
      ic.options.last_import_status = "";

      var file = this.files[0];
      var fileSize = this.files[0].size;
      var fileName = this.files[0].name;

      if (fileSize/1024/1024 > 100) {
        ic.status = this.files[0].name + " is too large (> 100 MB)";
        return;
      }

      ic.options.fileName = this.files[0].name;
      ic.options.fileSize = Math.round(fileSize*1000/1024/1024)/1000;
      ic.status = "loading data file";

      // post a dialog for large files, since loading can take a while

      if (ic.options.fileSize > 5) {
        qis.closeAllDialogs();

        var dialogScope = $rootScope.$new(true);
        dialogScope.title = "Loading Data File...";
        dialogScope.detail = "Loading file " + fileName + ", size: " + ic.options.fileSize +
                              "MB, which may take a while.";
        $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_notice_dialog.html',
          scope: dialogScope
        });
      }

      var reader = new FileReader();
      reader.addEventListener("loadend",function() {
        qis.closeAllDialogs();
        ic.options.fileData = reader.result;
        ic.options.fields = [];
        ic.selectTab(2);
        if (ic.options.fileData.match(looksLikeJSONList))
          parseAs(ic.formats[2]);

        else if (ic.options.fileData.match(looksLikeJSONLines))
          parseAs(ic.formats[3]);

        else if (ic.options.fileData.match(looksLikeTSV))
          parseAs(ic.formats[1]);

        else if (ic.options.fileData.match(looksLikeCSV))
          parseAs(ic.formats[0]);

        else {
          qis.showErrorDialog("Import Warning","Data doesn't look like JSON, CSV, or TSV. Try a different parsing format.", true);
          ic.selectTab(1);
          ic.status = ic.options.fileName + " (" + ic.options.fileSize + " MB)";
        }
      });

      // handle any errors reading the file
      var handleReaderError = function(e) {
        qis.closeAllDialogs();
        qis.showErrorDialog("File Loading Error", 'Errors loading file: ' + JSON.stringify(e), true);
      }
      reader.addEventListener("error",handleReaderError);
      reader.addEventListener("abort",handleReaderError);

      reader.readAsText(file);
    }

    //
    // try to turn the data file into a list of JSON documents we can upload to a bucket
    //

    function parseAs(format) {
      // nothing to do if no data loaded
      if (!ic.options.fileData || !ic.options.fileData.length) {
        ic.status = "";
        return;
      }

      ic.options.docData = "";
      ic.options.docJson = "";
      ic.options.selectedFormat = format;
      ic.status = "Parsing data file...";
      ic.options.useKey = false;

      switch (format) {
      case ic.formats[0]:
        ic.options.docData = d3.csvParse(ic.options.fileData);
      break;

      case ic.formats[1]:
        ic.options.docData = d3.tsvParse(ic.options.fileData);
        break;

      case ic.formats[2]: // JSON List
        try {
          ic.options.docData = JSON.parse(ic.options.fileData);
        } catch (e) {
          qis.showErrorDialog("JSON Parse Errors", 'Errors parsing JSON list: ' + JSON.stringify(e), true);
        }
        break;

      case ic.formats[3]: // JSON Lines - parse each line as separate doc
        ic.options.docData = [];
        var parseErrors = "";
        ic.options.fileData.split('\n').forEach(function (line) {
          try {if (line && line.length >=2) ic.options.docData.push(JSON.parse(line));}
          catch (e) {parseErrors += JSON.stringify(e);}
        });
        if (parseErrors.length > 0)
          qis.showErrorDialog("JSON Parse Errors", 'Errors parsing JSON: ' + JSON.stringify(parseErrors).slice(0,255), true);
        break;

      }

      // now get the list of fields common to all documents, as possible doc IDs
      if (ic.options.docData.length) {
        ic.status = ic.options.fileName + " (" + ic.options.fileSize + " MB)";
        if (!ic.options.showTable)
          ic.options.docJson = JSON.stringify(ic.options.docData,null,2);

        var fields = getDocFields(ic.options.docData[0]);
        ic.options.docData.forEach(function (doc) {
          fields = _.intersection(getDocFields(doc));
        });

        ic.options.fields = fields;
        ic.options.selectedDocIDField = fields[0];
      }
    }

    // called whenever the user switches between show table/json
    function showTableChanged() {
      // if they switched to show JSON and we don't have JSON yet, create it
      if (!ic.options.showTable && ic.options.docJson.length == 0)
        ic.options.docJson = JSON.stringify(ic.options.docData,null,2);
    }

    // get the possible id fields from a doc, which are non-object non-array fields
    function getDocFields(doc) {
      var fields = [];
      Object.keys(doc).forEach(function (fieldName) {
        var val = doc[fieldName];
        if (!_.isArray(val) && !_.isObject(val))
          fields.push(fieldName);
      });

      return(fields);
    }

    //
    // set up the ACE viewer for input files
    //

    function aceOutputLoaded(_editor) {
      //console.log("AceOutputLoaded");
      _editor.$blockScrolling = Infinity;
      _editor.setReadOnly(true);
      _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines

      if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
        _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

      _editor.getSession().on('changeScrollTop',function() {qc.setUserInterest('results');});

      ic.outputEditor = _editor;
    };

    //
    // get the text of the equivalent cbimport command
    //

    function getCbimport() {
      var command = 'cbimport ';

      // file format
      switch (ic.selectedFormat) {
      case ic.formats[0]: command += 'csv '; break;
      case ic.formats[1]: command += "csv --field-separator '\\t' "; break;
      case ic.formats[2]: command += 'json --format list '; break;  // JSON List
      case ic.formats[3]: command += 'json --format lines '; break; // JSON Lines
      }

      // credentials, which we can't fill in
      command += '-u <login> -p <password> ';

      // file name
      if (ic.options.fileName && ic.options.fileName.length)
        command += "-d 'file://" + ic.options.fileName + "' ";

      // bucket name
      if (ic.options.selectedBucket && ic.options.selectedBucket.length)
        command += "-b '" + ic.options.selectedBucket + "' ";

      // key
      if (!ic.options.useKey)
        command += '-g #UUID# ';
      else
        command += '-g %' + ic.options.selectedDocIDField + '% '
      return(command);
    }

    //
    // when we activate, check with the query service to see if we have a query node. If
    // so, we can use n1ql, if not, use the regular mode.
    //

    function activate() {
      // if we importing a huge file, don't try to show the file contents on the screen
      if (ic.options.importing && ic.options.fileSize > 5) {
        ic.options.docJson = "";
        ic.options.fileData = "";
      }
      // see if we have access to a query service
      validateQueryService.getBucketsAndNodes(function() {
        var promise = qwImportService.getBuckets();
      });
    }

    //
    // all done, return the controller
    //

    return ic;
  }

})();
