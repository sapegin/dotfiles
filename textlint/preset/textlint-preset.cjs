module.exports = {
  rules: {
    apostrophe: require('../../../_/raccoon-textlint/rules/apostrophe').default,
    diacritics: require('../../../_/raccoon-textlint/rules/diacritics').default,
    misspellings: require('../../../_/raccoon-textlint/rules/misspellings')
      .default,
    quotes: require('../../../_/raccoon-textlint/rules/quotes').default,
    'stop-words': require('../../../_/raccoon-textlint/rules/stop-words')
      .default,
    terminology: require('../../../_/raccoon-textlint/rules/terminology')
      .default,
  },
  rulesConfig: {
    apostrophe: true,
    diacritics: true,
    misspellings: true,
    quotes: true,
    'stop-words': {
      severity: 'warning',
      exclude: ['divide and conquer', 'we all know that', 'never say never'],
    },
    terminology: true,
  },
};
