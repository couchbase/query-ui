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
              </nav>
          </mn-element-cargo>
        `,
        selector: 'qw-workbench-subnav',
      }),
    ];
  }
}

export { QwWorkbenchSubNavComponent };
