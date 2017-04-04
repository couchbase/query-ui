/**
 * Angular directive to recursively display buckets and their schemas (and, when
 * there are object-valued fields, subschemas, and subsubschemas...) in the left
 * panel of the QueryUI.
 */
/* global _, angular */

(function() {

  'use strict';

  /*
   * The following routine, from StackOverflow may Mark Lagendijk, allows us to have
   * fully recursive directives (otherwise the browsers goes into an infinite loop).
   * This permits us to display schemas inside schemas inside schemas...
   * http://stackoverflow.com/questions/14430655/recursion-in-angular-directives
   */

  angular.module('qwQuery').factory('MyRecursionHelper', ['$compile', getRecursionHelper]);

  function getRecursionHelper($compile) {
    return {
      /**
       * Manually compiles the element, fixing the recursion loop.
       * @param element
       * @param [link] A post-link function, or an object with function(s) registered via pre and post properties.
       * @returns An object containing the linking functions.
       */
      compile: recursionCompile,
    };

    /**
     * avoid infinite recursion by removing the elements
     */

    function recursionCompile(element, link){
      var compiledContents;
      var contents;

      // Normalize the link parameter
      if(angular.isFunction(link)){
        link = { post: link };
      }

      // Break the recursion loop by removing the contents
      contents = element.contents().remove();
      return {
        pre: ((link && link.pre) ? link.pre : null),
        post: recursionPostCompile
      };

      /**
       * Compiles and re-adds the contents
       */

      function recursionPostCompile(scope, element) {
        // correctly output sample values of type array
        scope.showSamples = function(field) {
          if (_.isArray(field.samples)) {
            var result = "e.g., ";

            for (var i =0;i < 3 && i < field.samples.length; i++) {
              var value = field.samples[i];
              if (result.length > 6)
                result += ", ";

              if (_.isArray(value))
                result += JSON.stringify(value);
              else
                result += value;
            }

            return(result);
          }
          else
            return("");
        };

        // Compile the contents
        if(!compiledContents){
          compiledContents = $compile(contents);
        }
        // Re-add the compiled contents to the element
        compiledContents(scope, function(clone){
          element.append(clone);
        });

        // Call the post-linking function, if any
        if(link && link.post){
          link.post.apply(null, arguments);
        }
      }
    }
  }



  //the bucketDisplay directive iterates over a bucket's schema "flavors", and
  //calls the schemaDisplay directive for each flavor.

  angular.module('qwQuery').
  directive('bucketDisplay', ['qwQueryService','qwConstantsService','$uibModal',getBucketDisplay]);

  //var fakePromise = {then: function() {}};
  //var $modal = {open: function() {console.log("fake modal");return(then);}};

  function getBucketDisplay(qwQueryService,qwConstantsService,$uibModal,$scope) {
    //console.log("getBucketDisplay");

    return {
      restrict: 'A',
      scope: { bucket: '=bucketDisplay' },
      //templateUrl: 'template/bucket-display.tmpl',
      template:
        '<div ng-click="changeExpandBucket(bucket)" class="bucket">' +
        ' <img ng-show="bucket.expanded && showSchemaControls"' +
        '  style="height: 0.75em" src="../_p/ui/query/images/ArrowDown.png" /> ' +
        '<img ng-hide="bucket.expanded || !showSchemaControls"' +
        '  style="height: 0.75em" src="../_p/ui/query/images/ArrowRight.png" />' +
//        '<span class="icon fa-caret-down" ng-show="bucket.expanded"></span>' +
//        '<span class="icon fa-caret-right"  ng-hide="bucket.expanded">&nbsp; </span>' +
        //'<img ng-show="bucket.passwordNeeded && !bucket.password" style="height:0.75em" src="../_p/ui/query/images/lock.png" ng-click="changeExpandBucket(bucket)"/>' +
        //'<img ng-show="bucket.passwordNeeded && bucket.password" style="height:0.75em" src="../_p/ui/query/images/lock_unlock.png" />' +
        '  &nbsp; {{bucket.id}}</div>' +
        '  <ul class="bucket" ng-if="bucket.expanded">' +
        '    <li class="schema" ng-show="bucket.schema_error">{{bucket.schema_error}}</li>' +
        '    <li class="schema" ng-repeat="flavor in bucket.schema">' +


        '      <div ng-show="flavor.Summary" class="semi-bold margin-bottom-half">>{{flavor.Summary}}</div>' + //  if a summary line, show it

        '      <div ng-hide="flavor.Summary"><span ng-show="flavor[\'%docs\']">Flavor {{$index + " ("}}' +
        '        {{flavor[\'%docs\'] | number:1}}{{"%)"}}</span>' +
        '        <span ng-show="flavor.Flavor">{{", in-common: " + flavor.Flavor}}</span></div>' +
        '      <div ng-hide="flavor.hasFields">Flavor {{index}} - no fields found, perhaps binary data, not JSON?</div>' +

        '      <schema-display ng-hide="flavor.Summary" schema="flavor" path=""></schema-display>' +

        '      <li ng-show="bucket.indexes.length > 0"><span class="semi-bold">Indexes</span> <ul class="bucket">' +
        '        <li class="index" ng-repeat="index in bucket.indexes">' +
        '        \'{{index.name}}\' <span ng-if="index.index_key.length > 0">on {{index.index_key}}</span>'+
        '         <span ng-if="index.condition"> where {{index.condition}}</span>' +
        '        </li>' +
        '      </ul></li>' +
        '  </ul>'
        ,
        link: function (scope) {
          scope.$watch('bucket', function (schema) {
            scope.schema = schema;

            scope.showSchemaControls = qwConstantsService.showSchemas;

            /*
             * This function is used to expand bucket descriptions (asking for SASL passwords
             * if necessary)
             */
            scope.changeExpandBucket = function(bucket) {
              if (!scope.showSchemaControls)
                return;

              //console.log("ChangeExpandBucket");
              if (!bucket.expanded) { //bucket is collapsed, expand it
                scope.bucket = bucket;
                bucket.tempPassword = "";
                //console.log("Password required: " + scope.bucket.passwordNeeded);
                //console.log("bucket: " + scope.bucket.id);
                if (bucket.passwordNeeded && !bucket.validated) {

                  // open the dialog to ask for a password

                  var promise = $uibModal.open({
                    templateUrl: '../_p/ui/query/ui-classic/password_dialog/qw_query_password_dialog.html',
                    scope: scope
                  }).result;

                  // if they gave us one, try and get the schema to test the password
                  promise.then(function success(res) {
                    bucket.password = bucket.tempPassword;
                    qwQueryService.getSchemaForBucket(bucket)

                    .then(function success(resp) {
                      //console.log("Got authentication success!");
                      bucket.validated = true;
                      bucket.expanded = true;
                    },function error(resp) {
                      bucket.validated = false;
                      bucket.password = null;
                      scope.error_title = "Bucket Password Failure";
                      scope.error_detail = "Incorrect password for bucket '" + bucket.id + "'.";
                      //console.log("Error authenticating: ");
                      $uibModal.open({
                        templateUrl: '../_p/ui/query/ui-classic/password_dialog/qw_query_error_dialog.html',
                        scope: scope
                      });
                    }
                    );
                  }); // end of 'o.k.' from password dialog

                  return; // either way, we're done here
                } // end of entering password

                if (bucket.schema.length == 0)
                  qwQueryService.getSchemaForBucket(bucket);

                bucket.expanded = true;
              }

              else { // bucket is expanded, collapse it
                bucket.expanded = false;
              }
            };

            scope.collapseBucket = //qwQueryService.collapseBucket;
              function(bucket) {
              bucket.expanded = false;
            };
          });
        },
    };
  };



  //the schemaDisplay directive shows the fields of a schema, then recursively shows
  //the subfields of any object-typed fields.


  angular.module('qwQuery').directive('schemaDisplay', getSchemaDisplay);

  function getSchemaDisplay(MyRecursionHelper) {
    return {
      restrict: 'E',
      scope: { schema: '=schema', path:"=path"},
      template:
        '<ul class="schema">' +
        '  <li style="white-space: nowrap" ng-repeat="(name,  field) in schema.properties">' +
        '    <div class="indexed" ng-if="field.type!=\'object\' && field.indexed"' +
        '     ng-attr-title="{{showSamples(field)}}"> {{name}}' +
        '      {{" ("+ field.type + ", indexed)"}}</div>' +
        '    <div ng-if="field.type!=\'object\' && !field.indexed"' +
        '      ng-attr-title="{{showSamples(field)}}"> {{name}}' +
        '      {{" ("+ field.type + ")"}}</div>' +
        '    <div ng-if="field.type==\'object\'"> {{name}}' +
        '      {{" ("+ field.type + "), child type: "}} ' +
        '      <schema-display schema="field" path="path + name + \'.\' "></schema-display></div>' +
        '   </li>' +
        '</ul>',
        compile: function(element) {
          return(MyRecursionHelper.compile(element));
        }
    };
  };

})();


