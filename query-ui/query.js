(function () {
  "use strict";

  angular
    .module('qwQuery', ["ui.router", "mnPluggableUiRegistry", "mnJquery",
                      'qwJsonTree',
                      'qwJsonTable',
                      'ui.ace'])
    .config(function($stateProvider, mnPluggableUiRegistryProvider) {
      $stateProvider
      .state('app.admin.query', {
        abstract: true,
        url: '/query',
        controller: 'qwQueryController',
        templateUrl: '/_p/ui/query/query_toplevel.html'
      })
      .state('app.admin.query.monitoring', {
        url: '/monitoring',
        controller: 'qwQueryController',
        templateUrl: '/_p/ui/query/query_monitoring.html'
      })
      .state('app.admin.query.workbench', {
        url: '/workbench',
        controller: 'qwQueryController',
        templateUrl: '/_p/ui/query/query.html'
      })
      ;

      mnPluggableUiRegistryProvider.registerConfig({
        name: 'Query',
        state: 'app.admin.query.workbench',
        plugIn: 'adminTab',
        after: 'buckets',
        ngShow: "rbac.cluster.admin.internal.all"
      });
    })
    .run(function(jQuery, $timeout, $http) {
    })

    // we can only work if we have a query node. This service checks for
    // a query node a reports back whether it is present.

    .factory('validateQueryService', function($http,mnServersService) {
      var _valid = false;
      var _inProgress = true;
      var _validNodes = [];
      var _otherStatus;
      var _otherError;
      var service = {
          inProgress: function() {return _inProgress;},
          valid: function()      {return _valid;},
          otherNodes: function() {return _validNodes;},
          otherStatus: function(){return _otherStatus;},
          otherError: function() {return _otherError;}
      }

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

        if (status == 404) mnServersService.getNodes().then(function (resp) {
          var nodes = resp.allNodes;
          for (var i = 0; i < nodes.length; i++)
            if (_.contains(nodes[i].services,"n1ql"))
              _validNodes.push("http://" + nodes[i].hostname + "/ui/index.html#/query/workbench");
        });
        // some other error to show
        else {
          _otherStatus = status;
          _otherError = data;
        }
      });

      return service;
    });


  angular.module('mnAdmin').requires.push('qwQuery');
}());
