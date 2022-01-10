/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import angular from "angular";
import app from "app";
import { mnLoadNgModule, mnLazyload } from "mn.app.imports";
import ace from 'ace/ace-wrapper';

import { NgModule } from '@angular/core';
import { UIRouterUpgradeModule } from '@uirouter/angular-hybrid';

import { QwDirectivesModule }     from "../angular-directives/qw.directives.module.js";
import {QwCollectionMenu} from "../angular-directives/qw.collection.menu.component.js";

angular
  .module(app)
  .config(function (mnPluggableUiRegistryProvider, mnPermissionsProvider) {
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!read"); // needed for Documents and Query
    mnPermissionsProvider.set("cluster.collection[.:.:.].data.docs!write"); // needed for Import
    mnPermissionsProvider.set("cluster.collection[.:.:.].collections!read"); // needed for Documents
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.select!execute");
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.index!all");

    // permissions for UDFs
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.udf!manage");
    mnPermissionsProvider.set("cluster.collection[.:.:.].n1ql.udf_external!manage");
    mnPermissionsProvider.set("cluster.n1ql.udf!manage");
    mnPermissionsProvider.set("cluster.n1ql.udf_external!manage");

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
      ngShow: "(rbac.cluster.collection['.:.:.'].data.docs.read && rbac.cluster.collection['.:.:.'].collections.read) || rbac.cluster.collection['.:.:.'].n1ql.index.all",
      index: 1
    });

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
            lazyLoad: mnLoadNgModule(() => import("../angular-component-wrappers/qw.wrapper.module.js"),
              "QwWrapperModule")
          },
          ]
        })
      ],
      providers: [
      ],
      entryComponents: [
      ]
    })
  ]}
}

export default QueryUI;
