(function() {


  angular.module('qwQuery').controller('qwQueryMonitorController', queryMonController);

  queryMonController.$inject = ['$rootScope', '$scope', '$uibModal', '$timeout', 'qwQueryService', 'validateQueryService'];

  function queryMonController ($rootScope, $scope, $uibModal, $timeout, qwQueryService, validateQueryService) {

    var qc = this;

    //
    // Do we have a REST API to work with?
    //

    qc.validated = validateQueryService;

    // should we show active, completed, or prepared queries?

    qc.selectTab = selectTab;
    qc.selected = 0;
    qc.isSelected = function(tab) {return(tab == qc.selected);};

    //
    // keep track of results from the server
    //

    qc.monitoring = qwQueryService.monitoring;

    qc.updatedTime = updatedTime;
    qc.auto_update = true;
    qc.toggle_update = toggle_update;
    qc.get_toggle_label = get_toggle_label;

    //
    // when was the data last updated?
    //

    function updatedTime() {
      var result;
      switch (qc.selected) {
      case 1: result = qc.monitoring.active_updated; break
      case 2: result = qc.monitoring.completed_updated; break;
      case 3: result = qc.monitoring.prepareds_updated; break;
      }

      if (_.isDate(result))
        result = result.toTimeString();

      return result;
    }

    //
    // change the tab selection
    //

    function selectTab(tabNum) {
      if (qc.isSelected(tabNum))
        return; // avoid noop

      qwQueryService.updateQueryMonitoring(tabNum);

      //console.log("After select active len: " + qc.monitoring.active_requests.length);
      qc.selected = tabNum;
    };


    //
    // call the activate method for initialization
    //

    activate();

    //
    //
    //

    function activate() {
      // initialize the monitoring data
      qwQueryService.updateQueryMonitoring(1);
      qwQueryService.updateQueryMonitoring(2);
      qwQueryService.updateQueryMonitoring(3);
      selectTab(1);
      update();

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

    function toggle_update() {
      if (qc.auto_update) {
        if (qc.timer) // stop any timers
          $timeout.cancel(qc.timer);
        qc.auto_update = false;
      }
      else {
        qc.auto_update = true;
        update();
      }
    }

    function get_toggle_label() {
      if (qc.auto_update)
        return("pause");
      else
        return("refresh");
    }

    //
    // function to update the current data at regular intervals
    //


    function update() {
      // update the currently selected tab
      qwQueryService.updateQueryMonitoring(qc.selected);

      // do it again in 5 seconds
      if (!qc.stop_updating) qc.timer = $timeout(function(){
        update();
      },5000);

    }

    // when the controller is destroyed, stop the updates
    $scope.$on('$destroy',function(){
      if (qc.timer)
         $timeout.cancel(qc.timer);
      qc.stop_updating = true;
    });

    //
    // all done, return the controller
    //

    return qc;
  }


})();
