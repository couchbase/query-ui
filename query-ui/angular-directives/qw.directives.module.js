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
import { QwJsonDataTable,
  QwJsonDataTableComp }        from "./qw.json.datatable.directive.js";
import { QwJsonChart }         from "./qw.json.chart.component.js";
import { QwJsonTree }          from "./qw.json.tree.directive.js";
import { QwJsonTableEditor2 }  from "./qw.json.table.editor.directive.js";
import { QwSchemaDisplay }     from "./qw.schema.display.directive.js";

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
        QwJsonDataTable,
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
        QwJsonDataTable,
        QwJsonDataTableComp,
        QwJsonTableEditor2,
        QwJsonTree,
        QwNoticeDialog,
        QwSchemaDisplay,
      ],
      entryComponents: {
      },
      providers: [
        QwDialogService,
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
