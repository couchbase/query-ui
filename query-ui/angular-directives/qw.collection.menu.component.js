/**
 * Angular component for showing a menu to select a bucket, scope, and collection.
 */

import { ViewEncapsulation,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  NgModule,
  Renderer2 } from '/ui/web_modules/@angular/core.js';
import { MnLifeCycleHooksToStream }                    from '/ui/app/mn.core.js';
import { MnPoolDefault }                               from '/ui/app/ajs.upgraded.providers.js';
import { CommonModule }                                from '/ui/web_modules/@angular/common.js';
import { Subject, pipe }                               from '/ui/web_modules/rxjs.js';
import { takeUntil, distinctUntilChanged, pluck, filter } from '/ui/web_modules/rxjs/operators.js';
import { FormControl, FormGroup }                      from '/ui/web_modules/@angular/forms.js';

import {QwCollectionsService}   from '../angular-services/qw.collections.service.js';

export { QwCollectionMenu };

class QwCollectionMenu extends MnLifeCycleHooksToStream {
  static get annotations() { return [
    new Component({
      selector: "qw-collection-menu",
      templateUrl: "../_p/ui/query/angular-directives/qw.collection.menu.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      encapsulation: ViewEncapsulation.None,
      imports: [ CommonModule ],
      inputs: [
        'label',             // text to show above the menu
        'initialSelection',  // initial value to be selected
        'disabled',          // indicates whether menus should be disabled
        'callback',          // function to call whenever menus changed
        'allowEmpty',        // allow empty selection (default initial state for Import)
        'proxy'              // proxy to remote cluster to select remote collection
      ],
      outputs: ['onSelection']
    })
  ]}

  static get parameters() { return [
    ChangeDetectorRef,
    MnPoolDefault,
    QwCollectionsService
  ] }

  constructor(changeDetectorRef,mnPoolDefault,qwCollectionsService) {
    super();
    this.cdr = changeDetectorRef;
    this.qwCollectionsService = qwCollectionsService;
    this.onSelection = new EventEmitter();

    // current known buckets, scopes, collections
    this.buckets = [];
    this.scopes = {};      // scopes and collections indexed by bucket name
    this.collections = {};

    this.compat = mnPoolDefault.export.compat;

    this.scopes_subject = new Subject();
    this.collections_subject = new Subject();

    this.latestSelection = {};
  }

  ngOnInit() {
    // current menu selection
    let selectedBucket = "";
    let selectedScope = "";
    let selectedCollection = "";

    if (this.initialSelection) {
      selectedBucket = this.initialSelection.selected_bucket;
      if (this.compat.atLeast70) {
        selectedScope = this.initialSelection.selected_scope;
        selectedCollection = this.initialSelection.selected_collection;
      }
    }
    this.qwCollectionsService.refreshBuckets(this.proxy).then(meta => this.bucketListChangedCallback(meta));

    this.keyspaceForm = new FormGroup({
      bucketName: new FormControl({value: selectedBucket, disabled: this.disabled}),
      scopeName: new FormControl({value: selectedScope, disabled: this.disabled}),
      collectionName: new FormControl({value: selectedCollection, disabled: this.disabled})
    });

    this.keyspaceForm.get("bucketName").valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.mnOnDestroy))
      .subscribe(this.bucketChanged.bind(this));

    this.keyspaceForm.get("scopeName").valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.mnOnDestroy))
      .subscribe(this.scopeChanged.bind(this));

    this.keyspaceForm.get("collectionName").valueChanges
      .pipe(
        distinctUntilChanged(),
        takeUntil(this.mnOnDestroy))
      .subscribe(this.collectionChanged.bind(this));

    // Listening to onChanges is useful if 'disabled' input is dynamically changed.
    this.mnOnChanges
      .pipe(pluck("disabled", "currentValue"),
            filter(disabled => disabled !== undefined),
            takeUntil(this.mnOnDestroy))
      .subscribe(this.toggleEnableState.bind(this));
  }

  ngAfterViewInit() {
  }

  // update the scopes and collections menus when they change
  update_scopes_collections_menu() {
    let selectedBucket = this.keyspaceForm.get("bucketName").value;

    this.scopes_subject.next(selectedBucket ? this.scopes[selectedBucket] : []);
    this.collections_subject.next(this.getCollections());
  }

  //
  // notify when a new collection is selected
  //

  notifyChange() {
    let selectedBucket = this.keyspaceForm.get("bucketName").value;
    let selectedScope = this.keyspaceForm.get("scopeName").value;
    let selectedCollection = this.keyspaceForm.get("collectionName").value;

    var allSelected = selectedBucket &&
      (!this.compat.atLeast70 || this.pre70 || (selectedScope && selectedCollection));
    let newSelection = {
      bucket: allSelected ? selectedBucket : null,
      scope: allSelected ? selectedScope : null,
      collection: allSelected ? selectedCollection : null,
    };

    // call onSelection callback only if there is at least one modified value
    if (this.latestSelection.bucket !== newSelection.bucket ||
        this.latestSelection.scope !== newSelection.scope ||
        this.latestSelection.collection !== newSelection.collection) {
      this.latestSelection = newSelection;
      this.onSelection.next(newSelection);

      // onSelection doesn't work with AngularJS, use callback instead
      if (this.callback)
        this.callback(newSelection);
    }
  }

  //
  // callbacks whenever the qwCollectionsService gives us updated buckets, scopes, or collections
  //

  bucketListChangedCallback(meta) {
    this.buckets = meta.buckets;
    this.scopes = meta.scopes;
    this.collections = meta.collections;
    this.pre70 = meta.pre70;

    if (this.allowEmpty) {
      this.buckets = Array.from(this.buckets);
      this.buckets.unshift('');
    }

    // if our previously selected bucket has been removed, reset
    let selectedBucket = this.keyspaceForm.get("bucketName").value;
    if (selectedBucket && this.buckets.indexOf(selectedBucket) == -1)
      this.keyspaceForm.get("bucketName").setValue("");
    // if we don't have a selected bucket, use the first in the list (if any)
    if (this.buckets.length > 0 && !selectedBucket)
      this.keyspaceForm.get("bucketName").setValue(this.buckets[0]);
    else if (this.buckets.length == 0)
      this.keyspaceForm.get("bucketName").setValue("");

    this.update_scopes_collections_menu();
    this.errors = meta.errors.length ? JSON.stringify(meta.errors) : null;

    if (selectedBucket && !this.pre70)
      this.qwCollectionsService.getScopesForBucket(selectedBucket, this.proxy).then(meta => this.scopeListChangedCallback(meta));
    else
      this.notifyChange();
  }

  scopeListChangedCallback(meta) {
    this.buckets = meta.buckets;
    this.scopes = meta.scopes;
    this.collections = meta.collections;

    if (this.allowEmpty) {
      this.buckets = Array.from(this.buckets);
      this.buckets.unshift('');
    }

    this.errors = meta.errors.length ? JSON.stringify(meta.errors) : null;

    let selectedBucket = this.keyspaceForm.get("bucketName").value;
    let selectedScope = this.keyspaceForm.get("scopeName").value;
    let selectedCollection = this.keyspaceForm.get("collectionName").value;
    if (!selectedBucket || !this.scopes[selectedBucket] || !this.collections[selectedBucket]) {
      this.keyspaceForm.get("scopeName").setValue("");
      this.keyspaceForm.get("collectionName").setValue("");
      this.notifyChange();
      return;
    }

    // if we don't have a scope, or didn't see it in the list, use the first one from the list
    if (this.scopes[selectedBucket] && this.scopes[selectedBucket].length &&
      (!selectedScope ||
        this.scopes[selectedBucket].indexOf(selectedScope) < 0))
        this.keyspaceForm.get("scopeName").setValue(this.scopes[selectedBucket][0]);

    // make sure we have collections to work with
    if (!selectedScope || !this.collections[selectedBucket] ||
      !this.collections[selectedBucket][selectedScope])
      return;

    var collections = this.collections[selectedBucket][selectedScope];

    // if we don't have a collection, or didn't see it in the list, use the first one from the list
    if (collections.length && // we have at least 1 collection in the list
      (!selectedCollection || // no current collection, or collection not in list
        collections.indexOf(selectedCollection) < 0))
      this.keyspaceForm.get("collectionName").setValue(collections[0]);

    this.update_scopes_collections_menu();

    this.notifyChange();
  }


  //
  // functions called whenever the user selects a new item from one bucket, scope, or collection menu
  //
  // when the user selects a new bucket, get the scopes and collections for that bucket
  // (unless there is no specified bucket, and reset everything
  //

  bucketChanged(selectedBucket) {
    this.keyspaceForm.get("bucketName").setValue(selectedBucket);
    if (!selectedBucket) {
      this.keyspaceForm.get("scopeName").setValue(null);
      this.keyspaceForm.get("collectionName").setValue(null);
      this.collections = {};
      this.scopes = {};
      this.notifyChange();
    } else {
      if (selectedBucket && this.compat.atLeast70 && !this.pre70)
        this.qwCollectionsService.refreshScopesAndCollectionsForBucket(selectedBucket, this.proxy).then(meta => this.scopeListChangedCallback(meta));
      else
        this.notifyChange();
    }

    this.update_scopes_collections_menu();
  }

  // when the scope changes, the model for the collections menu can change without
  // triggering a change in the underlying collection value. Make sure the value of
  // the selected_collection is on the list of current collections, otherwise set
  // the selected_collection to the first on the list
  scopeChanged(selectedScope) {
    if (!selectedScope)
      return;

    // if we have a scope, make sure to have an appropriate collection selected
    var collections = this.collections[this.keyspaceForm.get("bucketName").value][selectedScope];
    let selectedCollection = this.keyspaceForm.get("collectionName").value;

    // if the selected collection is available we can just use it, so proceed if not found
    if (collections.indexOf(selectedCollection) < 0) {
      if (collections.length > 0)
        this.keyspaceForm.get("collectionName").setValue(collections[0]);
      else
        this.keyspaceForm.get("collectionName").setValue("");
    }

    this.update_scopes_collections_menu();
    this.notifyChange();
  }

  collectionChanged() {
    this.notifyChange();
  }


  //
  // functions used in the HTML for getting the current lists of buckets, scopes, and collections
  //

  getCollections() {
    let selectedBucket = this.keyspaceForm.get("bucketName").value;
    let selectedScope = this.keyspaceForm.get("scopeName").value;
    if (!selectedBucket || !selectedScope ||
      !this.collections[selectedBucket] ||
      !this.collections[selectedBucket][selectedScope])
      return [];

    return this.collections[selectedBucket][selectedScope];
  }

  toggleEnableState(disabled) {
    let method = disabled ? "disable" : "enable";
    this.keyspaceForm.get("bucketName")[method]({emitEvent: false});
    this.keyspaceForm.get("scopeName")[method]({emitEvent: false});
    this.keyspaceForm.get("collectionName")[method]({emitEvent: false});
  }

}
