(function () {
  "use strict";

  angular
    .module('mnQuery', ["ui.router", "mnPluggableUiRegistry", "mnJquery",
                      'mnJsonTree',
                      'mnJsonTable',
                      'ui.ace'])
    .config(function($stateProvider, mnPluggableUiRegistryProvider) {
      $stateProvider
      .state('app.admin.query', {
        abstract: true,        
        url: '/_p/ui/query',
        controller: 'mnQueryController',
        templateUrl: '/_p/ui/query/query_toplevel.html'
      })
      .state('app.admin.query.monitoring', {
        url: '/_p/ui/query/monitoring',
        controller: 'mnQueryController',
        templateUrl: '/_p/ui/query/query_monitoring.html'
      })
      .state('app.admin.query.workbench', {
        url: '/_p/ui/query/workbench',
        controller: 'mnQueryController',
        templateUrl: '/_p/ui/query/query.html'
      })
      ;

      mnPluggableUiRegistryProvider.registerConfig({
        name: 'Query',
        state: 'app.admin.query.workbench',
        plugIn: 'adminTab'
      });
    })
    .run(function(jQuery, $timeout, $http) {
      // hack - ensure the menu bar has enough space
      function setTopNavWidth() {
        var current = jQuery("#headerNav .contents").width();
        if (current) {
          jQuery("#headerNav .contents").width(1040);
        }
        else {
          $timeout(setTopNavWidth, 100);
        }
      }

      // initialization
      console.log("Loading mnQuery panel.");
      setTopNavWidth();
    })
    
    // we can only work if we have a query node. This service checks for 
    // a query node a reports back whether it is present.
    
    .factory('validateQueryService', function($http,mnServersService) {
      var _valid = false;
      var _inProgress = true;
      var _validNodes = [];
      var service = {
          inProgress: function() {return _inProgress;},
          valid: function()      {return _valid;},
          otherNodes: function() {return _validNodes;}
      }
      
      // we can only run on nodes that support our API 
      var queryData = {statement: "select \"test\";"};
      $http.post("/_p/query/query/service",queryData)
      .success(function(data, status, headers, config) {
        _valid = true; _inProgress = false;
        
      })
      .error(function(data, status, headers, config) {
        _valid = false; _inProgress = false;
        
        // since we failed, let's go through the list of nodes
        // and see which ones have a query service

        mnServersService.getNodes().then(function (resp) {
          var nodes = resp.allNodes;
          for (var i = 0; i < nodes.length; i++)
            if (_.contains(nodes[i].services,"n1ql"))
              _validNodes.push("http://" + nodes[i].hostname + "/ui/index.html#/_p/ui/query/_p/ui/query/workbench");
        });
      });

      return service;
    });
  
  
  angular.module('mnAdmin').requires.push('mnQuery');
}());
