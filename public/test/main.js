requirejs.config({
  paths: {
    'jquery': '../javascripts/lib/jquery',
    'asyncStorage': '../javascripts/lib/asyncStorage'
  },
  shim: {
    'jquery': {
      exports: '$'
    },
    'asyncStorage': {
      exports: 'asyncStorage'
    }
  }
});

require(['require', 'lib/chai', 'lib/mocha'],
  function (require, chai) {

  assert = chai.assert;
  should = chai.should();
  expect = chai.expect;

  mocha.setup('bdd');

  require(
    ['test.note'],
    function (note) {
    mocha.run();
  });
});
