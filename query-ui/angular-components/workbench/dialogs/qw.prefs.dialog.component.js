import {MnLifeCycleHooksToStream}           from 'mn.core';
import {NgbActiveModal}                     from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation}       from '@angular/core';
import { CommonModule }                     from '@angular/common';
import {FormControl, FormGroup, Validators} from '@angular/forms';

export { QwPrefsDialog };

class QwPrefsDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-components/workbench/dialogs/qw.prefs.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: [],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      ];
  }

  ngOnInit() {
    this.prefsForm = new FormGroup({
      max_parallelism: new FormControl(this.options.max_parallelism,
        [Validators.pattern("^[0-9]*$")]),
      query_timeout: new FormControl(this.options.query_timeout),
      transaction_timeout: new FormControl(this.options.transaction_timeout),
    });

    var This = this;
    this.prefsForm.get('max_parallelism').valueChanges.subscribe(data => This.options.max_parallelism = data);
    this.prefsForm.get('query_timeout').valueChanges.subscribe(data => This.options.query_timeout = data);
    this.prefsForm.get('transaction_timeout').valueChanges.subscribe(data => This.options.transaction_timeout = data);
  }

  constructor(activeModal) {
    super();

    this.activeModal = activeModal;
  }

}
