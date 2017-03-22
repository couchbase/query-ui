(function() {


  angular.module('qwQuery').controller('qwQueryMonitorController', queryMonController);

  queryMonController.$inject = ['$rootScope', '$scope', '$uibModal', '$timeout', 'qwQueryService', 'validateQueryService', 'mnAnalyticsService'];

  function queryMonController ($rootScope, $scope, $uibModal, $timeout, qwQueryService, validateQueryService, mnAnalyticsService) {

    var qmc = this;

    //
    // Do we have a REST API to work with?
    //

    qmc.validated = validateQueryService;

    // should we show active, completed, or prepared queries?

    qmc.selectTab = qwQueryService.selectMonitoringTab;
    qmc.isSelected = qwQueryService.isMonitoringSelected;
    qmc.cancelQueryById = qwQueryService.cancelQueryById;

    //
    // keep track of results from the server
    //

    qmc.monitoring = qwQueryService.monitoring;

    qmc.updatedTime = updatedTime;
    qmc.toggle_update = toggle_update;
    qmc.get_toggle_label = get_toggle_label;
    qmc.get_update_flag = function() {return(qwQueryService.monitoringAutoUpdate);}

    qmc.stats = {};
    qmc.stat_names = ["query_requests","query_selects","query_avg_req_time","query_avg_svc_time",
      "query_errors", "query_warnings","query_avg_response_size","query_avg_result_count",
      "query_requests_250ms","query_requests_500ms", "query_requests_1000ms","query_requests_5000ms"];

    //
    // sorting for each of the three result tables
    //

    qmc.active_sort_by = 'elapsedTime';
    qmc.active_sort_reverse = true;
    qmc.update_active_sort = function(field) {
      if (qmc.active_sort_by == field)
        qmc.active_sort_reverse = !qmc.active_sort_reverse;
      else
        qmc.active_sort_by = field;
    };
    qmc.show_up_caret_active = function(field) {
      return(qmc.active_sort_by == field && qmc.active_sort_reverse);
    };
    qmc.show_down_caret_active = function(field) {
      return(qmc.active_sort_by == field && !qmc.active_sort_reverse);
    };

    qmc.completed_sort_by = 'elapsedTime';
    qmc.completed_sort_reverse = true;
    qmc.update_completed_sort = function(field) {
      if (qmc.completed_sort_by == field)
        qmc.completed_sort_reverse = !qmc.completed_sort_reverse;
      else
        qmc.completed_sort_by = field;
    };
    qmc.show_up_caret_completed = function(field) {
      return(qmc.completed_sort_by == field && qmc.completed_sort_reverse);
    };
    qmc.show_down_caret_completed = function(field) {
      return(qmc.completed_sort_by == field && !qmc.completed_sort_reverse);
    };

    qmc.prepared_sort_by = 'uses';
    qmc.prepared_sort_reverse = true;
    qmc.update_prepared_sort = function(field) {
      if (qmc.prepared_sort_by == field)
        qmc.prepared_sort_reverse = !qmc.prepared_sort_reverse;
      else
        qmc.prepared_sort_by = field;
    };
    qmc.show_up_caret_prepared = function(field) {
      return(qmc.completed_sort_by == field && qmc.prepared_sort_reverse);
    };
    qmc.show_down_caret_prepared = function(field) {
      return(qmc.prepared_sort_by == field && !qmc.prepared_sort_reverse);
    };

    //
    // when was the data last updated?
    //

    function updatedTime() {
      var result;
      switch (qwQueryService.monitoringTab) {
      case 1: result = qmc.monitoring.active_updated; break
      case 2: result = qmc.monitoring.completed_updated; break;
      case 3: result = qmc.monitoring.prepareds_updated; break;
      }

      if (_.isDate(result)) {
        var minutes = result.getMinutes() > 9 ? result.getMinutes() : "0" + result.getMinutes();
        var seconds = result.getSeconds() > 9 ? result.getSeconds() : "0" + result.getSeconds();
        result = " " + result.getHours() + ":" + minutes + ":" + seconds;
      }

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
        qmc.selectTab(1); // default is 1st tab
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
        if (qmc.timer) { // stop any timers
          $timeout.cancel(qmc.timer);
          qmc.timer = null;
        }
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
        return("resume");
    }

    //
    // function to update the current data at regular intervals
    //


    function update() {
      // update the currently selected tab
      qwQueryService.updateQueryMonitoring(qwQueryService.monitoringTab);

      // get the stats
      var buckets = validateQueryService.validBuckets();
      //console.log("Got buckets: "+ JSON.stringify(buckets));

      if (buckets && buckets.length > 1) mnAnalyticsService.getStats({$stateParams:{
//        "#": null,
//        specificStat: "query_selects",
//        enableInternalSettings: null,
//        disablePoorMansAlerts: null,
//        list: "active",
//        statsHostname: "127.0.0.1:9091",
        bucket: buckets[1],
//        bucket: "*",
//        openedStatsBlock: [
//          "Query"
//        ],
        "graph": "ops",
        "zoom": "minute"
          }}).then(function (data) {
            if (data && data.statsByName)
              qmc.stats = data.statsByName;
          });

      // do it again in 5 seconds
      if (qwQueryService.monitoringAutoUpdate) {
        qmc.timer = $timeout(update,5000);
      }

    }

    // when the controller is destroyed, stop the updates
    $scope.$on('$destroy',function(){
      console.log("Destroy");
      qwQueryService.monitoringAutoUpdate = false;
      if (qmc.timer) {
         $timeout.cancel(qmc.timer);
         qmc.timer = null;
      }
    });

    //
    // all done, return the controller
    //

    return qmc;
  }


})();
