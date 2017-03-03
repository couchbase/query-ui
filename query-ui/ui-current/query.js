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


      function updateValidBuckets() {
        // see what buckets we have permission to access
        var perms = mnPermissions.export.cluster;
        if (perms && perms.bucket)
          _.forEach(perms.bucket,function(v,k) {
            // uncomment the following when RBAC is working properly for data access
            if (v && v.data && (v.data.read || v.data.write))
              _bucketList.push(k);
              //console.log("Allowed to query: "+ k);
          });

        // we can only run on nodes that support our API
        var queryData = {statement: "select \"test\";"};
        $http.post("/_p/query/query/service",queryData)
        .success(function(data, status, headers, config) {
          _valid = true; _inProgress = false;

        })
        .error(function(data, status, headers, config) {
          _valid = false; _inProgress = false;

          // if we got a 404, there is no query service on this node.
          // let's go through the list of nodes
          // and see which ones have a query service

          if (status == 404) {
            mnPoolDefault.get().then(function(value){
              _validNodes = mnPoolDefault.getUrlsRunningService(value.nodes, "n1ql");
            });
          }

          // some other error to show
          else {
            _otherStatus = status;
            _otherError = data;
          }
        });
      }

      // we need to initialize the valid buckets
      updateValidBuckets();

      // now return the service
      return service;
    });


  angular.module('mnAdmin').requires.push('qwQuery');
}());
