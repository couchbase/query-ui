import angular from "angular";
import app from "app";
import { mnLoadNgModule, mnLazyload } from "mn.app.imports";
import ace from 'ace/ace-wrapper';

import { NgModule } from '@angular/core';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

import { QwCollectionsService }   from "../angular-services/qw.collections.service.js";
import { QwJsonCsvService }       from "../angular-services/qw.json.csv.service.js";

import { QwCollectionMenu }       from "../angular-directives/qw.collection.menu.component.js";
import { QwConstantsService }     from "../angular-services/qw.constants.service.js";
import { QwDialogService }        from "../angular-directives/qw.dialog.service.js";
import { QwFixLongNumberService } from "../angular-services/qw.fix.long.number.service.js";
import { QwJsonChart }            from "../angular-directives/qw.json.chart.component.js";
import { QwQueryService }         from "../angular-services/qw.query.service.js";
import { QwQueryPlanService }     from "../angular-services/qw.query.plan.service.js";
import { QwValidateQueryService } from "../angular-services/qw.validate.query.service.js";
import { QwHttp }                 from '../angular-services/qw.http.js';
import { QwDirectivesModule }     from "../angular-directives/qw.directives.module.js";

angular
  .module(app)
  .config(function (mnPluggableUiRegistryProvider, mnPermissionsProvider) {
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!read" ); // needed for Documents and Query
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!write" ); // needed for Import
    mnPermissionsProvider.set("cluster.collection[.:.:.].collections!read" ); // needed for Documents
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.select!execute" );
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.index!all" );

    ace.config.set('basePath','/ui/libs/ace');

    // Angular8 version of the DocEditor
    mnPluggableUiRegistryProvider.registerConfig({
      name: 'Documents',
      state: 'app.admin.docs.editor',
      includedByState: 'app.admin.docs',
      plugIn: 'workbenchTab',
      ngShow: "rbac.cluster.collection['.:.:.'].data.docs.read && rbac.cluster.collection['.:.:.'].collections.read",
      index: 0
    });

    // Angular8 Workbench
    mnPluggableUiRegistryProvider.registerConfig({
      name: 'Query',
      state: 'app.admin.query.workbench',
      includedByState: 'app.admin.query',
      plugIn: 'workbenchTab',
      ngShow: "(rbac.cluster.collection['.:.:.'].data.docs.read && rbac.cluster.collection['.:.:.'].collections.read) || cluster.collection[.:.:.].n1ql.index!all",
      index: 1
    });

//    mnPluggableUiRegistryProvider.registerConfig({
//      name: 'Hello World',
//      state: 'app.admin.hello_world',
//      includedByState: 'app.admin.hello_world',
//      plugIn: 'workbenchTab',
//      ngShow: "rbac.cluster.bucket['.'].data.docs.read  && rbac.cluster.bucket['.'].data.xattr.read",
//      index: 0
//    });

    mnPermissionsProvider.set("cluster.n1ql.meta!read"); // system catalogs

    mnPermissionsProvider.setBucketSpecific(function (name) {
      return [
        "cluster.bucket[" + name + "].n1ql.select!execute",
        "cluster.bucket[" + name + "].data.docs!upsert",
        "cluster.bucket[" + name + "].data.xattr!read"
      ]
    });
  });

class QueryUI {
  static get annotations() { return [
    new NgModule({
      imports: [
        QwDirectivesModule,
        UIRouterUpgradeModule.forRoot({
          states: [
          {
            name: "app.admin.docs.**",
            url: "/docs",
            lazyLoad: mnLoadNgModule(() => import("../angular-components/documents/qw.documents.module.js"),
                                     "QwDocumentsModule")
          }, {
            name: "app.admin.query.**",
            url: "/query",
            lazyLoad: mnLoadNgModule(() => import("../angular-components/workbench/qw.workbench.module.js"),
              "QwWorkbenchModule")
          },
            //   {
          //   name: "app.admin.hello_world.**",
          //   url: "/hello_world",
          //   loadChildren: () => {
          //     return import('/_p/ui/query/hello-angular/hello.world.module.js').then(m => {
          //       return m.HelloWorldModule;
          //     });
          //   }
          // }
          ]
        })
      ],
      // because the Query Workbench is still AngularJS, yet relies on
      // downgradeInjectable versions of the following Angular services,
      // we need to list them as providers here to ensure that they are loaded.
      // otherwise we get "missing provider" errors when reloading the UI in
      // the query workbench. This should go away once the workbench is
      // migrated to Angular
      providers: [
        QwCollectionsService,
        QwConstantsService,
        QwDialogService,
        QwFixLongNumberService,
        QwJsonCsvService,
        QwQueryService,
        QwQueryPlanService,
        QwValidateQueryService,
        QwHttp,
      ],
      entryComponents: [
        QwCollectionMenu,
      ]
    })
  ]}
}

export default QueryUI;
