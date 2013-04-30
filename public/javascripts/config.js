requirejs.config({
  deps: ['main'],
  paths: {
    'jquery': 'lib/jquery',
    'asyncStorage': 'lib/asyncStorage'
  },
  shim: {
    'jquery': {
      exports: 'jQuery'
    },
    'asyncStorage': {
      exports: 'asyncStorage'
    }
  }
});
