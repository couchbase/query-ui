/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { Component } from '@angular/core';

class QwDocsSubNavComponent {
  static get annotations() {
    return [
      new Component({
        template: `
          <mn-element-cargo depot="subnav">
              <nav class="sub-nav">
                  <a uiSref="app.admin.docs.editor" uiSrefActive="selected">Workbench</a>
                  <a uiSref="app.admin.docs.import" uiSrefActive="selected">Import</a>
              </nav>
          </mn-element-cargo>
        `,
        selector: 'qw-docs-subnav',
      }),
    ];
  }
}

export { QwDocsSubNavComponent };
