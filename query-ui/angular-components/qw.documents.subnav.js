import { Component } from '/ui/web_modules/@angular/core.js';

class QwDocsSubNavComponent {
  static get annotations() {
    return [
      new Component({
        template: `
          <mn-element-cargo depot="subnav">
              <nav class="sub-nav">
                  <a uiSref="app.admin.docs.editor" uiSrefActive="selected">Document Editor</a>
                  <a uiSref="app.admin.docs.import" uiSrefActive="selected">Import Documents</a>
              </nav>
          </mn-element-cargo>
        `,
        selector: 'qw-docs-subnav',
      }),
    ];
  }
}

export { QwDocsSubNavComponent };
