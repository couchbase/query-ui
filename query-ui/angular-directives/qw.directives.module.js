import { NgModule, COMPILER_OPTIONS, CompilerFactory, Compiler } from '/ui/web_modules/@angular/core.js';
import { NgbModule, NgbModalModule, NgbModalConfig }             from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';
import { JitCompilerFactory }  from '/ui/web_modules/@angular/platform-browser-dynamic.js';
import { FormsModule }         from '/ui/web_modules/@angular/forms.js';
import { CommonModule }        from '/ui/web_modules/@angular/common.js';
import { MnSelectModule }      from '/ui/app/mn.select.module.js';

import { NgxAceModule }        from '/ui/libs/ace/@nowzoo/ngx-ace.js';

import { QwJsonDataTable }     from "./qw.json.datatable.directive.js";
import { QwJsonChart }         from "./qw.json.chart.component.js";
import { QwJsonTree }          from "./qw.json.tree.directive.js";
import { QwJsonTableEditor2 }  from "./qw.json.table.editor.directive.js";
import { QwExplainViz }        from "./qw.explain.viz.component.js";
import { QwCollectionMenu }    from "./qw.collection.menu.component.js"

import { QwDialogService }     from "./qw.dialog.service.js";
import { QwDocEditorDialog }   from "./dialogs/qw.doc.editor.dialog.component.js";
import { QwErrorDialog }       from "./dialogs/qw.error.dialog.component.js";
import { QwInputDialog }       from "./dialogs/qw.input.dialog.component.js";
import { QwNoticeDialog }      from "./dialogs/qw.notice.dialog.component.js";

// angularJS wrapped directives
import { QwJsonTableEditorDirective } from "./qw.wrapped.directives.js";


export { QwDirectivesModule };

class QwDirectivesModule {
  static get annotations() { return [
    new NgModule({
      declarations: [
        QwDocEditorDialog,
        QwCollectionMenu,
        QwErrorDialog,
        QwExplainViz,
        QwInputDialog,
        QwJsonChart,
        QwJsonDataTable,
        QwJsonTableEditor2,
        QwJsonTableEditorDirective,
        QwJsonTree,
        QwNoticeDialog,
      ],
      bootstrap: [ // need to include dialog components here
        QwCollectionMenu,
        QwDocEditorDialog,
        QwErrorDialog,
        QwInputDialog,
        QwJsonChart,
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
        QwCollectionMenu,
        QwDocEditorDialog,
        QwErrorDialog,
        QwExplainViz,
        QwJsonChart,
        QwJsonDataTable,
        QwJsonTableEditor2,
        QwJsonTableEditorDirective,
        QwJsonTree,
        QwNoticeDialog,
      ],
      entryComponents: {
//        QwDocEditorDialog,
//        QwErrorDialog,
//        QwJsonTableEditor2,
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
