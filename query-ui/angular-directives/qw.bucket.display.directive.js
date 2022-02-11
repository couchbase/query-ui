/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

/*
 * angular directive for showing the Couchbase bucket/scope/collection/schema hierarchy as an expanable tree
 */

import { Component, ElementRef, Renderer2 } from '@angular/core';

import { MnLifeCycleHooksToStream }         from 'mn.core';
import { MnPoolDefault }                    from 'ajs.upgraded.providers';

import { QwQueryService }                   from '../angular-services/qw.query.service.js';

import template                             from "./qw.bucket.display.html";

export { QwBucketDisplay };

class QwBucketDisplay extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        selector: "qw-bucket-display",
        template,
        styleUrls: ["/_p/ui/query/angular-directives/qw.json.chart.css"],
        inputs: [
          "bucket"
        ],
        //changeDetection: ChangeDetectionStrategy.OnPush
      })
    ]
  }

  static get parameters() {
    return [
      ElementRef,
      MnPoolDefault,
      QwQueryService,
      Renderer2,
    ]
  }

  constructor(element, mnPoolDefault, qwQueryService, renderer) {
    super();
    this.element = element;
    this.compat = mnPoolDefault.export.compat;
    this.renderer = renderer;
    this.qwQueryService = qwQueryService;
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  // called whenever the chart panel appears
  ngAfterViewInit() {
  }

  // toggle visibility of buckets in sidebar
  changeBucketExpanded(bucket) {
    var QwQueryService = this.qwQueryService;
    bucket.expanded = !bucket.expanded;
    QwQueryService.updateExpandedState();
    if (bucket.expanded)
      QwQueryService.updateBucketMetadata(bucket).then(() => QwQueryService.updateCountsForBucket(bucket));
  }

  // toggle scope visibility
  changeScopeExpanded(s) {
    s.expanded = !s.expanded;
    this.qwQueryService.updateExpandedState();
    if (s.expanded)
      this.qwQueryService.updateBucketCounts();
  }

  // toggle collection visibility
  changeCollectionExpanded(bucket,scope,collection) {
    collection.expanded = !collection.expanded;
    this.qwQueryService.updateExpandedState();
    if (collection.expanded && collection.schema.length == 0) {
      this.qwQueryService.getSchemaForBucket(bucket, scope, collection);
    }
  }

  // toggle collection index visibility
  toggleShowIndexes(collection) {
    collection.ShowIndexes = !collection.ShowIndexes;
  }

  getCollectionsForScope(bucket,scope) {
    var collList = bucket.collections.filter(collection => collection.scope == scope.id);
    return collList;
  };
}
