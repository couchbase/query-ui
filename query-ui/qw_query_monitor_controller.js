(function() {


  angular.module('qwQuery').controller('qwQueryMonitorController', queryController);

  queryController.$inject = ['$rootScope', '$uibModal', '$timeout', 'qwQueryService'];

  function queryController ($rootScope, $uibModal, $timeout, qwQueryService) {

    var qc = this;

    //
    // call the activate method for initialization
    //

    activate();


    //
    //
    //

    function activate() {
      // Prevent the backspace key from navigating back. Thanks StackOverflow!
      $(document).unbind('keydown').bind('keydown', function (event) {
        var doPrevent = false;
        if (event.keyCode === 8) {
          var d = event.srcElement || event.target;
          if ((d.tagName.toUpperCase() === 'INPUT' &&
              (
                  d.type.toUpperCase() === 'TEXT' ||
                  d.type.toUpperCase() === 'PASSWORD' ||
                  d.type.toUpperCase() === 'FILE' ||
                  d.type.toUpperCase() === 'SEARCH' ||
                  d.type.toUpperCase() === 'EMAIL' ||
                  d.type.toUpperCase() === 'NUMBER' ||
                  d.type.toUpperCase() === 'DATE' )
          ) ||
          d.tagName.toUpperCase() === 'TEXTAREA') {
            doPrevent = d.readOnly || d.disabled;
          }
          else {
            doPrevent = true;
          }
        }

        if (doPrevent) {
          event.preventDefault();
        }
      });

    }
  }


})();
