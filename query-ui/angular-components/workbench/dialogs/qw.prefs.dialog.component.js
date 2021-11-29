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
    var This = this;
    // we make a form group for only those options that need validation
    this.prefsForm = new FormGroup({
      max_parallelism: new FormControl(this.options.max_parallelism,
        [Validators.pattern("^[0-9]*$")]),
      query_timeout: new FormControl(this.options.query_timeout),
      transaction_timeout: new FormControl(this.options.transaction_timeout),
    });

    // dynamically create positional parameters and named parameters
    this.options.positional_parameters.forEach((paramVal,index) => This.addPosParam(index,paramVal));
    this.options.named_parameters.forEach((param,index) => This.addNamedParam(index,param.name,param.value));

    this.prefsForm.get('max_parallelism').valueChanges.subscribe(data => This.options.max_parallelism = data);
    this.prefsForm.get('query_timeout').valueChanges.subscribe(data => This.options.query_timeout = data);
    this.prefsForm.get('transaction_timeout').valueChanges.subscribe(data => This.options.transaction_timeout = data);
  }

  constructor(activeModal) {
    super();

    this.activeModal = activeModal;
  }

  // for iterating over the array of strings used for positional parameters, we need a track-by function
  trackByFn(index, item) {
    return(index);
  }

  // dynamically creating and removing positional and named parameters
  addPosParam(index,val) {
    var This = this;
    if (typeof val === 'undefined')
      this.options.positional_parameters[index] = '';

    let controlName = 'position_' + index;
    this.prefsForm.addControl(controlName, new FormControl(val || '',[This.jsonValidator]));
    this.prefsForm.get(controlName).valueChanges.subscribe(data => This.options.positional_parameters[index] = data);
  }

  removePosParam() {
    let controlName = 'position_' + (this.options.positional_parameters.length - 1);
    this.prefsForm.removeControl(controlName);

    this.options.positional_parameters.splice(-1,1);
  }

  addNamedParam(index,name,val) {
    var This = this;
    if (typeof name === 'undefined')
      this.options.named_parameters[index] = {name:'',value:''};

    let controlName = 'names_' + index;
    this.prefsForm.addControl(controlName, new FormControl(name||''));
    this.prefsForm.get(controlName).valueChanges.subscribe(data => This.options.named_parameters[index].name = data);

    controlName = 'values_' + index;
    this.prefsForm.addControl(controlName, new FormControl(val||'',[This.jsonValidator]));
    this.prefsForm.get(controlName).valueChanges.subscribe(data => This.options.named_parameters[index].value = data);
  }

  removeNamedParam() {
    let index = this.options.named_parameters.length - 1;
    this.prefsForm.removeControl('names_' + index);
    this.prefsForm.removeControl('values_' + index);

    this.options.named_parameters.splice(-1,1);
  }

  // some of the fields require JSON input, so need a validator
  jsonValidator(control) {
    try {
      JSON.parse(control.value);
    }
    catch (e) {
      return { jsonInvalid: true };
    }

    return null;
  }

}
