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
import { MnLifeCycleHooksToStream } from '/ui/app/mn.core.js';

import { CommonModule } from '/ui/web_modules/@angular/common.js';

import { Subject } from '/ui/web_modules/rxjs.js';

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
      inputs: ['label','initialSelection','disabled','callback'],
      outputs: ['onSelection']
    })
  ]}

  static get parameters() { return [
    ChangeDetectorRef,
    QwCollectionsService
  ] }

  constructor(changeDetectorRef,qwCollectionsService) {
    super();
    this.cdr = changeDetectorRef;
    this.qwCollectionsService = qwCollectionsService;
    this.onSelection = new EventEmitter();

    // current menu selection
    this.selected_bucket = "";
    this.selected_scope = "";
    this.selected_collection = "";

    // current known buckets, scopes, collections
    this.buckets = [];
    this.scopes = {};      // scopes and collections indexed by bucket name
    this.collections = {};

    this.scopes_subject = new Subject();
    this.collections_subject = new Subject();
  }

  ngOnInit() {
    if (this.initialSelection) {
      this.selected_bucket = this.initialSelection.selected_bucket;
      this.selected_scope = this.initialSelection.selected_scope;
      this.selected_collection = this.initialSelection.selected_collection;
    }
    this.qwCollectionsService.refreshBuckets().then(meta => this.bucketListChangedCallback(meta));
  }

  ngAfterViewInit() {
  }

  // update the scopes and collections menus when they change
  update_scopes_collections_menu() {
    this.scopes_subject.next(this.selected_bucket ? this.scopes[this.selected_bucket] : []);
    this.collections_subject.next(this.getCollections());
  }

  //
  // notify when a new collection is selected
  //

  notifyChange() {
    var allSelected = this.selected_bucket && this.selected_scope && this.selected_collection;
    var selection = {
      bucket: allSelected ? this.selected_bucket : null,
      scope: allSelected ? this.selected_scope : null,
      collection: allSelected ? this.selected_collection : null,
    };

    this.onSelection.next(selection);

    // onSelection doesn't work with AngularJS, use callback instead
    if (this.callback)
      this.callback(selection);
  }

  //
  // callbacks whenever the qwCollectionsService gives us updated buckets, scopes, or collections
  //

  bucketListChangedCallback(meta) {
    this.buckets = meta.buckets;
    this.scopes = this.scopes;
    this.collections = meta.collections;
    // if our previously selected bucket has been removed, reset
    if (this.selected_bucket && this.buckets.indexOf(this.selected_bucket) == -1)
      this.selected_bucket = "";
    // if we don't have a selected bucket, use the first in the list (if any)
    if (this.buckets.length > 0 && !this.selected_bucket)
      this.selected_bucket = this.buckets[0];
    else if (this.buckets.length == 0)
      this.selected_bucket = "";

    this.update_scopes_collections_menu();
    this.errors = meta.errors.length ? JSON.stringify(meta.errors) : null;

    if (this.selected_bucket)
      this.qwCollectionsService.getScopesForBucket(this.selected_bucket).then(meta => this.scopeListChangedCallback(meta));
    else
      this.notifyChange();
  }

  scopeListChangedCallback(meta) {
    this.buckets = meta.buckets;
    this.scopes = meta.scopes;
    this.collections = meta.collections;

    this.errors = meta.errors.length ? JSON.stringify(meta.errors) : null;

    if (!this.selected_bucket || !this.scopes[this.selected_bucket] || !this.collections[this.selected_bucket]) {
      this.selected_scope = "";
      this.selected_collection = "";
      this.notifyChange();
      return;
    }

    // if we don't have a scope, or didn't see it in the list, use the first one from the list
    if (this.scopes[this.selected_bucket] && this.scopes[this.selected_bucket].length &&
      (!this.selected_scope ||
        this.scopes[this.selected_bucket].indexOf(this.selected_scope) < 0))
      this.selected_scope = this.scopes[this.selected_bucket][0];

    // make sure we have collections to work with
    if (!this.selected_scope || !this.collections[this.selected_bucket] ||
      !this.collections[this.selected_bucket][this.selected_scope])
      return;

    var collections = this.collections[this.selected_bucket][this.selected_scope];

    // if we don't have a collection, or didn't see it in the list, use the first one from the list
    if (collections.length && // we have at least 1 collection in the list
      (!this.selected_collection || // no current collection, or collection not in list
        collections.indexOf(this.selected_collection) < 0))
      this.selected_collection = collections[0];

    this.update_scopes_collections_menu();

    this.notifyChange();
  }


  //
  // functions called whenever the user selects a new item from one bucket, scope, or collection menu
  //
  // when the user selects a new bucket, get the scopes and collections for that bucket
  // (unless there is no specified bucket, and reset everything
  //

  bucketChanged(event) {
    this.selected_bucket = event.target.value;
    if (!event.target.value) {
      this.selected_scope = null;
      this.selected_collection = null;
      this.collections = {};
      this.scopes = {};
    } else {
      if (this.selected_bucket)
        this.qwCollectionsService.refreshScopesAndCollectionsForBucket(this.selected_bucket).then(meta => this.scopeListChangedCallback(meta));
    }

    this.update_scopes_collections_menu();
  }

  // when the scope changes, the model for the collections menu can change without
  // triggering a change in the underlying collection value. Make sure the value of
  // the selected_collection is on the list of current collections, otherwise set
  // the selected_collection to the first on the list
  scopeChanged(event) {
    this.selected_scope = event.target.value;

    if (!this.selected_scope)
      return;

    // if we have a scope, make sure to have an appropriate collection selected
    var collections = this.collections[this.selected_bucket][this.selected_scope];

    // if the selected collection is available we can just use it, so proceed if not found
    if (collections.indexOf(this.selected_collection) < 0) {
      if (collections.length > 0)
        this.selected_collection = collections[0];
      else
        this.selected_collection = "";
    }

    this.update_scopes_collections_menu();
    this.notifyChange();
  }

  collectionChanged(event) {
    this.selected_collection = event.target.value;

    this.notifyChange();
  }


  //
  // functions used in the HTML for getting the current lists of buckets, scopes, and collections
  //

  getCollections() {
    if (!this.selected_bucket || !this.selected_scope ||
      !this.collections[this.selected_bucket] ||
      !this.collections[this.selected_bucket][this.selected_scope])
      return [];

    return this.collections[this.selected_bucket][this.selected_scope];
  }

}
