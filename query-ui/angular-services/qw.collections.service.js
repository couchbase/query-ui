import {$http}         from '/_p/ui/query/angular-services/qw.http.js';
import {MnPermissions} from '/ui/app/ajs.upgraded.providers.js';
import pubsub          from '/ui/web_modules/rxjs-pubsub.js';
import _               from '/ui/web_modules/lodash.js';

export {QwCollectionsService};

class QwCollectionsService {
  static get annotations() {
    return [
      new Injectable()
    ]
  }

  static get parameters() {
    return [
      MnPermissions,
      $http,
    ]
  }

  constructor(
    mnPermissions,
    $http) {
    Object.assign(this, getQwCollectionsService(
      mnPermissions,
      $http));
  }
}

// this service uses the ns_server REST API to retrieve and cache the buckets, scopes, and collections
// to reduce overhead, it retrieves scopes and collections in a lazy fashion.

function getQwCollectionsService(
  mnPermissions,
  $http) {

  var qcs = {};
  qcs.buckets = [];
  qcs.buckets_ephemeral = {};
  qcs.scopes = {}; // indexed by bucket name
  qcs.collections = {};
  qcs.rbac = mnPermissions.export;

  qcs.metadata = {
    buckets: qcs.buckets,
    buckets_ephemeral: qcs.buckets_ephemeral,
    scopes: qcs.scopes,
    collections: qcs.collections
  };

  qcs.getBuckets = getBuckets;
  qcs.refreshBuckets = refreshBuckets;
  qcs.getScopesForBucket = getScopesForBucket;

  qcs.bucket_bus = pubsub.create();

  function publishBucketState() {
    qcs.bucket_bus.publish('bucket_metadata', qcs.metadata);
  }

  function publishScopeCollState() {
    qcs.bucket_bus.publish('scopes_coll_metadata', qcs.metadata);
  }

  //
  // get a list of buckets from the server via the REST API
  //

  function refreshBuckets() {
    var promise = $http.do({
      url: "../pools/default/buckets/",
      method: "GET"
    }).then(function success(resp) {
      if (resp && resp.status == 200 && resp.data) {
        // get the bucket names
        qcs.buckets.length = 0;
        qcs.buckets_ephemeral = {};
        for (var i = 0; i < resp.data.length; i++) if (resp.data[i]) {
          //if (qcs.rbac.cluster.bucket[resp.data[i].name].data.docs.read) // only include buckets we have access to
          qcs.buckets.push(resp.data[i].name);

          if (resp.data[i].bucketType == "ephemeral") // must handle ephemeral buckets differently
            qcs.buckets_ephemeral[resp.data[i].name] = true;
        }
      }
      publishBucketState();
      return(qcs.metadata);
    }, function error(resp) {
      var data = resp.data, status = resp.status;
      qcs.buckets.length = 0;
      console.log("Error getting buckets: " + JSON.stringify(resp));
      publishBucketState();
      return(qcs.metadata);
    });

    return (promise);
  }


  //
  // for any bucket we need to get the scopes and collections
  //

  function refreshScopesAndCollectionsForBucket(bucket) {
    //console.log("Refreshing for bucket: " + bucket);
    // get the buckets from the REST API
    var promise = $http.do({
      url: "../pools/default/buckets/" + encodeURI(bucket) + "/scopes",
      method: "GET"
    }).then(function success(resp) {
      if (resp && resp.status == 200 && resp.data && _.isArray(resp.data.scopes)) {
        // get the scopes, and for each the collection names
        if (!qcs.scopes[bucket])
          qcs.scopes[bucket] = [];
        if (!qcs.collections[bucket])
          qcs.collections[bucket] = {}; // map indexed on scope name

        qcs.scopes[bucket].length = 0; // make sure any old scopes are removed

        resp.data.scopes.forEach(function (scope) {
          qcs.scopes[bucket].push(scope.name);
          qcs.collections[bucket][scope.name] = scope.collections.map(collection => collection.name).sort();
        });

      }

      qcs.scopes[bucket] = qcs.scopes[bucket].sort();
      publishScopeCollState();
      return(qcs.metadata);
    }, function error(resp) {
      qcs.scopes[bucket] = [];
      console.log("Error getting collections for " + bucket + ": " + JSON.stringify(resp));
      publishScopeCollState();
      return(qcs.metadata);
    });

    return (promise);
  }

  function getBuckets() {
    if (qcs.buckets.length == 0)
      return(refreshBuckets());

    return (Promise.resolve(qcs.metadata));
  }

  function getScopesForBucket(bucket) {
    // if we don't have any scopes, check and callback
    if (!qcs.scopes[bucket] || !qcs.scopes[bucket].length) {
      qcs.scopes[bucket] = [];
      return(refreshScopesAndCollectionsForBucket(bucket));
    }

    return (Promise.resolve(qcs.metadata));
  };

  //
  // all done, return the service
  //

  return qcs;
}