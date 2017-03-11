(function() {
  'use strict';

  angular.module('qwQuery', ["ui.router", "mnJquery",
    'qwJsonTree',
    'qwJsonTable',
    'qwExplainViz',
    'qwLongPress',
    'mnBucketsService',
    'mnPendingQueryKeeper',
    'mnServersService',
    'mnPoolDefault',
    'mnAuth',
    'mnPools',
    'ui.ace',
    'ui.bootstrap'])

    .config(function($stateProvider,$urlRouterProvider) {
      $urlRouterProvider.otherwise('/standalone/workbench');

      $stateProvider
      .state('app', {
        abstract: true,
        url: '/standalone',
        template: '<ui-view/>'
      })
      .state('app.workbench', {
        url: '/workbench',
        templateUrl: 'ui-current/query.html'
      })
      ;

    })

    //

    // we can only work if we have a query node. This service checks for
    // a query node a reports back whether it is present.

    .factory('validateQueryService', function($http,mnServersService,mnPools,mnPoolDefault) {
      mnPools.getFresh();
      mnPoolDefault.get();

      var service = {
          inProgress: function() {return false;},
          valid: function()      {return true;},
          updateValidBuckets() {}
      }
      return service;
    });


  angular.module('app', ['ui.router','mnAuth','qwQuery']).run(appRun);

  // can't get authentication running right now.
  function appRun(mnPools,$state,$urlRouter) {
//    mnPools.get().then(function (pools) {
//      console.log("Pools: " + pools.isInitialized);
//      if (!pools.isInitialized) {
//        console.log("Error, pool not initialized!");
//        return $state.go('app.workbench');
//        //return $state.go('app.wizard.welcome');
//      }
//    }, function (resp) {
//      console.log("Got response: " + JSON.stringify(resp));
//
//      switch (resp.status) {
//        case 401:
//          console.log("Going to app.auth");
//          return $state.go('app.auth', null, {location: false});
//      }
//    }).then(function () {
//      console.log(".then...");
//      $urlRouter.listen();
//      $urlRouter.sync();
//    });
  }


})();