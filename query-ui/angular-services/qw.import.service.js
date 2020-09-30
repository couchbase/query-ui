import { QwDialogService }   from '/_p/ui/query/angular-directives/qw.dialog.service.js';
import { QwQueryService }    from '/_p/ui/query/angular-services/qw.query.service.js';
import { $http }             from '/_p/ui/query/angular-services/qw.http.js';
import _                     from '/ui/web_modules/lodash.js';
import { MnPermissions }     from '/ui/app/ajs.upgraded.providers.js';

export { QwImportService };

class QwImportService {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    MnPermissions,
    QwDialogService,
    QwQueryService,
    $http,
  ]}

  constructor(
      mnPermissions,
      qwDialogService,
      qwQueryService,
      $http) {
    Object.assign(this, getQwImportService(
        mnPermissions,
        qwDialogService,
        qwQueryService,
        $http));
  }
}

 // this service holds the state for the qwImportController, and keeps track of any ongoing imports
 // so that they can continue to run even if the user navigates away to a different part of the UI

  function getQwImportService(
        mnPermissions,
        qwDialogService,
        qwQueryService,
        $http) {

    var qis = {};

    qis.rbac = mnPermissions.export;
    qis.buckets = [];
    qis.collections = {};
    qis.scopes = {}; // indexed by bucket name

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

    qis.getBuckets = getBuckets;
    qis.getScopes = getScopes;
    qis.getCollections = getCollections;

    qis.bucketChanged = bucketChanged;
    qis.scopeChanged = scopeChanged;

    qis.closeAllDialogs = function () {console.log("Close all dialogs.");};
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
      if (!qis.options.selected_bucket || qis.options.selected_bucket.length == 0) {
        qwDialogService.showErrorDialog("Import Error", 'No bucket selected to import into.',null,true);
        qis.options.importing = false;
        return;
      }

      if (!qis.options.docData || qis.options.docData.length == 0) {
        qwDialogService.showErrorDialog("Import Error", 'No documents to import.',null,true);
        qis.options.importing = false;
        return;
      }

      if (qis.options.useKey && !qis.options.selectedDocIDField) {
        qwDialogService.showErrorDialog("Import Error", 'No field specified for document IDs.',null,true);
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
      var base_query = "UPSERT INTO `" + qis.options.selected_bucket + '`.`' +
        qis.options.selected_scope + '`.`' + qis.options.selected_collection + "` (KEY, VALUE) VALUES ";
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
          qwDialogService.showErrorDialog("Import Error at Document " + docNum,"GUI can't import documents " + maxDocSizeMB + "MB or larger, use cbimport.",null,true);
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
                  qwDialogService.showErrorDialog("Import Error",null,resp.data.errors,true);
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
                    qwDialogService.showErrorDialog("Import Complete", qis.options.last_import_status, null, true);
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
                  qwDialogService.showErrorDialog("Import Failed", qis.options.last_import_status, null, true);
                }
                else if (result && result.message)
                  qwDialogService.showErrorDialog("Import Failed, status: " + result.status, result.message, null, true);
                else
                  qwDialogService.showErrorDialog("Import Failed", "Import failed with unknown status from server.", null, true);
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
      var promise = $http.do({
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
          if (qis.buckets.length > 0 && !qis.options.selected_bucket)
            qis.options.selected_bucket = qis.buckets[0];

          if (qis.options.selected_bucket)
            getScopesAndCollectionsForBucket(qis.options.selected_bucket);
       }
      },function error(resp) {
        var data = resp.data, status = resp.status;

        console.log("Error getting buckets: " + JSON.stringify(resp));

        if (data && data.errors) {
          qwDialogService.showErrorDialog("Error getting list of buckets.", JSON.stringify(data.errors),null,true);
        }
      });

      return(promise);
    }

    //
    // for any bucket we need to get the scopes and collections
    //

    function getScopesAndCollectionsForBucket(bucket) {
      // get the buckets from the REST API
      var promise = $http.do({
        url: "../pools/default/buckets/" + encodeURI(bucket) + "/collections",
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data && _.isArray(resp.data.scopes)) {
          // get the scopes, and for each the collection names
          qis.scopes[bucket] = [];
          qis.collections[bucket] = {}; // map indexed on scope name

          resp.data.scopes.forEach(function(scope) {
            qis.scopes[bucket].push(scope.name);
            qis.collections[bucket][scope.name] = scope.collections.map(collection => collection.name).sort();
          });
        }

        qis.scopes[bucket] = qis.scopes[bucket].sort();

        // if we don't have a scope, or didn't see it in the list, use the first one from the list
        if (qis.scopes[bucket][0] &&
          (!qis.options.selected_scope || qis.scopes[bucket].indexOf(qis.options.selected_scope) < 0))
          qis.options.selected_scope = qis.scopes[bucket][0];

        // same for collections, if we don't have one or it's not in the list, use the first from the list
        if (qis.options.selected_scope && // we have a scope
          qis.collections[bucket][qis.options.selected_scope][0] && // we have at least 1 collection in the list
          (!qis.options.selected_collection || // no current collection, or collection not in list
            qis.collections[bucket][qis.options.selected_scope].indexOf(qis.options.selected_collection) < 0))
          qis.options.selected_collection = qis.collections[bucket][qis.options.selected_scope][0];

      },function error(resp) {
        if (resp && resp.data && resp.data.errors) {
          qis.options.current_result = JSON.stringify(resp.data.errors);
          showErrorDialog("Error getting list of collections.", qis.options.current_result,true);
        }
      });

      return(promise);

    }

    function getScopes() {
      if (qis.scopes && qis.options.selected_bucket)
        return (qis.scopes[qis.options.selected_bucket]);
      else
        return [];
    };

    function getCollections() {
      if (qis.scopes && qis.options.selected_bucket && qis.options.selected_scope && qis.collections[qis.options.selected_bucket])
        return qis.collections[qis.options.selected_bucket][qis.options.selected_scope];
      else
        return [];
    };

    //
    // when the bucket changes, refresh the scopes and collections for that bucket
    // (unless there is no specified bucket, and reset everything
    //

    function bucketChanged(event) {
      qis.options.selected_bucket = event.target.value;
      if (!event.target.value) {
        qis.options.selected_scope = null;
        qis.options.selected_collection = null;
        qis.collections = {};
        qis.scopes = {};
      }
      else
        getScopesAndCollectionsForBucket(qis.options.selected_bucket);
    }

    // when the scope changes, the model for the collections menu can change without
    // triggering a change in the underlying collection value. Make sure the value of
    // the selected_collection is on the list of current collections, otherwise set
    // the selected_collection to the first on the list
    function scopeChanged(event) {
      var collections = getCollections();
      if (collections.length > 0 && collections.indexOf(qis.options.selected_collection) < 0)
        qis.options.selected_collection = collections[0];
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
    // all done, return the service we created
    //

    return qis;
  }
