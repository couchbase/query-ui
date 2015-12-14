(function () {
  "use strict";

  angular
    .module('mnQuery', ["ui.router", "mnPluggableUiRegistry", "mnJquery",
                      'mnJsonTree',
                      'mnJsonTable',
                      'ui.ace'])
    .config(function($stateProvider, mnPluggableUiRegistryProvider) {
      $stateProvider.state('app.admin.query', {
        url: '/query',
        controller: 'mnQueryController',
        templateUrl: '/query/ui/query.html'
      });
      mnPluggableUiRegistryProvider.registerConfig({
        name: 'Query',
        state: 'app.admin.query',
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
