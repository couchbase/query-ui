import angular from "/ui/web_modules/angular.js";
import uiBootstrap from "/ui/web_modules/angular-ui-bootstrap.js";
import uiRouter from "/ui/web_modules/@uirouter/angularjs.js";
import uiAce from "/ui/libs/ui-ace.js";

import mnPermissions from "/ui/app/components/mn_permissions.js";
import mnElementCrane from "/ui/app/components/directives/mn_element_crane/mn_element_crane.js";

import qwQueryService from "/_p/ui/query/qw_query_service.js";
import validateQueryService from "/_p/ui/query/validate_query_service.js";
import qwFixLongNumberService from "/_p/ui/query/qw_fix_long_number_service.js";

import qwDocEditorController from "/_p/ui/query/qw_doc_editor_controller.js";
import qwJsonTableEditor from "/_p/ui/query/ui-current/data_display/qw-json-table-editor.directive.js";

export default "qwQueryDocEditor";

angular.module('qwQueryDocEditor', [
  uiBootstrap,
  uiRouter,
  uiAce,

  mnPermissions,
  mnElementCrane,

  qwQueryService,
  validateQueryService,
  qwFixLongNumberService,
  qwJsonTableEditor,
])
  .config(configure)
  .controller('qwDocEditorController', qwDocEditorController);

function configure($stateProvider) {

  $stateProvider
    .state('app.admin.doc_editor', {
      url: '/doc_editor?bucket',
      views: {
        "main@app.admin": {
          controller: 'qwDocEditorController',
          templateUrl: '../_p/ui/query/ui-current/doc_editor.html'
        }
      },
      data: {
        title: "Documents"
      }
    });
}
