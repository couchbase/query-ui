import { NgModule, COMPILER_OPTIONS, CompilerFactory, Compiler } from '/ui/web_modules/@angular/core.js';
import { NgbModule, NgbModalModule, NgbModalConfig }             from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';
import { JitCompilerFactory }  from '/ui/web_modules/@angular/platform-browser-dynamic.js';
import { FormsModule }         from '/ui/web_modules/@angular/forms.js';
import { CommonModule }        from '/ui/web_modules/@angular/common.js';

import { NgxAceModule }        from '/ui/web_modules/@nowzoo/ngx-ace.js';

import { QwJsonDataTable }     from "./qw.json.datatable.directive.js";
import { QwJsonTree }          from "./qw.json.tree.directive.js";
import { QwJsonTableEditor2 }  from "./qw.json.table.editor.directive.js";
import { QwExplainViz }        from "./qw.explain.viz.component.js";

import { QwDialogService }     from "./qw.dialog.service.js";
import { QwDocEditorDialog }   from "./dialogs/qw.doc.editor.dialog.component.js";
import { QwErrorDialog }       from "./dialogs/qw.error.dialog.component.js";
import { QwInputDialog }       from "./dialogs/qw.input.dialog.component.js";

// angularJS wrapped directives
import { QwJsonTableEditorDirective } from "./qw.wrapped.directives.js";


export { QwDirectivesModule };

class QwDirectivesModule {
  static get annotations() { return [
    new NgModule({
      declarations: [
        QwDocEditorDialog,
        QwErrorDialog,
        QwExplainViz,
        QwInputDialog,
        QwJsonDataTable,
        QwJsonTableEditor2,
        QwJsonTableEditorDirective,
        QwJsonTree
      ],
      bootstrap: [ // need to include dialog components here
        QwJsonTableEditor2,
        QwErrorDialog,
        QwDocEditorDialog,
        QwInputDialog,
        ],
      imports: [
        FormsModule,
        CommonModule,
        NgbModalModule, // needed to show dialogs
        NgbModule, // for tooltips
        NgxAceModule.forRoot(),
      ],
      exports: [
        QwDocEditorDialog,
        QwErrorDialog,
        QwExplainViz,
        QwJsonDataTable,
        QwJsonTableEditor2,
        QwJsonTableEditorDirective,
        QwJsonTree
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