import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
    ViewEncapsulation,
    ChangeDetectorRef}             from '@angular/core';

import ace                            from 'ace/ace';

import { NgbModal }                from '@ng-bootstrap/ng-bootstrap';

import { BehaviorSubject }         from 'rxjs';

import { QwHistoryDialog }         from './dialogs/qw.history.dialog.component.js';

import { QwQueryWorkbenchService }          from '../../angular-services/qw.query.workbench.service.js';
import { QwMetadataService }       from "../../angular-services/qw.metadata.service.js";

export {QwQueryEditorComponent};


class QwQueryEditorComponent extends MnLifeCycleHooksToStream {
    static get annotations() {
        return [
            new Component({
                selector: "qw-query-editor-component",
                templateUrl: "../_p/ui/query/angular-components/workbench/qw.query.editor.html",
                //styleUrls: ["../../angular-directives/qw.directives.css"],
                encapsulation: ViewEncapsulation.None,
                inputs: [
                ],
            })
        ]
    }

    static get parameters() {
        return [
            NgbModal,
            QwHistoryDialog,
            QwMetadataService,
            QwQueryWorkbenchService,
        ];
    }

    constructor(
        modalService,
        qwHistoryDialog,
        qwMetadataService,
        qwQueryService) {
        super();

        this.qhd = qwHistoryDialog;
        this.qqs = qwQueryService;
        this.qms = qwMetadataService;
        this.result_subject = new BehaviorSubject();
        this.modalService = modalService;

        this.mode_n1ql = ace.require("ace/mode/n1ql");


    }

    ngOnInit() {
    }

    ngOnDestroy() {
    }

    // do something when the user clicks in the editor?
    handleClick(editor) {

    }

    prev() {
        this.qqs.prevResult();
        notify();
    }

    next() {
        this.qqs.nextResult();
        notify();
    }

    notify() {
        this.result_subject.next(this.qqs.getCurrentResult());
    }

    edit_history() {
        // bring up the dialog
        this.dialogRef = this.modalService.open(this.qhd);

        this.dialogRef.result.then(
            function ok(result) {
                if (result === 'run')
                    query(false);
            },
            function cancel() {});
    }

    handleClick() {

    }

    //
    // run a query
    //

    query(input) {
        this.qqs.exectueUserQuery(false,false);
    }

    //
    // initialize the query editor
    //

    aceInputLoaded(_editor) {
        this.inputEditor = _editor;

        _editor.setOptions({
            mode: 'ace/mode/n1ql',
            showGutter: true,
        });

        _editor.$blockScrolling = Infinity;
        _editor.setFontSize('13px');
        _editor.renderer.setPrintMarginColumn(false);
        //_editor.setReadOnly(qc.lastResult().busy);

        _editor.commands.addCommand({
            name: 'enterSpecial',
            bindKey: {win: 'Ctrl-Return',mac:'Ctrl-Return'},
            exec: this.insertReturn.bind(this),
            readOnly: true
        });

        _editor.commands.addCommand({
            name: 'enterSpecial2',
            bindKey: {win: 'Command-Return',mac:'Command-Return'},
            exec: this.insertReturn.bind(this),
            readOnly: true
        });

        _editor.commands.addCommand({
            name: 'enterSpecial3',
            bindKey: {win: 'Shift-Return',mac:'Shift-Return'},
            exec: this.insertReturn.bind(this),
            readOnly: true
        });

        if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
            _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

        // if they scroll the query window and it's not already of interest, make it so
        //_editor.getSession().on('changeScrollTop',function() {qc.setUserInterest('editor');});
        _editor.focus();

        //
        // make the query editor "catch" drag and drop files
        //

        //qc.editorElement.addEventListener('dragover',qc.handleDragOver,false);
        //qc.editorElement.addEventListener('drop',qc.handleFileDrop,false);
        //_editor.getSession().on("change", qc.aceInputChanged);
    }

    //
    // function for adding a carriage return to the query editor without tripping the
    // automatic return-after-semicolon-causes-query-to-execute
    //

    insertReturn(editor) {
        editor.ignoreCR = true; // make sure editor doesn't launch query
        this.inputEditor.insert('\n');
    }


    //
    // format the contents of the query field
    //

    format() {
        set_query(this.mode_n1ql.Instance.format(this.qqs.getCurrentResult().query,4));
    }

}