/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

// we can only work if we have a query node. This service checks for
// a query node a reports back whether it is present.

import {Injectable} from "@angular/core";
import {MnPermissions, MnPools, MnPoolDefault} from 'ajs.upgraded.providers';
import {QwHttp} from './qw.http.js';

export {QwValidateQueryService};


class QwValidateQueryService {
  static get annotations() {
    return [
      new Injectable()
    ]
  }

  static get parameters() {
    return [
      MnPools,
      MnPermissions,
      MnPoolDefault,
      QwHttp
    ]
  }

  constructor(mnPools, mnPermissions, mnPoolDefault, qwHttp) {
    Object.assign(this, getValidateQueryService(mnPools, mnPermissions, mnPoolDefault, qwHttp));
    this.getBucketsAndNodes(); // check for the query service right away
  }
}


function getValidateQueryService(mnPools, mnPermissions, mnPoolDefault, qwHttp) {
  mnPools.get().then(function () {
    _isEnterprise = mnPools.export.isEnterprise;
  });
  var _checked = false;              // have we checked validity yet?
  var _valid = false;                // do we have a valid query node?
  var _bucketsInProgress = false;    // are we retrieving the list of buckets?
  var _progressPromise = null;
  var _monitoringAllowed = false;
  var _clusterStatsAllowed = false;
  var _otherStatus;
  var _otherError;
  var _bucketList = [];
  var _bucketStatsList = [];
  var _validNodes = [];
  var _callbackList = [];
  var _isEnterprise = false;
  var service = {
    inProgress: function () {
      return !_checked || _bucketsInProgress;
    },
    isEnterprise: function () {
      return (_isEnterprise);
    },
    whenValid: function() {
      if (_bucketsInProgress)
        return(_progressPromise);
      else
        return(Promise.resolve(_valid));
    },
    valid: function () {
      return _valid;
    },
    validBuckets: function () {
      return _bucketList;
    },
    validNodes: function () {
      return _validNodes;
    },
    otherStatus: function () {
      return _otherStatus;
    },
    otherError: function () {
      return _otherError;
    },
    monitoringAllowed: function () {
      return _monitoringAllowed;
    },
    clusterStatsAllowed: function () {
      return _clusterStatsAllowed;
    },
    updateValidBuckets: getBuckets,
    updateNodes: getNodes,
    getNodes: getNodes,
    getBucketsAndNodes: getBuckets
  }

  //
  // we need at least one cluster node running n1ql
  //

  function getNodes() {
    var pool = mnPoolDefault.latestValue();
    if (pool.value && pool.value.nodes)
      _validNodes = mnPoolDefault.getUrlsRunningService(mnPoolDefault.latestValue().value.nodes, "n1ql", null);
    else
      _validNodes = [];
    return(_validNodes);
  }

  //
  // with RBAC the only safe way to get the list of buckets is through a query
  // of system:buckets, which should return only accessible buckets for the user.
  // we accept a callback function that will be called once the list of buckets is updated.
  //

  function getBuckets(callback) {
    //console.trace();
    //console.log("Getting nodes and buckets, progress: " + _bucketsInProgress);

    // even if we're busy, accept new callbacks
    if (callback)
      _callbackList.push(callback);

    // make sure we only do this once at a time
    if (_bucketsInProgress)
      return;

    //_valid = false;
    _checked = true;
    _otherStatus = null;
    _otherError = null;
    _bucketsInProgress = true;

    // can't do anything if no nodes running query service
    if (!getNodes().length) {
      _valid = false;
      _bucketsInProgress = false;
      while (_callbackList.length) // call each callback to let them know we're done
        _callbackList.pop()();
      return;
    }

    // meanwhile issue a query to the local node get the list of buckets
    var queryData;
    if (mnPoolDefault.export.compat.atLeast70)
      queryData = {statement: "select buckets.name from system:buckets;"};
    else
      queryData = {statement: "select keyspaces.name from system:keyspaces;"};

    _progressPromise = qwHttp.post("/_p/query/query/service", queryData)
      .then(function success(resp) {
          //var data = resp.data, status = resp.status;
          //console.log("Got bucket list data: " + JSON.stringify(resp).substring(0,10) + " with callbacks: " + _callbackList.length);
          //mnPermissions.check().then(function success() {

          updateValidBuckets(resp);
          while (_callbackList.length) // call each callback to let them know we're done
            _callbackList.pop()();
          //});
        },
        // Error from $http
        function error(resp) {
          var data = resp.data, status = resp.status;
          //console.log("Error getting buckets: " + JSON.stringify(resp));
          _valid = false;
          _bucketsInProgress = false;
          _otherStatus = status;
          _otherError = data;
          while (_callbackList.length) // call each callback to let them know we're done
            _callbackList.pop()();
        });
  }

  function updateValidBuckets(resp) {
    // see what buckets we have permission to access
    var perms = mnPermissions.export.cluster;
    //console.log("Got bucket permissions... " + JSON.stringify(perms,null,2));

    _bucketList = [];
    _bucketStatsList = [];

    // stats perms
    _clusterStatsAllowed = perms.collection['.:.:.'].stats.read;

    // metadata perms
    _monitoringAllowed = (perms && perms.n1ql && perms.n1ql.meta && perms.n1ql.meta.read);

    if (resp && resp.data && resp.data.results && resp.data.results.forEach)
      resp.data.results.forEach(function (bucket) {
        var bucket_perms = perms.collection[bucket.name + ':.:.'];
        // handle case where permissions is unknown - just include all buckets
        if (!bucket_perms) {
          _bucketList.push(bucket.name);
          _bucketStatsList.push(bucket.name);
        }
        // otherwise only include buckets that we're allow to query or see stats.
        else {
          //if (bucket_perms.n1ql && bucket_perms.n1ql.select && bucket_perms.n1ql.select.execute)
          _bucketList.push(bucket.name);

          if (bucket_perms.stats.read)
            _bucketStatsList.push(bucket.name);
        }
      });

    _bucketList.sort();
    _bucketStatsList.sort();

    // all done
    _valid = true;
    _bucketsInProgress = false;
  }


  // now return the service
  return service;
};
