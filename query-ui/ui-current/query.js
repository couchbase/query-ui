import angular from "/ui/web_modules/angular.js";
import _ from "/ui/web_modules/lodash.js";

import uiRouter                 from "/ui/web_modules/@uirouter/angularjs.js";
import uiBootstrap              from "/ui/web_modules/angular-ui-bootstrap.js";

import uiAce                    from "/ui/libs/ui-ace.js";
import ngClipboard              from "/ui/libs/ngclipboard.js";

import mnJquery                 from "/ui/app/components/mn_jquery.js";
import mnPoll                   from "/ui/app/components/mn_poll.js";
import mnHelper                 from "/ui/app/components/mn_helper.js";
import mnPoolDefault            from "/ui/app/components/mn_pool_default.js";
import mnServersService         from "/ui/app/mn_admin/mn_servers_service.js";
import mnStatisticsNewService   from "/ui/app/mn_admin/mn_statistics_service.js";
import mnStatisticsChart        from "/ui/app/mn_admin/mn_statistics_chart_directive.js"

import { QwQueryService }       from "/_p/ui/query/angular-services/qw.query.service.js";
import { QwCollectionMenu }     from "/_p/ui/query/angular-directives/qw.collection.menu.component.js";

import qwConstantsService       from "/_p/ui/query/qw_constants_service.js";
import qwJsonCsvService         from "/_p/ui/query/qw_json_csv_service.js";
import queryController          from "/_p/ui/query/qw_query_controller.js";
import qwQueryMonitorController from "/_p/ui/query/qw_query_monitor_controller.js";

import qwLongPress       from "/_p/ui/query/long_press/qw-long-press.directive.js";
import qwJsonTree        from "./data_display/qw-json-tree.directive.js";
import qwJsonDatatable   from "./data_display/qw-json-datatable.directive.js";
import qwJsonTableEditor from "./data_display/qw-json-table-editor.directive.js";
import qwAce             from "./data_display/qw-ace.component.js";
import qwExplainVizD3    from "./query_plan_viz/qw-explain-viz-d3.directive.js";
import qwAdviceViz       from "./advice_viz/qw-advice-viz.directive.js";
import qwValidJson       from "./json-validator/qw-json-validator.directive.js";

import {downgradeInjectable} from '/ui/web_modules/@angular/upgrade/static.js';
import {downgradeComponent}  from "/ui/web_modules/@angular/upgrade/static.js";

import {
  getRecursionHelper,
  getBucketDisplay,
  getBucketCollectionsDisplay,
  getSchemaDisplay
} from "/_p/ui/query/ui-current/schema_display/qw_query_schema_display.directive.js";

export default 'qwQuery';

angular
  .module('qwQuery', [
    uiRouter,
    uiBootstrap,
    uiAce,
    ngClipboard,
    mnJquery,

    mnPoll,
    mnHelper,
    mnPoolDefault,
    mnServersService,
    mnStatisticsNewService,
    mnStatisticsChart,

    qwConstantsService,
    qwJsonCsvService,

//    qwQueryService,

    qwLongPress,
    qwJsonTree,
    qwJsonDatatable,
    qwJsonTableEditor,
    qwExplainVizD3,
    qwAdviceViz,
    qwValidJson,
    qwAce
  ])
  .controller('qwQueryController', queryController)
  .controller('qwQueryMonitorController', qwQueryMonitorController)
  .factory('MyRecursionHelper', getRecursionHelper)
  .directive('bucketDisplay', getBucketDisplay)
  .directive('bucketCollectionsDisplay', getBucketCollectionsDisplay)
  .directive('schemaDisplay', getSchemaDisplay)
  .directive('qwCollectionMenu', downgradeComponent({component: QwCollectionMenu}))
  .factory('qwQueryService', downgradeInjectable(QwQueryService))
  .config(function($stateProvider, $transitionsProvider) {

    $stateProvider
      .state('app.admin.query', {
        abstract: true,
        url: '/query',
        views: {
          "main@app.admin": {
            controller: 'qwQueryController',
            templateUrl: '/_p/ui/query/ui-current/query_toplevel.html'
          }
        },
        data: {
          title: "Query"
        }
      });

    $stateProvider
      .state('app.admin.query.monitoring', {
        url: '/monitoring',
        controller: 'qwQueryMonitorController as qmc',
        templateUrl: '/_p/ui/query/ui-current/query_monitoring.html'
      })
      .state('app.admin.query.workbench', {
        url: '/workbench?query',
        controller: 'qwQueryController as qc',
        templateUrl: '/_p/ui/query/ui-current/query.html'
      });

    //
    // whenever the user logs out, we want ensure that validateQueryService knows it needs
    // to re-validate
    //

    $transitionsProvider.onFinish({
      from: "app.auth",
      to: "app.admin.**",
    }, function ($transition$, $state, $injector) {
      var injector = $injector || $transition$.injector();
      var qwQueryService = injector.get("qwQueryService");
      qwQueryService.updateBuckets();
      qwQueryService.loadStateFromStorage();
    });

  });


