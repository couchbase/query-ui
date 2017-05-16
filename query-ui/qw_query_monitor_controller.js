(function() {


  angular.module('qwQuery').controller('qwQueryMonitorController', queryMonController);

  queryMonController.$inject = ['$http','$rootScope', '$scope', '$uibModal', '$timeout', 'qwQueryService', 'validateQueryService', 'mnAnalyticsService','qwQueryPlanService'];

  function queryMonController ($http, $rootScope, $scope, $uibModal, $timeout, qwQueryService, validateQueryService, mnAnalyticsService, qwQueryPlanService) {

    var qmc = this;

    //
    // Do we have a REST API to work with?
    //

    qmc.validated = validateQueryService;

    // should we show active, completed, or prepared queries?

    qmc.selectTab = qwQueryService.selectMonitoringTab;
    qmc.isSelected = qwQueryService.isMonitoringSelected;
    qmc.cancelQueryById = cancelQueryById;
    qmc.getCancelLabel = getCancelLabel;
    qmc.cancelledQueries = {}; // keep track of user-cancelled queries

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
    qmc.getLatestStat = getLatestStat;
    qmc.getAverageStat = getAverageStat;

    qmc.vitals = {};
    qmc.vitals_names = ["request.per.sec.15min","request.per.sec.5min",
      "request.per.sec.1min","request_time.mean","request_time.median","memory_util",
      "cpu.user.percent","cores"];
    qmc.vitals_labels = ["requests/sec (15min)","requests/sec (5min)",
      "requests/sec (1min)","mean request time","median request time","memory util",
      "cpu utilization","# cores"];
    qmc.getVital = getVital;

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
    // cancel a running query
    //

    function cancelQueryById(requestId) {
      // remember that the query was cancelled
      qmc.cancelledQueries[requestId] = true;
      // do the cancel
      qwQueryService.cancelQueryById(requestId);
    }

    //
    // get a label for cancel, which changes when the user hits "cancel"
    //

    function getCancelLabel(requestId) {
      if (qmc.cancelledQueries[requestId])
        return("cancelling");
      else
        return("cancel");
    }

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
      // if we were here before, remember if monitoring was updating or not
      if (qwQueryService.userAutoUpdate)
        qwQueryService.monitoringAutoUpdate = qwQueryService.userAutoUpdate;
      // otherwise remember the current state
      else
        qwQueryService.userAutoUpdate = qwQueryService.monitoringAutoUpdate;

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

      qwQueryService.userAutoUpdate = qwQueryService.monitoringAutoUpdate;
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

      // get the stats from the Query service
      $http({
        url: "../_p/query/admin/vitals",
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data) {
          //console.log("Got vitals: " + JSON.stringify(resp.data));
          qmc.vitals = resp.data;
          qmc.vitals.memory_util = Math.round((qmc.vitals["memory.usage"] / qmc.vitals["memory.system"]) * 100);
          qmc.vitals_updated_at = Date.now();
        }
      });

      // we need to pass in the name of a bucket to which we have access, even though
      // the query stats are not bucket-specific

      var buckets = validateQueryService.validBuckets();
      //console.log("Got buckets: "+ JSON.stringify(buckets));

      if (buckets && buckets.length > 1) mnAnalyticsService.getStats({$stateParams:{
        bucket: buckets[1],
        "graph": "ops",
        "zoom": "minute"
//        "#": null,
//        specificStat: "query_selects",
//        enableInternalSettings: null,
//        disablePoorMansAlerts: null,
//        list: "active",
//        statsHostname: "127.0.0.1:9091",
//        bucket: "*",
//        openedStatsBlock: [
//          "Query"
//        ],
          }}).then(function success(data) {
            if (data && data.statsByName) {
              qmc.stats = data.statsByName;
              qmc.stats_updated_at = Date.now();
            }
          },function error(resp) {console.log("Error getting graph data");});

      // do it again in 5 seconds
      if (qwQueryService.monitoringAutoUpdate) {
        qmc.timer = $timeout(update,5000);
      }

    }

    //
    // since the stats come as arrays of values for the past minute, here is a convenience
    // function to return the latest value for any named stat
    //

    function getLatestStat(name) {
      if (qmc.stats && qmc.stats[name] && qmc.stats[name].config && _.isArray(qmc.stats[name].config.data))
        return qmc.stats[name].config.data[qmc.stats[name].config.data.length - 1];
      else
        return null;
    }


    //
    // since the stats come as arrays of values for the past minute, here is a convenience
    // function to return the average value for any named stat
    //

    function getAverageStat(name) {
      if (qmc.stats && qmc.stats[name] && qmc.stats[name].config && _.isArray(qmc.stats[name].config.data)) {
        var sum = 0;
        for (var i=0;i<qmc.stats[name].config.data.length;i++)
          sum += qmc.stats[name].config.data[i];
        //console.log("For stat: " + name + " got length: " + qmc.stats[name].config.data.length + " and sum: " + sum);
        return sum/qmc.stats[name].config.data.length;
      }
      else
        return null;
    }



    //
    // the vitals might be numbers, but they might be strings indicating a duration
    // (e.g., "452.637ms"). Make sure all are returned as numbers
    //

    function getVital(name) {
      var val = qmc.vitals[name];
      //console.log("Got vital: " +name + " = "+ val);
      if (_.isString(val))
        return(qwQueryPlanService.convertTimeStringToFloat(val));
      else
        return(val);
    }

    // when the controller is destroyed, stop the updates
    $scope.$on('$destroy',function(){
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
