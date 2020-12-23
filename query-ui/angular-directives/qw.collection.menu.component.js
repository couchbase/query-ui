/**
 * Angular component for showing a menu to select a bucket, scope, and collection.
 */

import { ViewEncapsulation,
  Component,
  ElementRef,
  EventEmitter,
  NgModule,
  Renderer2 } from '/ui/web_modules/@angular/core.js';
import { MnLifeCycleHooksToStream } from '/ui/app/mn.core.js';

import { CommonModule } from '/ui/web_modules/@angular/common.js';

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
    QwCollectionsService
  ] }

  constructor(qwCollectionsService) {
    super();
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
  }

  ngOnInit() {
    if (this.initialSelection) {
      this.selected_bucket = this.initialSelection.selected_bucket;
      this.selected_scope = this.initialSelection.selected_scope;
      this.selected_collection = this.initialSelection.selected_collection;
    }
    this.qwCollectionsService.getBuckets().then(meta => this.bucketListChangedCallback(meta));
  }

  ngAfterViewInit() {
  }

  //
  // notify when a new collection is selected
  //

  notifyChange() {
    if (this.selected_bucket && this.selected_scope && this.selected_collection)
      this.onSelection.next({
        bucket: this.selected_bucket,
        scope: this.selected_scope,
        collection: this.selected_collection,
      });

    // onSelection doesn't work with AngularJS, use callback instead
    if (this.callback)
      this.callback({
        bucket: this.selected_bucket,
        scope: this.selected_scope,
        collection: this.selected_collection,
      });
  }

  //
  // callbacks whenever the qwCollectionsService gives us updated buckets, scopes, or collections
  //

  bucketListChangedCallback(meta) {
    var default_seen = false;
    this.buckets = meta.buckets;
    this.scopes = this.scopes;
    this.collections = meta.collections;
    if (this.buckets.length > 0 && !this.selected_bucket)
      this.selected_bucket = this.buckets[0];

    if (this.selected_bucket)
      this.qwCollectionsService.getScopesForBucket(this.selected_bucket).then(meta => this.scopeListChangedCallback(meta));
  }

  scopeListChangedCallback(meta) {
    this.buckets = meta.buckets;
    this.scopes = meta.scopes;
    this.collections = meta.collections;

    if (!this.selected_bucket)
      return;

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
        this.qwCollectionsService.getScopesForBucket(this.selected_bucket).then(meta => this.scopeListChangedCallback(meta));
    }
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

    this.notifyChange();
  }

  collectionChanged(event) {
    this.selected_collection = event.target.value;

    this.notifyChange();
  }


  //
  // functions used in the HTML for getting the current lists of buckets, scopes, and collections
  //

  getBuckets() {
    return this.buckets;
  }

  getScopes() {
    return this.selected_bucket ? this.scopes[this.selected_bucket] : [];
  }

  getCollections() {
    if (!this.selected_bucket || !this.selected_scope ||
      !this.collections[this.selected_bucket] ||
      !this.collections[this.selected_bucket][this.selected_scope])
      return [];

    return this.collections[this.selected_bucket][this.selected_scope];
  }

}
