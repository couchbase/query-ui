(function () {
  "use strict";

  angular
  .module('qwQuery', ["ui.router", "mnPluggableUiRegistry", "mnJquery",
    'qwJsonTree',
    'qwJsonTable',
    'qwJsonTableEditor',
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
        views: {
          "main@app.admin": {
            controller: 'qwQueryController',
            templateUrl: '../_p/ui/query/ui-current/query_toplevel.html'
          }
        },
        data: {
          title: "Query"
        }
      });

      addQueryStates("app.admin.query");

      function addQueryStates(parent) {
        $stateProvider
        .state(parent + '.monitoring', {
          url: '/monitoring',
          controller: 'qwQueryMonitorController',
          templateUrl: '../_p/ui/query/ui-current/query_monitoring.html'
        })
        .state(parent + '.workbench', {
          url: '/workbench',
          controller: 'qwQueryController',
          templateUrl: '../_p/ui/query/ui-current/query.html'
        })
        .state(parent + '.doc_editor', {
          url: '/doc_editor',
          controller: 'qwDocEditorController',
          templateUrl: '../_p/ui/query/ui-current/doc_editor.html'
        })
        ;
      }

      mnPluggableUiRegistryProvider.registerConfig({
        name: 'Query',
        state: 'app.admin.query.workbench',
        plugIn: 'adminTab',
        after: 'indexes'//,
          //ngShow: canQuery("rbac.cluster.admin.internal.all"
      });
    })
    .run(function(jQuery, $timeout, $http) {
    })

    // we can only work if we have a query node. This service checks for
    // a query node a reports back whether it is present.

    .factory('validateQueryService', function($http,mnServersService,mnPermissions, mnPoolDefault) {
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

      //
      // with RBAC the only safe way to get the list of buckets is through a query
      // of system:keyspaces, which should return only accessible buckets for the user
      //

      function getBucketsAndNodes() {
        // get the list of valid nodes in the cluster, in case we need it
        mnPoolDefault.get().then(function(value){
          _validNodes = mnPoolDefault.getUrlsRunningService(value.nodes, "n1ql");
        });

        // meanwhile issue a query to the local node get the list of buckets
        var queryData = {statement: "select keyspaces.name from system:keyspaces;"};
        $http.post("/_p/query/query/service",queryData)
        .success(function(data) {
          //console.log("Got bucket list data: " + JSON.stringify(data));
          if (data && _.isArray(data.results) && data.results.length > 0) {
            for (var i=0; i< data.results.length; i++)
              mnPermissions.set("cluster.bucket[" + data.results[i].name + "].data!read");

            mnPermissions.check().then(updateValidBuckets);
          }
        })
        .error(function(data, status) {
          _valid = false; _inProgress = false;
          _otherStatus = status;
          _otherError = data;
        });
      }

      function updateValidBuckets() {
        _valid = true; _inProgress = false;
        // see what buckets we have permission to access
        var perms = mnPermissions.export.cluster;
        //console.log("Checking bucket permissions... "/*+ JSON.stringify(perms)*/);
        if (perms && perms.bucket)
          _.forEach(perms.bucket,function(v,k) {
            // uncomment the following when RBAC is working properly for data access
            if (v && v.data && (v.data.read || v.data.write))
              _bucketList.push(k);
            //console.log("  For bucket: " + k + ", got v: "+ JSON.stringify(v));
          });
      }

      getBucketsAndNodes();
      // we need to initialize the valid buckets
      //updateValidBuckets();

      // now return the service
      return service;
    });


  angular.module('mnAdmin').requires.push('qwQuery');
}());
