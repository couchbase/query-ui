class QwDocEditorService {}
const QwDocEditorServiceProvider = {
  provide: QwDocEditorService,
  useFactory: function QwDocEditorServiceFactory(i) {
    return i.get('qwDocEditorService');
  },
  deps: ['$injector']
};

let qwUpgradedProviders = [
  QwDocEditorServiceProvider,
];

export {
  qwUpgradedProviders,
  QwDocEditorService,
};
