/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import _                                from "lodash";
import {MnLifeCycleHooksToStream}       from 'mn.core';
import {Component,
  ViewEncapsulation,
  ChangeDetectorRef}                    from '@angular/core';
import { FormControl, FormGroup}        from '@angular/forms';

import { QwImportService }              from '../../angular-services/qw.import.service.js';
import { QwMetadataService }            from '../../angular-services/qw.metadata.service.js';
import { QwQueryService }               from '../../angular-services/qw.query.service.js';
import { QwDialogService }              from '../../angular-directives/qw.dialog.service.js';

import { csvParse as d3CsvParse, tsvParse as d3TsvParse, autoType as d3AutoType } from "d3-dsv";

import template                         from "./qw.import.html";

export {QwImportComponent};


class QwImportComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      template,
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      ChangeDetectorRef,
      QwDialogService,
      QwImportService,
      QwMetadataService,
      QwQueryService,
      ];
  }

  ngOnInit() {
    this.configForm.setValue({useKey: this.options.useKey});
    this.configForm.get('useKey').valueChanges.subscribe(data => this.options.useKey = data);
  }

  constructor(cdr, qwDialogService, qwImportService, qwMetadataService, qwQueryService) {
    super();

    var ic = this;
    var qis = qwImportService;
    ic.cdr = cdr;
    this.ic = ic;
    this.compat = qwMetadataService.compat;

    this.configForm = new FormGroup({
        useKey: new FormControl()
    });

    ic.rbac = qwMetadataService.rbac;
    ic.docImporter = function() {
      return ic.rbac.init && ic.rbac.cluster.collection['.:.:.'].data.docs.write &&
        ic.rbac.cluster.collection['.:.:.'].collections.read;
    };

    // get our buckets and options from the import service, so they persist
    // between invocations (especially when an import is in progress)
    ic.options = qis.options;
    ic.doImport = qis.doImport;

    // local functions and variables
    ic.aceOutputLoaded = aceOutputLoaded;
    ic.parseAs = parseAs;
    ic.getCbimport = getCbimport;
    ic.showTableChanged = showTableChanged;

    ic.formats = ["CSV","TSV","JSON List","JSON Lines"];
    ic.options.selectedFormat = ic.formats[0];
    ic.validQueryService = qwMetadataService.valid;

    ic.selectFile = function() {
      var fileInput = document.getElementById("loadQuery");
      fileInput.value = null;
      fileInput.addEventListener('change',handleFileSelect,false);
      fileInput.click();
    };

    ic.aceFileOptions = {
        mode: 'text',
        showGutter: true,
     };

    ic.onEditorReady = function(editor) {
      editor.setOptions(ic.aceFileOptions);
    }

    ic.aceJsonOptions = {
        mode: 'ace/mode/json',
        showGutter: true,
     };

    ic.onJsonReady = function(editor) {
      editor.setOptions(ic.aceJsonOptions);
    };

    ic.collectionMenuCallback = function(event) {
      if (event) {
        ic.options.selected_bucket = event.bucket;
        ic.options.selected_scope = event.scope;
        ic.options.selected_collection = event.collection;
      }
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

    // can we import?
    ic.canImport = function() {
      let a = ic.options.docData.length > 0 && ic.options.selected_bucket && ic.validQueryService();
      let b = (!this.compat.atLeast70 || (ic.options.selected_collection && ic.options.selected_scope));
      return ic.options.docData.length > 0 && ic.options.selected_bucket && ic.validQueryService() &&
          (!this.compat.atLeast70 || (ic.options.selected_collection && ic.options.selected_scope));
    };

    // reasons that could prevent us from importing
    ic.importError = function() {
      if (!qwMetadataService.valid()) return "No query service";
      if (ic.options.docData.length == 0) return "No data to import";
      if (!ic.options.selected_bucket) return "No selected bucket";
      if (this.compat.atLeast70 && (!ic.options.selected_collection || !ic.options.selected_scope))
        return "No selected scope/coll";
      if (ic.importErrors)
        return ic.importErrors;
      return null;
    };

    // regex to figure out what format the data appears to be
    var looksLikeTSV = /^[^\t\n]+[\t]/;
    var looksLikeCSV = /^[^,\n]+[,]/;
    var looksLikeJSONList = /^\s*\[[\s\n]*\{/;
    var looksLikeJSONLines = /^\s*\{[^\n]*\}\s*\n/;

    //
    // the user selected a new file to import
    //

    function handleFileSelect(event) {
      ic.options.fileName = "";
      ic.options.fileSize = "";
      ic.options.fileData = "";
      ic.options.docData = "";
      ic.options.selectedDocIDField = "";
      ic.options.last_import_status = "";

      var file = event.target.files[0];
      var fileSize = event.target.files[0].size;
      var fileName = event.target.files[0].name;

      if (fileSize/1024/1024 > 100) {
        ic.options.status = fileName + " is too large (> 100 MiB)";
        return;
      }

      ic.options.fileName = fileName;
      ic.options.fileSize = Math.round(fileSize*1000/1024/1024)/1000;
      ic.options.status = "loading data file";

      // post a dialog for large files, since loading can take a while

       if (ic.options.fileSize > 5) {
         qwDialogService.showNoticeDialog("Loading Data File...",
         "Loading file " + fileName + ", size: " + ic.options.fileSize +
                               "MiB, which may take a while.");
       }

      var reader = new FileReader();
      reader.addEventListener("loadend",function() {
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
          qwDialogService.showErrorDialog("Import Warning","Data doesn't look like JSON list/lines, CSV, or TSV. Try a different parsing format.", null, true);
          ic.selectTab(1);
          ic.options.status = ic.options.fileName + " (" + ic.options.fileSize + " MiB)";
        }
      });

      // handle any errors reading the file
      var handleReaderError = function(e) {
        qwDialogService.closeAllDialogs();
        qwDialogService.showErrorDialog("File Loading Error", 'Errors loading file: ' + JSON.stringify(e), null, true);
      }
      reader.addEventListener("error",handleReaderError);
      reader.addEventListener("abort",handleReaderError);

      reader.readAsText(file);
    }


    // d3AutoType makes empty strings into null, we want them to be empty strings
    // change empty strings to '""', let d3AutoType do its stuff, then convert back
    function checkTypes(object) {
      for (var key in object) if (object[key] == "") object[key] = '""';
      object = d3AutoType(object);
      for (var key in object) if (object[key] == '""') object[key] = "";
      return object;
    }

    //
    // try to turn the data file into a list of JSON documents we can upload to a bucket
    //

    function parseAs(format) {
      // nothing to do if no data loaded
      if (!ic.options.fileData || !ic.options.fileData.length) {
        ic.options.status = "";
        return;
      }

      ic.options.docData = "";
      ic.options.docJson = "";
      ic.options.selectedFormat = format;
      ic.options.status = "Parsing data file...";
      ic.options.useKey = false;
      ic.importErrors = null;

      switch (format) {
      case ic.formats[0]:
        ic.options.docData = d3CsvParse(ic.options.fileData,checkTypes);
      break;

      case ic.formats[1]:
        ic.options.docData = d3TsvParse(ic.options.fileData,checkTypes);
        break;

      case ic.formats[2]: // JSON List
        try {
          ic.options.docData = JSON.parse(ic.options.fileData.replace('/\\/g','\\\\'));
        } catch (e) {
          qwDialogService.showErrorDialog("JSON Parse Errors", 'Errors parsing JSON list: ' + JSON.stringify(e), null, true);
        }
        break;

      case ic.formats[3]: // JSON Lines - parse each line as separate doc
        ic.options.docData = [];
        var parseErrors = "";
        ic.options.fileData.split('\n').forEach(function (line) {
          try {if (line && line.length >=2) ic.options.docData.push(JSON.parse(line.replace('/\\/g','\\\\')));}
          catch (e) {parseErrors += JSON.stringify(e);}
        });
        if (parseErrors.length > 0)
          qwDialogService.showErrorDialog("JSON Parse Errors", 'Errors parsing JSON: ' + JSON.stringify(parseErrors).slice(0,255), null, true);
        break;

      }

      // now get the list of fields common to all documents, as possible doc IDs
      if (ic.options.docData.length) {
        ic.options.status = ic.options.fileName + " (" + ic.options.fileSize + " MiB)";
        if (!ic.options.showTable)
          ic.options.docJson = JSON.stringify(ic.options.docData,null,2);

        var fields = getDocFields(ic.options.docData[0]);
        if (fields.some(name => !name)) {
          ic.importErrors = "Empty field name.";
          qwDialogService.showErrorDialog("Parse Errors", "One or more field names are empty.", null,true);
        }
        ic.options.docData.forEach(function (doc) {
          fields = _.intersection(getDocFields(doc),fields);
        });

        ic.options.fields = fields;
        ic.options.selectedDocIDField = fields[0];
      }
      // no records seen?
      else {
        qwDialogService.showErrorDialog("Import Warning","No records found in data file, is it a valid format? (CSV, TSV, JSON List/Lines)", null, true);
        ic.selectTab(1);
        ic.options.status = ic.options.fileName + " (" + ic.options.fileSize + " MiB)";
      }

      // For some reason the data table is not updating except when the tab changes, so force a change, then back
      // if that is the currently selected tab
      if (ic.isSelected(2)) {
        ic.selectTab(1);
        setTimeout(function() {ic.selectTab(2);},100);
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
        if (!_.isArray(val) && !_.isObject(val) && !_.isUndefined(val))
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
    }

    //
    // get the text of the equivalent cbimport command
    //

    function getCbimport() {
      var command = 'cbimport ';

      // file format
      switch (ic.options.selectedFormat) {
      case ic.formats[0]: command += 'csv --infer-types '; break;
      case ic.formats[1]: command += "csv --field-separator '\\t' --infer-types "; break;
      case ic.formats[2]: command += 'json --format list '; break;  // JSON List
      case ic.formats[3]: command += 'json --format lines '; break; // JSON Lines
      }

      // cluster
      var fullURL = document.URL;
      command += '-c ' + fullURL.substring(0,fullURL.indexOf('/ui')) + ' ';

      // credentials, which we can't fill in
      command += '-u <login> -p <password> ';

      // file name
      if (ic.options.fileName && ic.options.fileName.length)
        command += "-d 'file://" + ic.options.fileName + "' ";

      // bucket name
      if (ic.options.selected_bucket && ic.options.selected_bucket.length)
        command += "-b '" + ic.options.selected_bucket + "' ";

      // scope and collection?
      if (ic.options.selected_scope && ic.options.selected_collection)
        command += '--scope-collection-exp "' + ic.options.selected_scope +
          '.' + ic.options.selected_collection + '" ';

      // key
      if (!ic.options.useKey)
        command += '-g "#UUID#" ';
      else
        command += '-g %' + ic.options.selectedDocIDField + '% ';
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
      qwMetadataService.metaReady.then(() => {
        if (!qwMetadataService.valid())
          qwDialogService.showErrorDialog("Import Error","Unable to contact query service, which is required to use Import UI. Ensure that a query service is running.", null, true);
        });
    }

    //
    // call the activate method for initialization
    //

    activate();
  }
}
