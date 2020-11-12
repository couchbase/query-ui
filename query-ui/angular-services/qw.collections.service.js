import {$http} from '/_p/ui/query/angular-services/qw.http.js';
import _ from '/ui/web_modules/lodash.js';
import {MnPermissions} from '/ui/app/ajs.upgraded.providers.js';

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
  qcs.collections = {};
  qcs.scopes = {}; // indexed by bucket name
  qcs.rbac = mnPermissions.export;

  qcs.getBuckets = getBuckets;
  qcs.refreshBuckets = refreshBuckets;
  qcs.getScopesForBucket = getScopesForBucket;
  qcs.getCollectionsForBucketScope = getCollectionsForBucketScope;

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
        for (var i = 0; i < resp.data.length; i++) if (resp.data[i]) {
          if (qcs.rbac.cluster.bucket[resp.data[i].name].data.docs.read) // only include buckets we have access to
            qcs.buckets.push(resp.data[i].name);
        }
      }
    }, function error(resp) {
      var data = resp.data, status = resp.status;
      qcs.buckets.length = 0;
      console.log("Error getting buckets: " + JSON.stringify(resp));
    });

    return (promise);
  }


  //
  // for any bucket we need to get the scopes and collections
  //

  function refreshScopesAndCollectionsForBucket(bucket) {
    // get the buckets from the REST API
    var promise = $http.do({
      url: "../pools/default/buckets/" + encodeURI(bucket) + "/collections",
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

    }, function error(resp) {
      qcs.scopes[bucket] = [];
      console.log("Error getting collections for " + bucket + ": " + JSON.stringify(resp));
    });

    return (promise);
  }

  function getBuckets(bucketsChangeCallback) {
    if (qcs.buckets.length == 0)
      refreshBuckets().then(function() {if (bucketsChangeCallback) bucketsChangeCallback();});

    return (qcs.buckets);
  }

  function getScopesForBucket(bucket, scopesChangedCallback) {
    // if we don't have any scopes, check
    if (!qcs.scopes[bucket] || !qcs.scopes[bucket].length) {
      qcs.scopes[bucket] = [];
      refreshScopesAndCollectionsForBucket(bucket).then(() => {if (scopesChangedCallback) scopesChangedCallback(bucket)});
    }

    return (qcs.scopes[bucket]);
  };

  function getCollectionsForBucketScope(bucket, scope, collectionsChangedCallback) {
    if (!bucket || !scope)
      return [];

    // if we don't have any collections yet, retrieve them
    if (!qcs.collections[bucket] || !qcs.collections[bucket][scope]) {
      if (!qcs.collections[bucket])
        qcs.collections[bucket] = {};

      refreshScopesAndCollectionsForBucket(bucket).then(() => {if (collectionsChangedCallback) collectionsChangedCallback(bucket,scope)});
    }

    return qcs.collections[bucket][scope];
  };

  //
  // all done, return the service
  //

  return qcs;
}