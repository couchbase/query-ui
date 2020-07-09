/**
 * Component wrapper around AngularJS uiAce directive
 */
/* global _, angular */

import angular from "/ui/web_modules/angular.js";
import _ from "/ui/web_modules/lodash.js";
import uiAce from "/ui/libs/ui-ace.js";

export default "qwAceModule";

  angular.module('qwAceModule', [
      uiAce
    ])
  .component('qwAce', {
    bindings: {
      data: "=data",
      options: "=options"
    },
    template: '<div class="wb-results-json"></div>',
    controller: qwAceController
  });

//  ['$compile','$timeout','mnPermissions',getTableEditor]);

  function qwAceController($element,$compile,$scope) {
    this.$onInit = buildTextEditor;

    function buildTextEditor() {
      console.log("Inside qwAceController build text editor");
      $element.empty();
      $element.append(angular.element('<div class="text-medium">Rendering results...</div>'));

      $scope.options = this.options;
      $scope.data = this.data;
      var inner_element = angular.element('<div  style="width:100px,height:100px" ui-ace="{{options}}" ng-model="data"></div>');
      $compile(inner_element)($scope,function (compiledContent) {/*$element.empty();*/ $element.append(compiledContent)})
    }
  };
