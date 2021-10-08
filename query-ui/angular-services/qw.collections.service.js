//
// qw.collections.service - this service provides easy access to the lists of buckets, scopes, and collections.
//
// For efficiency sake, it retrieves in a lazy fashion, only getting the scopes and collections for a bucket
// when asked, then caching the values until asked to refresh.
//
// To support querying the metadat for remote clusters in analytics, the service can optionally accept a proxy
// that provides REST API access to another couchbase cluster.

import {QwHttp}         from './qw.http.js';
import {MnPermissions} from 'ajs.upgraded.providers';
import _               from 'lodash';

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
      QwHttp,
    ]
  }

  constructor(
    mnPermissions,
    qwHttp) {
    Object.assign(this, getQwCollectionsService(
      mnPermissions,
      qwHttp));
  }
}

// this service uses the ns_server REST API to retrieve and cache the buckets, scopes, and collections
// to reduce overhead, it retrieves scopes and collections in a lazy fashion.

function getQwCollectionsService(
  mnPermissions,
  qwHttp) {

  var qcs = {};
  qcs.rbac = mnPermissions.export;

  let local_metadata = {
    buckets: [],
    buckets_ephemeral: {},
    scopes: {},
    collections: {},
    errors: []
  };

  // map associating proxies with the metadata for that remote cluster
  let remote_metadata = {};

  qcs.getBuckets = getBuckets;
  qcs.refreshBuckets = refreshBuckets;
  qcs.getScopesForBucket = getScopesForBucket;
  qcs.refreshScopesAndCollectionsForBucket = refreshScopesAndCollectionsForBucket;

  //
  // the metadata we work with depends on whether we have a local cluster or a proxy to a remote cluster
  //

  function getMeta(proxy) {
    if (!proxy)
      return local_metadata;

    if (!remote_metadata[proxy])
      remote_metadata[proxy] = {
        buckets: [],
        buckets_ephemeral: {},
        scopes: {},
        collections: {},
        errors: []
      };

    return remote_metadata[proxy];
  }

  //
  // get a list of buckets from the server via the REST API
  //

  function refreshBuckets(proxy) {
    var meta = getMeta(proxy);
    meta.errors.length = 0;
    var api = "/pools/default/buckets/";
    var url = getApiUrl(api, proxy);
    var promise = qwHttp.do({
      url: url,
      method: "GET"
    }).then(function success(resp) {
      if (resp && resp.status == 200 && resp.data) {
        // empty out any prior bucket info
        meta.buckets.length = 0;
        Object.keys(meta.buckets_ephemeral).forEach(function(key) { delete meta.buckets_ephemeral[key]; });
        // get the bucket names
        for (var i = 0; i < resp.data.length; i++) if (resp.data[i]) {
          //if (qcs.rbac.cluster.bucket[resp.data[i].name].data.docs.read) // only include buckets we have access to
          meta.buckets.push(resp.data[i].name);

          if (resp.data[i].bucketType == "ephemeral") // must handle ephemeral buckets differently
            meta.buckets_ephemeral[resp.data[i].name] = true;

          // if we are proxied to a remote cluster (to select remote data for analytics), we need to check
          // if any of the nodes for the bucket have a pre-7.0 version, meaning no collections. Otherwise
          // we rely on poolsDefault.export.compat
          if (proxy && resp.data[i].nodes.some(element =>
            parseInt(element.version && element.version.split(".")[0]) < 7))
            meta.pre70 = true;
        }
      }
      return(meta);
    }, function error(resp) {
      var data = resp.data, status = resp.status;
      meta.buckets.length = 0;
      var error = {status: resp.status, url: url};
      if (resp.error)
        if (_.isString(resp.error))
          error.message = resp.error;
        else
          Object.assign(error,resp.error);
      meta.errors.length = 0;
      meta.errors.push(error);
      //console.log("Error getting buckets: " + JSON.stringify(resp));
      return(meta);
    });

    return (promise);
  }


  //
  // for any bucket we need to get the scopes and collections
  //

  function refreshScopesAndCollectionsForBucket(bucket, proxy) {
    var meta = getMeta(proxy);
    meta.errors.length = 0;
    var api = "/pools/default/buckets/" + encodeURI(bucket) + "/scopes";
    var url = getApiUrl(api, proxy);
    // get the scopes and collections for the bucket from the REST API
    var promise = qwHttp.do({
      url: url,
      method: "GET"
    }).then(function success(resp) {
      if (resp && resp.status == 200 && resp.data && _.isArray(resp.data.scopes)) {
        // get the scopes, and for each the collection names
        if (!meta.scopes[bucket])
          meta.scopes[bucket] = [];
        if (!meta.collections[bucket])
          meta.collections[bucket] = {}; // map indexed on scope name

        meta.scopes[bucket].length = 0; // make sure any old scopes are removed

        resp.data.scopes.forEach(function (scope) {
          meta.scopes[bucket].push(scope.name);
          meta.collections[bucket][scope.name] = scope.collections.map(collection => collection.name).sort();
        });

      }

      meta.scopes[bucket] = meta.scopes[bucket].sort();
      return(meta);
    }, function error(resp) {
      meta.scopes[bucket] = [];
      var error = {status: resp.status, url: url};
      if (resp.error)
        if (_.isString(resp.error))
          error.message = resp.error;
        else
          Object.assign(error,resp.error);
      meta.errors.length = 0;
      meta.errors.push(error);
      //console.log("Error getting collections for " + bucket + ": " + JSON.stringify(resp));
      return(meta);
    });

    return (promise);
  }

  function getBuckets(proxy) {
    var meta = getMeta(proxy);
    if (meta.buckets.length == 0)
      return(refreshBuckets(proxy));

    return (Promise.resolve(meta));
  }

  function getScopesForBucket(bucket, proxy) {
    var meta = getMeta(proxy);
    // if we don't have any scopes, check and callback
    if (!meta.scopes[bucket] || !meta.scopes[bucket].length) {
      meta.scopes[bucket] = [];
      return(refreshScopesAndCollectionsForBucket(bucket, proxy));
    }

    return (Promise.resolve(meta));
  };

  function getApiUrl(api, proxy) {
    if (proxy) {
      return proxy + api;
    } else {
      return ".." + api;
    }
  }
  //
  // all done, return the service
  //

  return qcs;
}
