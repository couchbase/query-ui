(function () {
  "use strict";

  angular.module('mnAuth', [
    'mnAuthService',
    'ui.router',
    'mnAboutDialog',
    'mnAutocompleteOff',
    'ngMessages'
  ]).config(mnAuthConfig);

  function mnAuthConfig($stateProvider, $httpProvider, $urlRouterProvider) {
    $httpProvider.interceptors.push(['$q', '$injector', interceptorOf401]);
    $stateProvider.state('app.auth', {
      url: "/auth",
      templateUrl: 'libs-standalone/mn_auth/mn_auth.html',
      controller: 'mnAuthController as authCtl'
    });

    function interceptorOf401($q, $injector) {
      return {
        responseError: function (rejection) {
          //console.log("Intercepting 401, status: " + JSON.stringify(rejection));
          if (rejection.status === 401 &&
              rejection.config.url !== "/pools" &&
              $injector.get('$state').includes('app.admin') &&
              !rejection.config.headers["ignore-401"] &&
              !$injector.get('mnLostConnectionService').getState().isActivated) {
            //console.log("logout!");
            $injector.get('mnAuthService').logout();
          }
          //console.log("Returning reject!");
          return $q.reject(rejection);
        }
      };
    }
  }
})();
