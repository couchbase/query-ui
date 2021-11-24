/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {UIRouter} from '/ui/web_modules/@uirouter/angular.js';
import {MnLifeCycleHooksToStream} from '/ui/app/mn.core.js';
import {Component, ViewEncapsulation} from '/ui/web_modules/@angular/core.js';
import { NgbModal } from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';

import { QwDialogService } from '../angular-directives/qw.dialog.service.js';

export {HelloWorldComponent};


class HelloWorldComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "/_p/ui/query/hello-angular/hello.world.component.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      UIRouter,
      NgbModal,
      QwDialogService,
      ];
  }


  constructor(uiRouter, modalService, qwDialogService) {
    super();

    this.modalService = modalService;

    this.item_array = [];
    for (var i=0; i < 15; i++) {
      var item = {"id": i, "a_number": 10, "a_string": "hello world", "a_boolean": false,
          "b_number": 11, "c_number": 12, "d_number": 12, "e_number": 12, "f_number": 12,
          "g_number": 11, "h_number": 12, "i_number": 12, "j_number": 12, "k_number": 12};
      this.item_array.push(item);
    }

    this.edit_array = [];
    for (var i=0; i < 15; i++)
      this.edit_array.push(
       {id: JSON.stringify(i),
        docSize: 123,
        data: this.item_array[i],
        meta: {"type":"json",cas: 456},
        rawJSON: JSON.stringify(this.item_array[i])
       }
       );

    this.dec = {
        options: {
          selected_bucket: 'bucket_foo',
          current_result: this.item_array,
          show_tables: true,
        },
        updateDoc: function() {console.log("inside updateDoc");},
        editDoc: function() {console.log("inside editDoc");},
        copyDoc: function() {console.log("inside copyDoc");},
        deleteDoc: function() {console.log("inside deleteDoc");},
    };

    this.editText = JSON.stringify(this.edit_array,null,2);

    this.onEditorReady = function(editor) {
      //console.log("Inside onEditorReady: " + editor);
      //console.log(" editor options: " + JSON.stringify(editor.$options,null,2));
      editor.setOptions(this.aceOutputOptions);
    }

    this.explainResult = {"explain":{"cardinality":142.16292561266536,"cost":1478.730592062459,"plan":{"#operator":"Sequence","~children":[{"#operator":"IndexScan3","cardinality":142.16292561266536,"cost":558.0834857948383,"index":"def_type","index_id":"6b9be5811f93ee5e","index_projection":{"primary_key":true},"keyspace":"travel-sample","namespace":"default","spans":[{"exact":true,"range":[{"high":"\"airline\"","inclusion":3,"low":"\"airline\""}]}],"using":"gsi"},{"#operator":"Fetch","cardinality":142.16292561266536,"cost":1477.8776145087832,"keyspace":"travel-sample","namespace":"default"},{"#operator":"Parallel","~child":{"#operator":"Sequence","~children":[{"#operator":"Filter","cardinality":142.16292561266536,"condition":"((`travel-sample`.`type`) = \"airline\")","cost":1478.304103285621},{"#operator":"InitialProject","cardinality":142.16292561266536,"cost":1478.730592062459,"result_terms":[{"expr":"self","star":true}]}]}}]},"text":"select * from `travel-sample` where type=\"airline\";"},"analysis":{"buckets":{"travel-sample":true},"fields":{"travel-sample.type":true,"travel-sample.*":true},"indexes":{"travel-sample.def_type":true},"aliases":[],"total_time":0,"warnings":[],"currentKeyspace":"travel-sample"},"plan_nodes":{"predecessor":{"predecessor":{"predecessor":{"predecessor":null,"operator":{"#operator":"IndexScan3","cardinality":142.16292561266536,"cost":558.0834857948383,"index":"def_type","index_id":"6b9be5811f93ee5e","index_projection":{"primary_key":true},"keyspace":"travel-sample","namespace":"default","spans":[{"exact":true,"range":[{"high":"\"airline\"","inclusion":3,"low":"\"airline\""}]}],"using":"gsi"},"subsequence":null,"parallel":true},"operator":{"#operator":"Fetch","cardinality":142.16292561266536,"cost":1477.8776145087832,"keyspace":"travel-sample","namespace":"default"},"subsequence":null,"parallel":true},"operator":{"#operator":"Filter","cardinality":142.16292561266536,"condition":"((`travel-sample`.`type`) = \"airline\")","cost":1478.304103285621},"subsequence":null,"parallelEnd":true,"parallel":true},"operator":{"#operator":"InitialProject","cardinality":142.16292561266536,"cost":1478.730592062459,"result_terms":[{"expr":"self","star":true}]},"subsequence":null,"parallelBegin":true,"parallel":true}};
    this.explainResult2 = {"explain":{"#operator":"Authorize","#stats":{"#phaseSwitches":4,"execTime":"2.336µs","servTime":"1.822562ms"},"privileges":{"List":[{"Target":"default:travel-sample","Priv":7}]},"~child":{"#operator":"Sequence","#stats":{"#phaseSwitches":1,"execTime":"4.902µs"},"~children":[{"#operator":"IndexScan3","#stats":{"#itemsOut":187,"#phaseSwitches":751,"execTime":"307.901µs","kernTime":"28.012µs","servTime":"41.865568ms"},"cardinality":142.16292561266536,"cost":558.0834857948383,"index":"def_type","index_id":"6b9be5811f93ee5e","index_projection":{"primary_key":true},"keyspace":"travel-sample","namespace":"default","spans":[{"exact":true,"range":[{"high":"\"airline\"","inclusion":3,"low":"\"airline\""}]}],"using":"gsi","#time_normal":"00:00.042","#time_absolute":0.042173469000000005},{"#operator":"Fetch","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":776,"execTime":"811.682µs","kernTime":"42.299293ms","servTime":"41.813295ms"},"cardinality":142.16292561266536,"cost":1477.8776145087832,"keyspace":"travel-sample","namespace":"default","#time_normal":"00:00.042","#time_absolute":0.042624976999999994},{"#operator":"Sequence","#stats":{"#phaseSwitches":1,"execTime":"1.927µs"},"~children":[{"#operator":"Filter","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"1.37105ms","kernTime":"83.603573ms"},"cardinality":142.16292561266536,"condition":"((`travel-sample`.`type`) = \"airline\")","cost":1478.304103285621,"#time_normal":"00:00.001","#time_absolute":0.0013710500000000002},{"#operator":"InitialProject","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"126.465µs","kernTime":"85.087857ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"result_terms":[{"expr":"self","star":true}],"#time_normal":"00:00.000","#time_absolute":0.000126465}],"#time_normal":"00:00.000","#time_absolute":0.000001927},{"#operator":"Stream","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":378,"execTime":"8.873769ms","kernTime":"76.36441ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"#time_normal":"00:00.008","#time_absolute":0.008873769}],"#time_normal":"00:00.000","#time_absolute":0.000004902},"~versions":["7.0.0-N1QL","7.0.0-0000-enterprise"],"#time_normal":"00:00.001","#time_absolute":0.001824898},"analysis":{"buckets":{"travel-sample":true},"fields":{"travel-sample.type":true,"travel-sample.*":true},"indexes":{"travel-sample.def_type":true},"aliases":[],"total_time":0.097001457,"warnings":[],"currentKeyspace":"travel-sample"},"plan_nodes":{"predecessor":{"predecessor":{"predecessor":{"predecessor":{"predecessor":{"predecessor":null,"operator":{"#operator":"Authorize","#stats":{"#phaseSwitches":4,"execTime":"2.336µs","servTime":"1.822562ms"},"privileges":{"List":[{"Target":"default:travel-sample","Priv":7}]},"~child":{"#operator":"Sequence","#stats":{"#phaseSwitches":1,"execTime":"4.902µs"},"~children":[{"#operator":"IndexScan3","#stats":{"#itemsOut":187,"#phaseSwitches":751,"execTime":"307.901µs","kernTime":"28.012µs","servTime":"41.865568ms"},"cardinality":142.16292561266536,"cost":558.0834857948383,"index":"def_type","index_id":"6b9be5811f93ee5e","index_projection":{"primary_key":true},"keyspace":"travel-sample","namespace":"default","spans":[{"exact":true,"range":[{"high":"\"airline\"","inclusion":3,"low":"\"airline\""}]}],"using":"gsi","#time_normal":"00:00.042","#time_absolute":0.042173469000000005},{"#operator":"Fetch","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":776,"execTime":"811.682µs","kernTime":"42.299293ms","servTime":"41.813295ms"},"cardinality":142.16292561266536,"cost":1477.8776145087832,"keyspace":"travel-sample","namespace":"default","#time_normal":"00:00.042","#time_absolute":0.042624976999999994},{"#operator":"Sequence","#stats":{"#phaseSwitches":1,"execTime":"1.927µs"},"~children":[{"#operator":"Filter","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"1.37105ms","kernTime":"83.603573ms"},"cardinality":142.16292561266536,"condition":"((`travel-sample`.`type`) = \"airline\")","cost":1478.304103285621,"#time_normal":"00:00.001","#time_absolute":0.0013710500000000002},{"#operator":"InitialProject","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"126.465µs","kernTime":"85.087857ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"result_terms":[{"expr":"self","star":true}],"#time_normal":"00:00.000","#time_absolute":0.000126465}],"#time_normal":"00:00.000","#time_absolute":0.000001927},{"#operator":"Stream","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":378,"execTime":"8.873769ms","kernTime":"76.36441ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"#time_normal":"00:00.008","#time_absolute":0.008873769}],"#time_normal":"00:00.000","#time_absolute":0.000004902},"~versions":["7.0.0-N1QL","7.0.0-0000-enterprise"],"#time_normal":"00:00.001","#time_absolute":0.001824898},"subsequence":null,"time_percent":1.9},"operator":{"#operator":"IndexScan3","#stats":{"#itemsOut":187,"#phaseSwitches":751,"execTime":"307.901µs","kernTime":"28.012µs","servTime":"41.865568ms"},"cardinality":142.16292561266536,"cost":558.0834857948383,"index":"def_type","index_id":"6b9be5811f93ee5e","index_projection":{"primary_key":true},"keyspace":"travel-sample","namespace":"default","spans":[{"exact":true,"range":[{"high":"\"airline\"","inclusion":3,"low":"\"airline\""}]}],"using":"gsi","#time_normal":"00:00.042","#time_absolute":0.042173469000000005},"subsequence":null,"time_percent":43.5},"operator":{"#operator":"Fetch","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":776,"execTime":"811.682µs","kernTime":"42.299293ms","servTime":"41.813295ms"},"cardinality":142.16292561266536,"cost":1477.8776145087832,"keyspace":"travel-sample","namespace":"default","#time_normal":"00:00.042","#time_absolute":0.042624976999999994},"subsequence":null,"time_percent":43.9},"operator":{"#operator":"Filter","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"1.37105ms","kernTime":"83.603573ms"},"cardinality":142.16292561266536,"condition":"((`travel-sample`.`type`) = \"airline\")","cost":1478.304103285621,"#time_normal":"00:00.001","#time_absolute":0.0013710500000000002},"subsequence":null,"time_percent":1.4},"operator":{"#operator":"InitialProject","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":752,"execTime":"126.465µs","kernTime":"85.087857ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"result_terms":[{"expr":"self","star":true}],"#time_normal":"00:00.000","#time_absolute":0.000126465},"subsequence":null,"time_percent":0.1},"operator":{"#operator":"Stream","#stats":{"#itemsIn":187,"#itemsOut":187,"#phaseSwitches":378,"execTime":"8.873769ms","kernTime":"76.36441ms"},"cardinality":142.16292561266536,"cost":1478.730592062459,"#time_normal":"00:00.008","#time_absolute":0.008873769},"subsequence":null,"time_percent":9.1}};

    this.qwDialogService = qwDialogService;

    this.aceOutputOptions = {
        mode: 'ace/mode/json',
        showGutter: true,
        wrap: true,
        vScrollBarAlwaysVisible: true,
        //onLoad: qc.aceOutputLoaded,
        //onChange: qc.aceOutputChanged,
        //$blockScrolling: Infinity
      };

  }

  openDialog() {
    this.qwDialogService.openDialog();

//    this.dialogRef = this.modalService.open(QwErrorDialog, {foo: "bar"});
//    this.dialogRef.componentInstance.error_title = "error dialog";
//    this.dialogRef.componentInstance.error_detail = "detail of the error";
//    //this.dialogRef.componentInstance.error_detail_array = ["array1","array2","array3"];
//    this.dialogRef.componentInstance.hide_cancel = false;
//
//    var This = this;

//    this.dialogRef.result.then(
//        function close(res) {
//          console.log("Closed: " + res);
//          This.removeDialog.bind(this);
//        }, function error(dismiss) {
//          console.log("Dismissed: " + res);
//          This.removeDialog.bind(this);
//        });
  }

//  removeDialog() {
//    this.dialogRef = null;
//  }
//
//  dismissDialog() {
//    this.dialogRef.dismiss();
//  }
//
//  isDialogOpened() {
//    return !!this.dialogRef;
//  }

}
