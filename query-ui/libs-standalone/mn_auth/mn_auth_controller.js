(function () {
  "use strict";

  angular
    .module('mnAuth')
    .controller('mnAuthController', mnAuthController);

  function mnAuthController(mnAuthService, $location, $state, mnAboutDialogService, $urlRouter) {
    var vm = this;
    //console.log("Making mnAuthController");

    vm.loginFailed = false;
    vm.submit = submit;
    vm.showAboutDialog = mnAboutDialogService.showAboutDialog;

    function error(resp) {
      vm.error = {};
      vm.error["_" + resp.status] = true;
    }
    function success() {
      /* never sync to /auth URL (as user will stay on the login page) */
      //console.log("Going to workbench...");
      if ($location.path() === "/auth") {
        $state.go('app.workbench');
      } else {
        $urlRouter.sync();
      }
    }
    function submit() {
      mnAuthService
        .login(vm.user)
        .then(success, error);
    }
  }
})();
