(function () {
  "use strict";

  angular
    .module('qwQuery', ["ui.router", "mnPluggableUiRegistry", "mnJquery",
                      'qwJsonTree',
                      'qwJsonTable',
                      'qwExplainViz',
                      'qwLongPress',
                      'mnPendingQueryKeeper',
                      'mnServersService',
                      'mnPoolDefault',
                      'mnPermissions',
                      'ui.ace',
                      'ui.bootstrap'])
    .config(function($stateProvider, mnPluggableUiRegistryProvider) {
      $stateProvider
      .state('app.admin.query', {
        abstract: true,
        url: '/query',
        controller: 'qwQueryController',
        templateUrl: '../_p/ui/query/ui-classic/query_toplevel.html'
      })
      .state('app.admin.query.monitoring', {
        url: '/monitoring',
        controller: 'qwQueryController',
        templateUrl: '../_p/ui/query/ui-classic/query_monitoring.html'
      })
      .state('app.admin.query.workbench', {
        url: '/workbench',
        controller: 'qwQueryController',
        templateUrl: '../_p/ui/query/ui-classic/query.html'
      })
      ;
      mnPluggableUiRegistryProvider.registerConfig({
        name: 'Query',
        state: 'app.admin.query.workbench',
        plugIn: 'adminTab',
        after: 'buckets'//,
        //ngShow: canQuery("rbac.cluster.admin.internal.all"
      });
    })
    .run(function(jQuery, $timeout, $http) {
    })

    // we can only work if we have a query node. This service checks for
    // a query node a reports back whether it is present.

    .factory('validateQueryService', function($http,mnServersService,mnPermissions,mnPoolDefault) {
      var _valid = false;
      var _inProgress = true;
      var _validNodes = [];
      var _otherStatus;
      var _otherError;
      var _bucketList = [];
      var service = {
          inProgress: function()       {return _inProgress;},
          valid: function()            {return _valid;},
          validBuckets: function()     {return _bucketList;},
          otherNodes: function()       {return _validNodes;},
          otherStatus: function()      {return _otherStatus;},
          otherError: function()       {return _otherError;},
          updateValidBuckets: updateValidBuckets
      }


      var _valid = false;
      var _inProgress = false;
      var _monitoringAllowed = false;
      var _clusterStatsAllowed = false;
      var _validNodes = [];
      var _otherStatus;
      var _otherError;
      var _bucketList = [];
      var _bucketStatsList = [];
      var service = {
          inProgress: function()       {return _inProgress;},
          valid: function()            {return _valid;},
          validBuckets: function()     {return _bucketList;},
          otherNodes: function()       {return _validNodes;},
          otherStatus: function()      {return _otherStatus;},
          otherError: function()       {return _otherError;},
          monitoringAllowed: function() {return _monitoringAllowed;},
          clusterStatsAllowed: function() {return _clusterStatsAllowed;},
          updateValidBuckets: getBucketsAndNodes,
          getBucketsAndNodes: getBucketsAndNodes
      }

      //
      // with RBAC the only safe way to get the list of buckets is through a query
      // of system:keyspaces, which should return only accessible buckets for the user
      //

      function getBucketsAndNodes() {
        // make sure we only do this once at a time
        if (_inProgress)
          return;

        _valid = false;
        _otherStatus = null;
        _otherError = null;
        _inProgress = true;

        // get the list of valid nodes in the cluster, in case we need it
        mnPoolDefault.get().then(function(value){
          _validNodes = mnPoolDefault.getUrlsRunningService(value.nodes, "n1ql");
          //console.log("Got valid nodes: " + JSON.stringify(_validNodes));
          //console.log("Got URL: " + window.location.href);
        });

        // meanwhile issue a query to the local node get the list of buckets
        var queryData = {statement: "select keyspaces.name from system:keyspaces;"};
        $http.post("/_p/query/query/service",queryData)
        .then(function success(resp) {
          var data = resp.data, status = resp.status;
          //console.log("Success getting keyspaces: " + JSON.stringify(data));
          //console.log("Got bucket list data: " + JSON.stringify(data));

          mnPermissions.set("cluster.n1ql.meta!read"); // system catalogs
          mnPermissions.set("cluster.stats!read"); // system catalogs

          if (data && _.isArray(data.results) && data.results.length > 0) {
            for (var i=0; i< data.results.length; i++) {
              mnPermissions.set("cluster.bucket[" + data.results[i].name + "].data!read");
              mnPermissions.set("cluster.bucket[" + data.results[i].name + "].n1ql.select!execute");
            }
          }

          mnPermissions.check().then(updateValidBuckets);
        },
        // Error from $http
        function error(resp) {
          var data = resp.data, status = resp.status;
          //console.log("Error getting keyspaces: " + JSON.stringify(data));
          _valid = false; _inProgress = false;
          _otherStatus = status;
          _otherError = data;
        });
      }

      function updateValidBuckets() {
        // see what buckets we have permission to access
        var perms = mnPermissions.export.cluster;
        //console.log("Got bucket permissions... " + JSON.stringify(perms));

        _bucketList = []; _bucketStatsList = [];

        // stats perms
        _clusterStatsAllowed = (perms && perms.stats && perms.stats.read);

        // metadata perms
        _monitoringAllowed = (perms && perms.n1ql && perms.n1ql.meta && perms.n1ql.meta.read);

        // per-bucket perms
        if (perms && perms.bucket)
          _.forEach(perms.bucket,function(v,k) {
            // uncomment the following when RBAC is working properly for data access
            if (v && v.n1ql && v.n1ql.select && v.n1ql.select.execute)
              _bucketList.push(k);
            if (v && v.stats && v.stats.read && k != "*") {
              _bucketStatsList.push(k);
            }
          });

        //console.log("bucketList: " + JSON.stringify(_bucketList));
        //console.log("bucketStatsList: " + JSON.stringify(_bucketStatsList));

        // all done
        _valid = true; _inProgress = false;
      }


      // now return the service
      return service;
    });


  angular.module('mnAdmin').requires.push('qwQuery');
}());
