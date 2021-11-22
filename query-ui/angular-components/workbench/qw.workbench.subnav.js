/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { Component } from '@angular/core';

class QwWorkbenchSubNavComponent {
  static get annotations() {
    return [
      new Component({
        template: `
          <mn-element-cargo depot="subnav">
              <nav class="sub-nav">
                <a uiSref="app.admin.query.workbench" uiSrefActive="selected">Workbench</a>
                <a uiSref="app.admin.query.monitor" uiSrefActive="selected">Monitor</a>
                <a uiSref="app.admin.query.udf" uiSrefActive="selected">UDF</a>
              </nav>
          </mn-element-cargo>
        `,
        selector: 'qw-workbench-subnav',
      }),
    ];
  }
}

export { QwWorkbenchSubNavComponent };
