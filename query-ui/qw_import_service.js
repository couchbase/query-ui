(function() {

  // this service holds the state for the qwImportController, and keeps track of any ongoing imports
  // so that they can continue to run even if the user navigates away to a different part of the UI

  angular.module('qwQuery').factory('qwImportService', getQwImportService);

  getQwImportService.$inject = ['qwQueryService','mnPermissions', '$rootScope', '$uibModal', '$uibModalStack','$http'];

  function getQwImportService(qwQueryService,mnPermissions, $rootScope, $uibModal, $uibModalStack, $http) {

    var qis = {};

    qis.rbac = mnPermissions.export;
    qis.buckets = [];

    qis.options = {
        selectedBucket: "",
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

    qis.getBuckets = getBuckets;
    qis.showErrorDialog = showErrorDialog;
    qis.closeAllDialogs = closeAllDialogs;
    qis.doImport = doImport;

    //
    // Import the current data set to the selected bucket
    //

    function doImport() {
      // if we are already importing, cancel the import
      if (qis.options.importing) {
        qis.options.cancel_import = true;
        qis.options.last_import_status = "Cancelling import...";
        return;
      }

      qis.options.last_import_status = "";
      qis.options.importing = true;
      qis.options.cancel_import = false;

      // must have selected bucket and at least one document to import
      if (!qis.options.selectedBucket || qis.options.selectedBucket.length == 0) {
        showErrorDialog("Import Error", 'No bucket selected to import into.', true);
        qis.options.importing = false;
        return;
      }

      if (!qis.options.docData || qis.options.docData.length == 0) {
        showErrorDialog("Import Error", 'No documents to import.', true);
        qis.options.importing = false;
        return;
      }

      if (qis.options.useKey && !qis.options.selectedDocIDField) {
        showErrorDialog("Import Error", 'No field specified for document IDs.', true);
        qis.options.importing = false;
        return;
      }

      qis.options.last_import_status = "Starting import...";
      saveDocsViaN1QL(0);
    }

    //
    // use N1QL to create a query to insert a set of documents
    //

    var maxQuerySize = 4*1024*1024; // make sure maxQuerySize is at least maxDocSize plus the size of "INSERT INTO..."
    var maxDocSizeMB = 1;
    var maxDocSize = maxDocSizeMB * 1024*1024;

    function saveDocsViaN1QL(docNum) {
      var firstDoc = docNum;
      var base_query = "UPSERT INTO `" + qis.options.selectedBucket + "` (KEY, VALUE) VALUES ";
      var query = base_query;

      while (docNum < qis.options.docData.length) {
        // have we been cancelled?
        if (qis.options.cancel_import) {
          qis.options.last_import_status = "Import cancelled.";
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
          showErrorDialog("Import Error at Document " + docNum,"GUI can't import documents " + maxDocSizeMB + "MB or larger, use cbimport.");
          qis.options.importing = false;
          return;
        }

        // add the current doc to the INSERT query
        if (query.length > base_query.length) {
          query += ',';
        }

        query += '(' + JSON.stringify(docId) + ', ' + docText + ')';
        // if adding the current doc to the query will make the query too large, submit it and start again with the current doc
        if (query.length > maxQuerySize || docNum >= (qis.options.docData.length-1)) {
          qwQueryService.executeQueryUtil(query,true).then(
              function success(resp) {
                // some errors return normal status, but errors in response
                if (resp && resp.data && resp.data.errors) {
                  if (resp.data.errors.length > 5) // avoid super long error messages
                    resp.data.errors.length = 5;
                  showErrorDialog("Import Error",resp.data.errors,true);
                  qis.options.last_import_status = "Error importing documents.";
                  //console.log(query.substr(0,250));
                  qis.options.importing = false;
                }
                else {
                  qis.options.last_import_status = "From: " + qis.options.fileName + " imported " + (docNum+1) + " of " + qis.options.docData.length + " docs.";
                  // more data to import?
                  if (docNum < qis.options.docData.length - 1) {
                    setTimeout(getNextSaveN1QL(docNum+1),1);
                  }
                  // otherwise done with import
                  else {
                    qis.options.importing = false;
                    showErrorDialog("Import Complete", qis.options.last_import_status, true, true);
                    resetOptions();
                  }
                }
              },
              function error(result) {
                if (result && result.data) {
                  //console.log("N1QL Error!" + JSON.stringify(result.data.errors));
                  console.log("Error with query: " + query);
                  if (result.data.errors && result.data.errors.length == 1)
                    qis.options.last_import_status = "Error importing docs in range: " + firstDoc + "-" + docNum + ": " + JSON.stringify(result.data.errors[0].msg);
                  else
                    qis.options.last_import_status = "Error importing docs in range: " + firstDoc + "-" + docNum + ": " + JSON.stringify(result.data.errors);
                  showErrorDialog("Import Failed", qis.options.last_import_status, true);
                  qis.options.importing = false;
                }
                else
                  showErrorDialog("Import Failed", "Import failed with unknown status from server.", true);
              });
          return;
        }

        docNum++;
      }
    }

    //
    function getNextSaveN1QL(startingDocNum) {
      return function() {saveDocsViaN1QL(startingDocNum);};
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

    //
    // get a list of buckets from the server via the REST API
    //

    function getBuckets() {
      var promise = $http({
        url: "../pools/default/buckets/",
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data) {
          // get the bucket names
          qis.buckets.length = 0;
          var default_seen = false;
          for (var i=0; i < resp.data.length; i++) if (resp.data[i]) {
            if (qis.rbac.cluster.bucket[resp.data[i].name].data.docs.read) // only include buckets we have access to
              qis.buckets.push(resp.data[i].name);
          }
       }
      },function error(resp) {
        var data = resp.data, status = resp.status;

        if (data && data.errors) {
          showErrorDialog("Error getting list of buckets.", JSON.stringify(data.errors),true);
        }
      });

      return(promise);
    }

   /**
     * Fast UUID generator, RFC4122 version 4 compliant.
     * @author Jeff Ward (jcward.com).
     * @license MIT license
     * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
     **/
    var UUID = (function() {
      var self = {};
      var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
      self.generate = function() {
        var d0 = Math.random()*0xffffffff|0;
        var d1 = Math.random()*0xffffffff|0;
        var d2 = Math.random()*0xffffffff|0;
        var d3 = Math.random()*0xffffffff|0;
        return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
        lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
        lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
        lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
      }
      return self;
    })();


    //
    // Show an error dialog
    //

    function showErrorDialog(title, detail, hide_cancel, is_info) {
      closeAllDialogs();

      var dialogScope = $rootScope.$new(true);
      dialogScope.error_title = title;
      dialogScope.show_info = is_info;
      if (!Array.isArray(detail))
        dialogScope.error_detail = detail;
      else
        dialogScope.error_detail_array = detail;
      dialogScope.hide_cancel = hide_cancel;
      return $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
        scope: dialogScope
      }).result;
     }

    function closeAllDialogs() {
      $uibModalStack.dismissAll();
    }

    //
    // all done, return the service we created
    //

    return qis;
  }

})();