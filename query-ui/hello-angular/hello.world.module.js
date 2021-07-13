import { NgModule } from '/ui/web_modules/@angular/core.js';
import { UIRouterModule } from "/ui/web_modules/@uirouter/angular.js";
import { MnElementCraneModule } from '/ui/app/mn.element.crane.js';
import { FormsModule } from '/ui/web_modules/@angular/forms.js';
import { HelloWorldComponent } from './hello.world.component.js';
import { CommonModule }        from '/ui/web_modules/@angular/common.js';
import { QwDirectivesModule } from "../angular-directives/qw.directives.module.js";

import { NgxAceModule } from '/ui/web_modules/@nowzoo/ngx-ace.js';


let collectionsState = {
  url: '/hello_world',           // endpoint for this UI
  name: "app.admin.hello_world", // ui router address
  data: {
    title: "Hello World",        // appears in breadcrumbs in title bar
    compat: "atLeast70"          // Cheshire Cat
  },
  views: {
    "main@app.admin": {
      component: HelloWorldComponent // what component to show
    }
  }
};

export { HelloWorldModule };

class HelloWorldModule {
  static get annotations() { return [
    new NgModule({
      entryComponents: [
        HelloWorldComponent,
      ],
      declarations: [ // what components are declared in this?
        HelloWorldComponent,
      ],
      imports: [     // what imports do we need in this module?
        CommonModule,
        MnElementCraneModule,
        UIRouterModule.forChild({ states: [collectionsState] }),
        QwDirectivesModule,
        FormsModule,
        NgxAceModule.forRoot(),
      ],
      providers: [   // put any services we need in this list
      ]
    })
  ]}
}
