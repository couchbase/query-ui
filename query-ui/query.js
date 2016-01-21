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
    .run(function(jQuery, $timeout) {
      function setTopNavWidth() {
        var current = jQuery("#headerNav .contents").width();
        if (current) {
          jQuery("#headerNav .contents").width(1040);
        }
        else {
          $timeout(setTopNavWidth, 100);
        }
      }
      setTopNavWidth();
    })
    .controller('mnQueryController', function($scope) {
      $scope.statement = 'Goodbye'
    });
  angular.module('mnAdmin').requires.push('mnQuery');
}());
