// Язык портала приходит из Yandex Games SDK: ysdk.environment.i18n.lang.
// В V27 интерфейс игры русскоязычный, поэтому русский используется как fallback.
window.MONDAVOSHKA_I18N = {
  supported: ['ru'],
  fallback: 'ru',
  get portalLanguage() {
    return window.gameLanguage || 'ru';
  },
  get language() {
    return window.activeGameLanguage || 'ru';
  }
};
