/*
 * angular directive for showing the Couchbase bucket/scope/collection/schema hierarchy as an expanable tree
 */

import { Component, ElementRef, Renderer2 } from '@angular/core';
import { MnLifeCycleHooksToStream }         from 'mn.core';
import _                                    from 'lodash';

export { QwSchemaDisplay };

class QwSchemaDisplay extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        selector: "qw-schema-display",
        templateUrl: "../_p/ui/query/angular-directives/qw.schema.display.html",
        styleUrls: ["/_p/ui/query/angular-directives/qw.json.chart.css"],
        inputs: [
          "schema",
          "path"
        ],
        //changeDetection: ChangeDetectionStrategy.OnPush
      })
    ]
  }

  static get parameters() {
    return [
      ElementRef,
      Renderer2,
    ]
  }

  constructor(element, renderer) {
    super();
    this.element = element;
    this.renderer = renderer;
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  // called whenever the chart panel appears
  ngAfterViewInit() {
  }

  showSamples(field) {
    // no samples for object or array types
    if (field.type == 'object' || field.type == 'array')
      return(null);

    if (_.isArray(field.samples)) {
      var result = "e.g., ";

      for (var i =0;i < 3 && i < field.samples.length; i++) {
        var value = field.samples[i];
        if (result.length > 6)
          result += ", ";

        if (_.isArray(value))
          result += JSON.stringify(value);
        else
          result += value;
      }

      return(result);
    }
    else
      return("");
  }

  showFieldType(field) {
    var result = "(" + field.type;

    // if it's an array of just one type, say it here
    if (field.type == 'array' && field.items) {
      if (field.items.type)
        result += " of " + field.items.type;
      else if (field.items.length > 0)
        result += " of subtypes";
      else
        result += " of object";
    }

    // if the field is indexed, say so
    if (field.indexed)
      result += ", indexed";

    result += ")";

    // for object fields, note that the subtype follows
    if (field.type == 'object')
      result += ", child type:";

    return(result);
  }
}
