import angular from "angular";
import _ from "lodash";

import uiRouter                 from "@uirouter/angularjs";
import uiBootstrap              from "angular-ui-bootstrap";

import uiAce                    from "ui-ace";
import ngClipboard              from "ngclipboard";

import mnJquery                 from "components/mn_jquery";
import mnPermissions            from "components/mn_permissions";
import mnPoll                   from "components/mn_poll";
import mnHelper                 from "components/mn_helper";
import mnPoolDefault            from "components/mn_pool_default";
import mnServersService         from "mn_admin/mn_servers_service";
import mnStatisticsNewService   from "mn_admin/mn_statistics_service";
import mnStatisticsChart        from "mn_admin/mn_statistics_chart_directive";

import { QwQueryService }       from "../angular-services/qw.query.service.js";
import { QwCollectionMenu }     from "../angular-directives/qw.collection.menu.component.js";
import { QwJsonChart }          from "../angular-directives/qw.json.chart.component.js";

import qwConstantsService       from "../qw_constants_service.js";
import qwJsonCsvService         from "../qw_json_csv_service.js";
import queryController          from "../qw_query_controller.js";
import qwQueryMonitorController from "../qw_query_monitor_controller.js";

import qwLongPress       from "../long_press/qw-long-press.directive.js";
import qwJsonTree        from "./data_display/qw-json-tree.directive.js";
import qwJsonDatatable   from "./data_display/qw-json-datatable.directive.js";
import qwJsonTableEditor from "./data_display/qw-json-table-editor.directive.js";
import qwAce             from "./data_display/qw-ace.component.js";
import qwExplainVizD3    from "./query_plan_viz/qw-explain-viz-d3.directive.js";
import qwAdviceViz       from "./advice_viz/qw-advice-viz.directive.js";
import qwValidJson       from "./json-validator/qw-json-validator.directive.js";

import {downgradeInjectable} from '@angular/upgrade/static';
import {downgradeComponent}  from "@angular/upgrade/static";

import {
  getRecursionHelper,
  getBucketDisplay,
  getBucketCollectionsDisplay,
  getSchemaDisplay
} from "./schema_display/qw_query_schema_display.directive.js";

export default 'qwQuery';

angular
  .module('qwQuery', [
    uiRouter,
    uiBootstrap,
    uiAce,
    ngClipboard,
    mnJquery,

    mnHelper,
    mnPermissions,
    mnPoll,
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
  .directive('qwJsonChart', downgradeComponent({component: QwJsonChart}))
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
