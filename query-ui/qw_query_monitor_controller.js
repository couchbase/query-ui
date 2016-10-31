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

    qc.selectTab = qwQueryService.selectMonitoringTab;
    qc.isSelected = qwQueryService.isMonitoringSelected;
    qc.cancelQueryById = qwQueryService.cancelQueryById;

    //
    // keep track of results from the server
    //

    qc.monitoring = qwQueryService.monitoring;

    qc.updatedTime = updatedTime;
    qc.toggle_update = toggle_update;
    qc.get_toggle_label = get_toggle_label;

    //
    // when was the data last updated?
    //

    function updatedTime() {
      var result;
      switch (qwQueryService.monitoringTab) {
      case 1: result = qc.monitoring.active_updated; break
      case 2: result = qc.monitoring.completed_updated; break;
      case 3: result = qc.monitoring.prepareds_updated; break;
      }

      if (_.isDate(result))
        result = result.toTimeString();

      return result;
    }

    //
    // call the activate method for initialization
    //

    activate();

    //
    //
    //

    function activate() {
      // if we haven't been here before, initialize the monitoring data
      if (qwQueryService.monitoringTab == 0) {
        qc.selectTab(1); // default is 1st tab
        update();     // start updating
        qwQueryService.updateQueryMonitoring(2); // but also get data for other two tabs
        qwQueryService.updateQueryMonitoring(3);
      }

      // if we have been here before, start auto-updating if necessary

      else if (qwQueryService.monitoringAutoUpdate)
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
      if (qwQueryService.monitoringAutoUpdate) {
        if (qc.timer) // stop any timers
          $timeout.cancel(qc.timer);
        qwQueryService.monitoringAutoUpdate = false;
      }
      else {
        qwQueryService.monitoringAutoUpdate = true;
        update();
      }
    }

    function get_toggle_label() {
      if (qwQueryService.monitoringAutoUpdate)
        return("pause");
      else
        return("refresh");
    }

    //
    // function to update the current data at regular intervals
    //


    function update() {
      // update the currently selected tab
      qwQueryService.updateQueryMonitoring(qwQueryService.monitoringTab);

      // do it again in 5 seconds
      if (!qc.stop_updating && qwQueryService.monitoringAutoUpdate)
        qc.timer = $timeout(function(){update();},5000);

    }

    // when the controller is destroyed, stop the updates
    $scope.$on('$destroy',function(){
      qc.stop_updating = true;
      if (qc.timer)
         $timeout.cancel(qc.timer);
    });

    //
    // all done, return the controller
    //

    return qc;
  }


})();
