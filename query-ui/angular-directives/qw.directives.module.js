/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { NgModule,
  COMPILER_OPTIONS,
  CompilerFactory,
  Compiler }                   from '@angular/core';
import { NgbModule,
  NgbModalModule,
  NgbModalConfig }             from '@ng-bootstrap/ng-bootstrap';
import { JitCompilerFactory }  from '@angular/platform-browser-dynamic';
import { FormsModule }         from '@angular/forms';
import { CommonModule }        from '@angular/common';
import { MnSelectModule }      from 'mn.select.module';
import { NgxAceModule }        from 'ace/@nowzoo/ngx-ace';

import { QwBucketDisplay }     from "./qw.bucket.display.directive.js";
import { QwCollectionMenu }    from "./qw.collection.menu.component.js"
import { QwExplainViz }        from "./qw.explain.viz.component.js";
import { QwJsonDataTableComp } from "./qw.json.datatable.directive.js";
import { QwJsonChart }         from "./qw.json.chart.component.js";
import { QwJsonTree }          from "./qw.json.tree.directive.js";
import { QwJsonTableEditor2 }  from "./qw.json.table.editor.directive.js";
import { QwSchemaDisplay }     from "./qw.schema.display.directive.js";

import { QwHttp }              from "../angular-services/qw.http.js";
import { QwJsonCsvService }    from "../angular-services/qw.json.csv.service.js";
import { QwQueryService }      from "../angular-services/qw.query.service.js";

import { QwCollectionsService }   from "../angular-services/qw.collections.service.js";
import { QwConstantsService }     from "../angular-services/qw.constants.service.js";
import { QwFixLongNumberService } from "../angular-services/qw.fix.long.number.service.js";
import { QwMetadataService }      from "../angular-services/qw.metadata.service.js";

import { QwDialogService }     from "./qw.dialog.service.js";
import { QwDocEditorDialog }   from "./dialogs/qw.doc.editor.dialog.component.js";
import { QwErrorDialog }       from "./dialogs/qw.error.dialog.component.js";
import { QwInputDialog }       from "./dialogs/qw.input.dialog.component.js";
import { QwNoticeDialog }      from "./dialogs/qw.notice.dialog.component.js";

export { QwDirectivesModule };

class QwDirectivesModule {
  static get annotations() { return [
    new NgModule({
      declarations: [
        QwBucketDisplay,
        QwDocEditorDialog,
        QwCollectionMenu,
        QwErrorDialog,
        QwExplainViz,
        QwInputDialog,
        QwJsonChart,
        QwJsonDataTableComp,
        QwJsonTableEditor2,
        QwJsonTree,
        QwNoticeDialog,
        QwSchemaDisplay,
      ],
      bootstrap: [ // need to include dialog components here
        QwCollectionMenu,
        QwDocEditorDialog,
        QwErrorDialog,
        QwInputDialog,
        QwJsonChart,
        QwJsonDataTableComp,
        QwNoticeDialog,
        QwJsonTableEditor2,
        ],
      imports: [
        FormsModule,
        CommonModule,
        NgbModalModule, // needed to show dialogs
        NgbModule, // for tooltips
        MnSelectModule,
        NgxAceModule.forRoot(),
      ],
      exports: [
        QwBucketDisplay,
        QwCollectionMenu,
        QwDocEditorDialog,
        QwErrorDialog,
        QwExplainViz,
        QwJsonChart,
        QwJsonDataTableComp,
        QwJsonTableEditor2,
        QwJsonTree,
        QwNoticeDialog,
        QwSchemaDisplay,
      ],
      entryComponents: {
      },
      providers: [
        QwCollectionsService,
        QwConstantsService,
        QwFixLongNumberService,
        QwMetadataService,

        QwDialogService,
        QwHttp,
        QwJsonCsvService,
        QwQueryService,
        // Compiler is not included in AOT-compiled bundle.
        // Must explicitly provide compiler to be able to compile templates at runtime.
        { provide: COMPILER_OPTIONS, useValue: {}, multi: true },
        { provide: CompilerFactory, useClass: JitCompilerFactory, deps: [COMPILER_OPTIONS] },
        { provide: Compiler, useFactory: createCompiler, deps: [CompilerFactory] }
      ]
    })
  ]}
}

export function createCompiler(compilerFactory) {
  return compilerFactory.createCompiler();
}
