/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {is}                        from 'ramda';
import _                           from 'lodash';
import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
  ViewEncapsulation,
  ChangeDetectorRef}               from '@angular/core';

import { NgbModal, NgbModalConfig }from '@ng-bootstrap/ng-bootstrap';

import { QwHttp }                  from '../../angular-services/qw.http.js';
import { QwImportService }         from '../../angular-services/qw.import.service.js';
import { QwDialogService }         from '../../angular-directives/qw.dialog.service.js';
import { QwQueryService }          from '../../angular-services/qw.query.service.js';
import { QwQueryPlanService }      from '../../angular-services/qw.query.plan.service.js';
import { QwValidateQueryService }  from '../../angular-services/qw.validate.query.service.js';

import { QwQueryPlanDialog }       from '../../angular-components/workbench/dialogs/qw.query.plan.dialog.component.js';

import {MnPermissions, $rootScope, MnPoolDefault, MnStatisticsNew,
  MnHelper}                        from 'ajs.upgraded.providers';

import { BehaviorSubject, timer}   from "rxjs";
import { switchMap,
  shareReplay,
  takeUntil}                       from 'rxjs/operators';

export {QwMonitorComponent};


class QwMonitorComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        templateUrl:  "../_p/ui/query/angular-components/workbench/qw.monitor.html",
        //styleUrls: ["../../angular-directives/qw.directives.css"],
        encapsulation: ViewEncapsulation.None,
      })
    ]
  }

  static get parameters() {
    return [
      $rootScope,
      QwHttp,
      ChangeDetectorRef,
      MnHelper,
      MnPermissions,
      MnPoolDefault,
      MnStatisticsNew,
      NgbModal,
      NgbModalConfig,
      QwDialogService,
      QwImportService,
      QwQueryService,
      QwQueryPlanService,
      QwValidateQueryService,
    ];
  }

  ngOnInit() {
  }

  constructor(
    rootScope,
    qwHttp,
    cdr,
    mnHelper,
    mnPermissions,
    mnPoolDefault,
    mnStatisticsNew,
    ngbModal,
    ngbModalConfig,
    qwDialogService,
    qwImportService,
    qwQueryService,
    qwQueryPlanService,
    validateQueryService) {
    super();

    this.qmc = queryMonController(
      this,
      rootScope,
      qwHttp,
      cdr,
      mnHelper,
      mnPermissions,
      mnPoolDefault,
      mnStatisticsNew,
      ngbModal,
      ngbModalConfig,
      qwDialogService,
      qwImportService,
      qwQueryService,
      qwQueryPlanService,
      validateQueryService
      );
  }

  ngOnDestroy() {
  }
}

function queryMonController (This,
                             rootScope,
                             qWttp,
                             cdr,
                             mnHelper,
                             mnPermissions,
                             mnPoolDefault,
                             mnStatisticsNew,
                             ngbModal,
                             ngbModalConfig,
                             qwDialogService,
                             qwImportService,
                             qwQueryService,
                             queryPlanService,
                             validateQueryService
) {

  var qmc = {};

  //
  // Do we have a REST API to work with?
  //

  qmc.validated = validateQueryService;
  if (qmc.validated.inProgress()) // may need to validate connection to query service
    qmc.validated.getBucketsAndNodes();
  qmc.queryPlan = queryPlanService;
  qmc.modalService = ngbModal;

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
  qmc.get_update_flag = function() {return(qwQueryService.getMonitoringAutoUpdate());}
  qmc.options = qwQueryService.getMonitoringOptions;

  qmc.getSummaryStat = mnPoolDefault.export.compat.atLeast70 ? getSummaryStat70 : getSummaryStat;

  qmc.vitals = {};
  qmc.vitals_names = ["request.per.sec.15min","request.per.sec.5min",
    "request.per.sec.1min","request_time.mean","request_time.median","memory_util",
    "cpu.user.percent","cores"];
  qmc.vitals_labels = ["requests/sec (15min)","requests/sec (5min)",
    "requests/sec (1min)","mean request time","median request time","memory util",
    "cpu utilization","# cores"];
  qmc.getVital = getVital;
  qmc.showPlan = showPlan;

  qmc.charts = ([
    "@query.query_requests",
    "@query.query_avg_req_time",
    "@query.query_avg_svc_time"
  ]).map(name => {
    //name = mnPoolDefault.export.compat.atLeast70 ? mnStatsDesc.mapping65(name) : name;
    let stats = {};
    stats[name] = true;
    return {
      id: mnHelper.generateID(),
      node: "all",
      stats: stats,
      size: "tiny",
      specificStat: true
    };
  });

  qmc.openDetailedChartDialog = openDetailedChartDialog;

  function openDetailedChartDialog(c) {
    // $state.params.scenarioBucket = qmc.buckets[1];
    // $uibModal.open(
    //   {
    //     templateUrl: '/ui/app/mn_admin/mn_statistics_detailed_chart.html',
    //     controller: 'mnStatisticsDetailedChartController as detailedChartCtl',
    //     windowTopClass: "chart-overlay",
    //     resolve: {
    //       items: mnHelper.wrapInFunction({}),
    //       chart: mnHelper.wrapInFunction(qmc.charts[c])
    //     }
    //   });
  }

  //
  // sorting for each of the three result tables
  //

  qmc.get_active_requests = () =>
    qmc.monitoring.active_requests
      .sort((a,b) => a[qmc.options().active_sort_by].localeCompare(b[qmc.options().active_sort_by])*(qmc.options().active_sort_reverse ? -1 : 1));

  qmc.update_active_sort = function(field) {
    if (qmc.options().active_sort_by == field)
      qmc.options().active_sort_reverse = !qmc.options().active_sort_reverse;
    else
      qmc.options().active_sort_by = field;

    qwQueryService.saveStateToStorage();
  };
  qmc.show_up_caret_active = function(field) {
    return(qmc.options().active_sort_by == field && qmc.options().active_sort_reverse);
  };
  qmc.show_down_caret_active = function(field) {
    return(qmc.options().active_sort_by == field && !qmc.options().active_sort_reverse);
  };

  qmc.get_completed_requests = () => qmc.monitoring.completed_requests.sort(completed_sort_comparison);

  // some fields strings, one field is an int, need to be able to sort both
  function completed_sort_comparison(a,b) {
    let a_val = a[qmc.options().completed_sort_by];
    let b_val = b[qmc.options().completed_sort_by];
    let sort_direction = (qmc.options().completed_sort_reverse ? -1 : 1);
    if (_.isNumber(a_val))
      return (a_val-b_val)*sort_direction;
    else
      return a_val.localeCompare(b_val)*sort_direction;
  }

  qmc.update_completed_sort = function(field) {
    if (qmc.options().completed_sort_by == field)
      qmc.options().completed_sort_reverse = !qmc.options().completed_sort_reverse;
    else
      qmc.options().completed_sort_by = field;

    qwQueryService.saveStateToStorage();
  };
  qmc.show_up_caret_completed = function(field) {
    return(qmc.options().completed_sort_by == field && qmc.options().completed_sort_reverse);
  };
  qmc.show_down_caret_completed = function(field) {
    return(qmc.options().completed_sort_by == field && !qmc.options().completed_sort_reverse);
  };

  qmc.get_prepared_requests = () => qmc.monitoring.prepareds.sort(prepareds_sort_comparison);

  function prepareds_sort_comparison(a,b) {
    var psb = qmc.options().prepared_sort_by;
    if (!psb) return 1;
    // convert values to strings if needed
    var a_val = (a.hasOwnProperty(psb) ? a[psb] : '') + '', b_val = (b.hasOwnProperty(psb) ? b[psb] : '') + '';
    return a_val.localeCompare(b_val) * (qmc.options().prepared_sort_reverse ? -1 : 1);
  }

  qmc.update_prepared_sort = function(field) {
    if (qmc.options().prepared_sort_by == field)
      qmc.options().prepared_sort_reverse = !qmc.options().prepared_sort_reverse;
    else
      qmc.options().prepared_sort_by = field;

    qwQueryService.saveStateToStorage();
  };
  qmc.show_up_caret_prepared = function(field) {
    return(qmc.options().prepared_sort_by == field && qmc.options().prepared_sort_reverse);
  };
  qmc.show_down_caret_prepared = function(field) {
    return(qmc.options().prepared_sort_by == field && !qmc.options().prepared_sort_reverse);
  };

  //
  // show the plan info for a completed query
  //

  function showPlan(statement, plan) {
    this.dialogRef = qmc.modalService.open(QwQueryPlanDialog);
    this.dialogRef.componentInstance.plan = plan;
    this.dialogRef.statement = statement;
    this.dialogRef.result.then(
      function success(res) {}, // plan dialog is read only, nothing to do
      function cancel(res) {}
    );
  }

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
      return("Cancel");
  }

  //
  // when was the data last updated?
  //

  function updatedTime() {
    var result;
    switch (qwQueryService.getMonitoringSelectedTab()) {
      case 1: result = qmc.monitoring.active_updated; break
      case 2: result = qmc.monitoring.completed_updated; break;
      case 3: result = qmc.monitoring.prepareds_updated; break;
    }

    if (is(Date, result)) {
      var minutes = result.getMinutes() > 9 ? result.getMinutes() : "0" + result.getMinutes();
      var seconds = result.getSeconds() > 9 ? result.getSeconds() : "0" + result.getSeconds();
      var dateStr = result.toString();
      var zone = dateStr.substring(dateStr.length-4,dateStr.length-1);
      result = " " + result.getHours() + ":" + minutes + ":" + seconds + " " + zone;
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
    // get initial data for each panel
    if (qmc.monitoring.active_updated == "never")
      qwQueryService.updateQueryMonitoring(1);
    if (qmc.monitoring.completed_updated == "never")
      qwQueryService.updateQueryMonitoring(2);
    if (qmc.monitoring.prepareds_updated == "never")
      qwQueryService.updateQueryMonitoring(3);

    // set up a steram to run the queries and get query engine stats
    let query_poller = timer(0,5000)
      .pipe(switchMap(qwQueryService.runMonitoringQuery),
            shareReplay({refCount: true, bufferSize: 1}));

    query_poller.pipe(takeUntil(This.mnOnDestroy))
      .subscribe(qwQueryService.processMonitoringQueryResults);

    // stream to get stats from query service
    let query_stats_poller = timer(0,5000)
      .pipe(switchMap(qwQueryService.getQueryServiceStats),
        shareReplay({refCount: true, bufferSize: 1}));

    query_stats_poller.pipe(takeUntil(This.mnOnDestroy))
      .subscribe(handleQueryStatsResult);

    // plus the ns_server query stats
    let stats_poller = timer(0,5000)
      .pipe(switchMap(qwQueryService.getQueryStats),
        shareReplay({refCount: true, bufferSize: 1}));

    stats_poller.pipe(takeUntil(This.mnOnDestroy))
      .subscribe(handleStatsResult);
  }

  function toggle_update() {
    qwQueryService.setMonitoringAutoUpdate(!qwQueryService.getMonitoringAutoUpdate());
  }

  function get_toggle_label() {
    if (qwQueryService.getMonitoringAutoUpdate())
      return("pause");
    else
      return("resume");
  }

  //
  // function to update the current data at regular intervals
  //

  function handleStatsResult(resp) {
    if (resp && resp.status == 200 && resp.body) {
      let stats = _.isString(resp.body) ? JSON.parse(resp.body) : resp.body;
      qmc.stats = qmc.stats || {};
      // stats is an array, each element should have metric.name and values array
      // of timestamp/value pairs
      stats.forEach(stat => {
        // for request counts we need to sum them
        if (stat.data[0].metric.name.startsWith('n1ql_requests_'))
          qmc.stats[stat.data[0].metric.name] = Math.round(stat.data[0].values.reduce((accum,cur) => accum + parseFloat(cur[1]),0));
        // other stats are charts, so we want the array of timestamp value pairs
        else
          qmc.stats[stat.data[0].metric.name] =
            Math.round(stat.data[0].values.reduce((accum,cur) => accum + parseFloat(cur[1]),0))/stat.data[0].values.length/1000000000;
      });
    }
  }

  function handleQueryStatsResult(resp) {
    //console.log("Got query result: " + res);
    if (resp && resp.status == 200 && resp.body) {
      qmc.vitals = resp.body;
      qmc.vitals.memory_util = Math.round((qmc.vitals["memory.usage"] / qmc.vitals["memory.system"]) * 100);
      qmc.vitals_updated_at = Date.now();
    }
  }

  function update() {
    console.log("Update");
    // update the currently selected tab
    if (qwQueryService.getMonitoringAutoUpdate())
      qwQueryService.updateQueryMonitoring(qwQueryService.getMonitoringSelectedTab());

    // get the stats from the Query service
    qwHttp.do({
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

    qmc.buckets = qmc.validated.validBuckets();
    //console.log("Got buckets: "+ JSON.stringify(qmc.buckets));
    if (Array.isArray(qmc.buckets) && qmc.buckets.length > 1) {
      qmc.statsConfig.bucket = qmc.buckets[1];
    }

    return Promise.resolve();
  }

  //
  // for items like the number of queries > time over the past minute,
  // we would like a sum of all values from the array
  //

  function getSummaryStat(name) {
    // var s = $scope.mnUIStats;
    // if (s && s.stats && s.stats[name] && Array.isArray(s.stats[name].aggregate)) {
    //   var sum = 0;
    //   s.stats[name].aggregate.forEach(function(n) {sum+=n});
    //   return(sum);
    // }
    // else
      return null;
  }

  function getSummaryStat70(name) {
    // var s = $scope.mnUIStats;
    // name = mnStatsDesc.mapping65(name);
    // if (s && s.stats && s.stats[name] && s.stats[name].aggregate) {
    //   return s.stats[name].aggregate.values.reduce((sum, v) => sum + (Number(v[1]) || 0), 0);
    // }
    // else
       return null;
  }

  //
  // the vitals might be numbers, but they might be strings indicating a duration
  // (e.g., "452.637ms"). Make sure all are returned as numbers
  //

  function getVital(name) {
    var val = qmc.vitals[name];
    //console.log("Got vital: " +name + " = "+ val);
    if (is(String, val))
      return(qmc.queryPlan.convertTimeStringToFloat(val));
    else
      return(val);
  }

  //
  // all done, return the controller
  //

  return qmc;
}
