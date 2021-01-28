import angular from "/ui/web_modules/angular.js";
import app from "/ui/app/app.js";
import ace from '/ui/libs/ace/ace-wrapper.js';

import { NgModule } from '/ui/web_modules/@angular/core.js';
import { UIRouterUpgradeModule } from '/ui/web_modules/@uirouter/angular-hybrid.js';

import { QwCollectionMenu }       from "/_p/ui/query/angular-directives/qw.collection.menu.component.js";
import { QwCollectionsService }   from "/_p/ui/query/angular-services/qw.collections.service.js";
import { QwConstantsService }     from "/_p/ui/query/angular-services/qw.constants.service.js";
import { QwDialogService }        from "/_p/ui/query/angular-directives/qw.dialog.service.js";
import { QwFixLongNumberService } from "/_p/ui/query/angular-services/qw.fix.long.number.service.js";
import { QwQueryService }         from "/_p/ui/query/angular-services/qw.query.service.js";
import { QwQueryPlanService }     from "/_p/ui/query/angular-services/qw.query.plan.service.js";
import { QwValidateQueryService } from "/_p/ui/query/angular-services/qw.validate.query.service.js";
import { $http }                  from '/_p/ui/query/angular-services/qw.http.js';

import { QwDirectivesModule }     from "/_p/ui/query/angular-directives/qw.directives.module.js";

angular
  .module(app)
  .config(function (mnPluggableUiRegistryProvider, mnPermissionsProvider) {
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!read" ); // needed for Documents and Query
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!write" ); // needed for Import
    mnPermissionsProvider.set("cluster.collection[.:.:.].collections!read" ); // needed for Documents
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.select!execute" );


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

    mnPluggableUiRegistryProvider.registerConfig({
      name: 'Query',
      state: 'app.admin.query.workbench',
      includedByState: 'app.admin.query',
      plugIn: 'workbenchTab',
      ngShow: "rbac.cluster.collection['.:.:.'].data.docs.read && rbac.cluster.collection['.:.:.'].n1ql.select.execute",
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
            loadChildren: () => {
              return import('/_p/ui/query/angular-components/qw.documents.module.js').then(m => {
                return m.QwDocumentsModule;
              });
            }
          }, {
            name: "app.admin.query.**",
            url: "/query",
            lazyLoad: ($transition$) => {
              return import('/_p/ui/query/ui-current/query.js').then(m => {
                $transition$.injector().get('$ocLazyLoad').load({name: 'qwQuery'});
              });
            }
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
        QwQueryService,
        QwQueryPlanService,
        QwValidateQueryService,
        $http,

      ],
      entryComponents: [
        QwCollectionMenu
      ]
    })
  ]}
}

export default QueryUI;
