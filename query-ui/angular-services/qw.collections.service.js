/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

//
// qw.collections.service - this service provides easy access to the lists of buckets, scopes, and collections.
//
// For efficiency sake, it retrieves in a lazy fashion, only getting the scopes and collections for a bucket
// when asked, then caching the values until asked to refresh.
//
// To support querying the metadat for remote clusters in analytics, the service can optionally accept a proxy
// that provides REST API access to another couchbase cluster.

import {QwHttp}            from './qw.http.js';
import {QwMetadataService} from "./qw.metadata.service.js";
import _                   from 'lodash';
import { QwQueryService}     from "./qw.query.service.js";

export {QwCollectionsService};

class QwCollectionsService {
  static get annotations() {
    return [
      new Injectable()
    ]
  }

  static get parameters() {
    return [
      QwHttp,
      QwMetadataService,
      QwQueryService
    ]
  }

  constructor(
    qwHttp,
    qwMetadataService,
    qwQueryService
  ) {
    Object.assign(this, getQwCollectionsService(
        qwHttp,
        qwMetadataService,
        qwQueryService
    ));
  }
}

// this service uses the ns_server REST API to retrieve and cache the buckets, scopes, and collections
// to reduce overhead, it retrieves scopes and collections in a lazy fashion.

function getQwCollectionsService(
  qwHttp,
  qms,
  qwQueryService) {

  var qcs = {};

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
  // For local buckets we will use the list from qw.metadata.service.
  // For remote buckets, use the proxy to get a list of buckets from the server via the REST API
  //

  function refreshBuckets(proxy) {
    let meta = getMeta(proxy);
    let promises = [];
    meta.errors.length = 0;

    if (!proxy) { // local
      promises.push(qms.updateBuckets()
          .then(success => {
            meta.buckets.length = 0;
            meta.buckets.push(...qms.permittedBucketList);
          }, error => {
            meta.buckets.length = 0;
          })
      );
    }

    // need to use pools/default/buckets to find out which buckets are ephemeral (for doc editor)
    var api = "/pools/default/buckets/";
    var url = getApiUrl(api, proxy);
    var promise = qwHttp.do({
      url: url,
      method: "GET"
    }).then(function success(resp) {
      if (resp && resp.status == 200 && resp.data) {
        // empty out any prior bucket info
        if (proxy)
          meta.buckets.length = 0;
        meta.errors.length = 0;
        Object.keys(meta.buckets_ephemeral).forEach(function(key) { delete meta.buckets_ephemeral[key]; });
        // get the bucket names
        for (var i = 0; i < resp.data.length; i++) if (resp.data[i]) {
          if (proxy)
            meta.buckets.push(resp.data[i].name);

          if (resp.data[i].bucketType == "ephemeral") // must handle ephemeral buckets differently
            meta.buckets_ephemeral[resp.data[i].name] = true;

          // if we are proxied to a remote cluster (to select remote data for analytics), we need to check
          // for the "collections" capability. Otherwise, we rely on poolsDefault.export.compat
          if (proxy && !resp.data[i].bucketCapabilities.includes("collections")) {
            meta.pre70 = true;
          }
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

    promises.push(promise);

    return Promise.all(promises).then(() => meta, () => meta);
  }


  function refreshScopesAndCollectionsForBucket(bucket, proxy) {
    const canUseEndpoints = qms.rbac && qms.rbac.cluster.collection['.:.:.'].collections.read;
    return canUseEndpoints ?
      refreshScopesAndCollectionsForBucketUsingApi(bucket, proxy) :
      refreshScopesAndCollectionsForBucketUsingQuery(bucket, proxy);
  }

  function refreshScopesAndCollectionsForBucketUsingQuery(bucket, proxy) {
    var meta = getMeta(proxy);
    meta.errors.length = 0;
    // system:keyspaces doesn't return scopes with no collections, so get those from system:scopes
    const query = `select keyspaces.*, "keyspace" as \`type\` ` +
        `from system:keyspaces where \`bucket\` = "${bucket}" or \`path\` = "default:${bucket}" union ` +
        `select scopes.*, \"scope\" as \`type\` from system:scopes where \`bucket\` = "${bucket}";`;

    return qwQueryService
      .executeQueryUtilNew(query)
      .toPromise()
      .then((resp) => {
        const body = JSON.parse(resp.body);
        // get the scopes, and for each the collection names

        meta.scopes[bucket] = [];

        meta.collections[bucket] = {}; // map indexed on scope name

        meta.scopes[bucket].length = 0; // make sure any old scopes are removed
        body.results.forEach(function (item) {
          // results from system:keyspaces
          if (item.type === "keyspace") {
            if (item.bucket ? (item.bucket !== bucket) : item.path !== "default:" + bucket) {
              return;
            }
            if (item.scope && item.bucket) {
              if (!meta.collections[item.bucket][item.scope]) {
                meta.collections[item.bucket][item.scope] = [];
                meta.scopes[item.bucket].push(item.scope);
              }
              meta.collections[item.bucket][item.scope].push(item.name);
            } else {
              if (!meta.collections[bucket]["_default"]) {
                meta.collections[bucket]["_default"] = ["_default"];
                meta.scopes[bucket].push("_default");
              }
            }
          }

          else if (item.type === "scope" && item.name && item.bucket && !meta.collections[item.bucket][item.name]) {
            meta.collections[item.bucket][item.name] = [];
            meta.scopes[item.bucket].push(item.name);
          }
        });

        meta.scopes[bucket] = meta.scopes[bucket].sort();
        return(meta);
      }, (resp) => handleScopesAndCollectionsForBucketError(resp, bucket, meta, "_p/query/query/service"));
  }
  //
  // for any bucket we need to get the scopes and collections
  //

  //TODO: most likely we don't need this function, but I don't want to remove it now
  //just in case.

  function refreshScopesAndCollectionsForBucketUsingApi(bucket, proxy) {
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
    }, (resp) => handleScopesAndCollectionsForBucketError(resp, bucket, meta, url));

    return (promise);
  }

  function handleScopesAndCollectionsForBucketError(resp, bucket, meta, url) {
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
