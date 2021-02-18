import {QwDialogService} from '/_p/ui/query/angular-directives/qw.dialog.service.js';
import {QwQueryService} from '/_p/ui/query/angular-services/qw.query.service.js';
import {$http} from '/_p/ui/query/angular-services/qw.http.js';
import _ from '/ui/web_modules/lodash.js';
import {MnPermissions, MnAlertsService} from '/ui/app/ajs.upgraded.providers.js';

export {QwImportService};

class QwImportService {
  static get annotations() {
    return [
      new Injectable()
    ]
  }

  static get parameters() {
    return [
      MnAlertsService,
      MnPermissions,
      QwDialogService,
      QwQueryService,
      $http,
    ]
  }

  constructor(
    mnAlertsService,
    mnPermissions,
    qwDialogService,
    qwQueryService,
    $http) {
    Object.assign(this, getQwImportService(
      mnAlertsService,
      mnPermissions,
      qwDialogService,
      qwQueryService,
      $http));
  }
}

// this service holds the state for the qwImportController, and keeps track of any ongoing imports
// so that they can continue to run even if the user navigates away to a different part of the UI

function getQwImportService(
  mnAlertsService,
  mnPermissions,
  qwDialogService,
  qwQueryService,
  $http) {

  var qis = {};

  qis.rbac = mnPermissions.export;

  qis.options = {
    selected_bucket: "",
    selected_scope: "",
    selected_collection: "",
    fields: [],
    selectedDocIDField: "",
    useKey: false,
    showTable: true,
    importing: false,
    selectedFormat: "",
    fileData: "",
    docData: "",
    docJson: "",
    fileName: "",
    fileSize: 0,
    last_import_status: ""
  };

  qis.doImport = doImport;

  //
  // Import the current data set to the selected bucket
  //

  function doImport() {
    // if we are already importing, cancel the import
    if (qis.options.importing) {
      qis.options.cancel_import = true;
      qis.options.last_import_status = "Canceling import...";
      return;
    }

    qis.options.last_import_status = "";
    qis.options.importing = true;
    qis.options.cancel_import = false;

    // must have selected bucket and at least one document to import
    if (!qis.options.selected_bucket || qis.options.selected_bucket.length == 0) {
      qwDialogService.showErrorDialog("Import Error", 'No keyspace selected.', null, true);
      qis.options.importing = false;
      return;
    }

    if (!qis.options.docData || qis.options.docData.length == 0) {
      qwDialogService.showErrorDialog("Import Error", 'No documents to import.', null, true);
      qis.options.importing = false;
      return;
    }

    if (qis.options.useKey && !qis.options.selectedDocIDField) {
      qwDialogService.showErrorDialog("Import Error", 'No field specified for document IDs.', null, true);
      qis.options.importing = false;
      return;
    }

    qis.options.last_import_status = "Starting import...";
    saveDocsViaN1QL(0);
  }

  //
  // use N1QL to create a query to insert a set of documents
  //

  var maxQuerySize = 4 * 1024 * 1024; // make sure maxQuerySize is at least maxDocSize plus the size of "INSERT INTO..."
  var maxDocSizeMB = 1;
  var maxDocSize = maxDocSizeMB * 1024 * 1024;

  function saveDocsViaN1QL(docNum) {
    var firstDoc = docNum;
    var base_query = "UPSERT INTO `" + qis.options.selected_bucket;
    if (qis.options.selected_scope) // for mixed clusters there may not be a scope/collection
      base_query += '`.`' + qis.options.selected_scope + '`.`' + qis.options.selected_collection
    base_query += '` (KEY, VALUE) VALUES ';
    var query = base_query;

    while (docNum < qis.options.docData.length) {
      // have we been cancelled?
      if (qis.options.cancel_import) {
        qis.options.last_import_status = "Import canceled";
        qis.options.importing = false;
        qis.options.cancel_import = false;
        return;
      }

      var doc = qis.options.docData[docNum];
      var docId = "";
      if (!qis.options.useKey)
        docId = UUID.generate();
      else {
        docId = doc[qis.options.selectedDocIDField];
        if (!_.isString(docId)) // Doc ID must be a string
          docId = JSON.stringify(docId);
      }
      var docText = JSON.stringify(doc);

      // can't import very big documents
      if (docText.length > maxDocSize) {
        qis.options.last_import_status = "Import Error at Document " + docNum + ", GUI can't import documents " +
          maxDocSizeMB + "MiB or larger, use cbimport.";
        mnAlertsService.formatAndSetAlerts("Import Failed: " + qis.options.last_import_status,'error');
        qis.options.importing = false;
        return;
      }

      // add the current doc to the INSERT query
      if (query.length > base_query.length) {
        query += ',';
      }

      query += '(' + JSON.stringify(docId) + ', ' + docText + ')';
      // if adding the current doc to the query will make the query too large, submit it and start again with the current doc
      if (query.length > maxQuerySize || docNum >= (qis.options.docData.length - 1)) {
        qwQueryService.executeQueryUtil(query, true).then(
          function success(resp) {
            // some errors return normal status, but errors in response
            if (resp && resp.data && resp.data.errors) {
              if (resp.data.errors.length > 5) // avoid super long error messages
                resp.data.errors.length = 5;
              qis.options.last_import_status = "Error importing documents: " + JSON.stringify(resp.data.errors);
              mnAlertsService.formatAndSetAlerts("Import Failed: " + qis.options.last_import_status,'error');
              //console.log(query.substr(0,250));
              qis.options.importing = false;
            } else {
              qis.options.last_import_status = "Imported " + (docNum + 1) + " of " + qis.options.docData.length + " docs " + " from: " + qis.options.fileName;
              // more data to import?
              if (docNum < qis.options.docData.length - 1) {
                setTimeout(getNextSaveN1QL(docNum + 1), 1);
              }
              // otherwise done with import
              else {
                qis.options.importing = false;
                mnAlertsService.formatAndSetAlerts(qis.options.last_import_status,'success');
                resetOptions();
              }
            }
          },
          function error(result) {
            qis.options.importing = false;

            if (result && result.data) {
              //console.log("N1QL Error!" + JSON.stringify(result.data.errors));
              console.log("Error with query: " + query);
              if (result.data.errors && result.data.errors.length == 1)
                qis.options.last_import_status = "Error importing docs in range: " + firstDoc + "-" + docNum + ": " + JSON.stringify(result.data.errors[0].msg);
              else
                qis.options.last_import_status = "Error importing docs in range: " + firstDoc + "-" + docNum + ": " + JSON.stringify(result.data.errors);
            } else if (result && result.message)
              qis.options.last_import_status = "status: " + result.status + ", " + result.message;
            else
              qis.options.last_import_status = "unknown status from server.";

            mnAlertsService.formatAndSetAlerts("Import Failed: " + qis.options.last_import_status,'error');
          });
        return;
      }

      docNum++;
    }
  }

  //
  function getNextSaveN1QL(startingDocNum) {
    return function () {
      saveDocsViaN1QL(startingDocNum);
    };
  }

  //
  // reset options when done
  //

  function resetOptions() {
    qis.options.fields = [];
    qis.options.selectedDocIDField = "";
    qis.options.useKey = false;
    qis.options.fileData = "";
    qis.options.docData = "";
    qis.options.docJson = "";
    qis.options.fileName = "";
    qis.options.fileSize = 0;
    qis.options.status = "";
  }

  /**
   * Fast UUID generator, RFC4122 version 4 compliant.
   * @author Jeff Ward (jcward.com).
   * @license MIT license
   * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
   **/
  var UUID = (function () {
    var self = {};
    var lut = [];
    for (var i = 0; i < 256; i++) {
      lut[i] = (i < 16 ? '0' : '') + (i).toString(16);
    }
    self.generate = function () {
      var d0 = Math.random() * 0xffffffff | 0;
      var d1 = Math.random() * 0xffffffff | 0;
      var d2 = Math.random() * 0xffffffff | 0;
      var d3 = Math.random() * 0xffffffff | 0;
      return lut[d0 & 0xff] + lut[d0 >> 8 & 0xff] + lut[d0 >> 16 & 0xff] + lut[d0 >> 24 & 0xff] + '-' +
        lut[d1 & 0xff] + lut[d1 >> 8 & 0xff] + '-' + lut[d1 >> 16 & 0x0f | 0x40] + lut[d1 >> 24 & 0xff] + '-' +
        lut[d2 & 0x3f | 0x80] + lut[d2 >> 8 & 0xff] + '-' + lut[d2 >> 16 & 0xff] + lut[d2 >> 24 & 0xff] +
        lut[d3 & 0xff] + lut[d3 >> 8 & 0xff] + lut[d3 >> 16 & 0xff] + lut[d3 >> 24 & 0xff];
    }
    return self;
  })();

  //
  // all done, return the service we created
  //

  return qis;
}
