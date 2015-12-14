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

  angular.module('mnQuery').factory('MyRecursionHelper', ['$compile', getRecursionHelper]);

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

  angular.module('mnQuery').
  	directive('bucketDisplay', ['mnQueryService',/*'$modal',*/getBucketDisplay]);
  
  var fakePromise = {then: function() {}};
  var $modal = {open: function() {console.log("fake modal");return(then);}};
  
  function getBucketDisplay(mnQueryService,$modal,$scope,ModalService) {
    return {
      restrict: 'A',
      scope: { bucket: '=bucketDisplay' },
      //templateUrl: 'template/bucket-display.tmpl',
      template: 
    	  '<img ng-show="bucket.expanded" ng-click="collapseBucket(bucket)"' +
          '  style="height: 0.75em" src="/query/ui/images/ArrowDown.png" /> ' +
          '<img ng-hide="bucket.expanded" ng-click="expandBucket(bucket)"' +
          '  style="height: 0.75em" src="/query/ui/images/ArrowRight.png" />' +
          '<img ng-show="bucket.passwordNeeded && !bucket.password" style="height:0.75em" src="/query/ui/images/lock.png" ng-click="expandBucket(bucket)"/>' +
          '<img ng-show="bucket.passwordNeeded && bucket.password" style="height:0.75em" src="/query/ui/images/lock_unlock.png" />' +
          '  {{bucket.id}}' +
          '  <ul ng-show="bucket.expanded">' + 
          '    <li class="schema" ng-show="bucket.schema_error">{{bucket.schema_error}}</li>' + 
          '    <li class="schema" ng-repeat="flavor in bucket.schema">' +
          
          
          '      <div ng-show="flavor.Summary">{{flavor.Summary}}</div>' + //  if a summary line, show it

      	  '      <div ng-hide="flavor.Summary"><span ng-show="flavor[\'%docs\']">Flavor {{$index + " ("}}' +
          '        {{flavor[\'%docs\'] | number:1}}{{"%)"}}</span>' + 
          '        <span ng-show="flavor.Flavor">{{", in-common: " + flavor.Flavor}}</span></div>' +
          '      <div ng-hide="flavor.hasFields">Flavor {{index}} - no fields found, perhaps binary data, not JSON?</div>' +       

          '      <schema-display ng-hide="flavor.Summary" schema="flavor" path=""></schema-display>' +

          
          '  </ul>'  
          ,
      link: function (scope) {
        scope.$watch('bucket', function (schema) {
          scope.schema = schema;

          /*
           * This function is used to expand bucket descriptions (asking for SASL passwords
           * if necessary)
           */
          scope.expandBucket = function(bucket) {
            scope.bucket = bucket;
            bucket.tempPassword = "";
            //console.log("Password required: " + scope.bucket.passwordNeeded);
            //console.log("bucket: " + scope.bucket.id);
            if (bucket.passwordNeeded && !bucket.validated) {      

              var promise = $modal.open({
                templateUrl: 'query/password_dialog/mn_query_password_dialog.html',
                scope: scope              
              }).result;

              promise.then(function (res) {
                mnQueryService.authenticateBuckets([bucket.id],[bucket.tempPassword],
                    function(data,status,headers,config) {
                  if (data.success[0]) {
                    bucket.validated = true;
                    bucket.password = bucket.tempPassword;
                    mnQueryService.getSchemaForBucket(bucket);
                    bucket.expanded = true;
                    //console.log("Bucket validated");
                  } 
                  else {
                    //console.log("Bucket not validated");
                    $modal.open({
                      templateUrl: 'query/password_dialog/mn_query_error_dialog.html',
                      scope: scope              
                    });
                  }
                },
                function(data,status,headers,config) {
                  console.log(data.errors);
                })
              });

              return;
            }

            if (bucket.schema.length == 0)
              mnQueryService.getSchemaForBucket(bucket);

            bucket.expanded = true;
          };

          scope.collapseBucket = //mnQueryService.collapseBucket; 
            function(bucket) {
            bucket.expanded = false;    
          };
        });
      },
    };
  };



  //the schemaDisplay directive shows the fields of a schema, then recursively shows
  //the subfields of any object-typed fields.


  angular.module('mnQuery').directive('schemaDisplay', getSchemaDisplay);
		  
  function getSchemaDisplay(MyRecursionHelper) {
    return {
      restrict: 'E',
      scope: { schema: '=schema', path:"=path"},
      template: 
          '<ul>' +
          '  <li style="white-space: nowrap" ng-repeat="(name,  field) in schema.properties">' +
          '    <div class="indexed" ng-show="field.type!=\'object\' && field.indexed"> {{name}}' +
          '      {{" ("+ field.type + ", indexed), e.g.: " + field.samples[0]}}</div>' +
          '    <div ng-show="field.type!=\'object\' && !field.indexed"> {{name}}' +
          '      {{" ("+ field.type + "), e.g.: " + field.samples[0]}}</div>' +
          '    <div ng-show="field.type==\'object\'"> {{name}}' +
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


