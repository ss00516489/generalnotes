'use strict';

var note = require('../lib/note');

module.exports = function (app, client, nconf, isLoggedIn) {
  app.get('/', function (req, res) {
    var appcache = '';

    if (!nconf.get('debug')) {
      appcache = '/manifest.appcache';
    }
    res.render('index', {
      appcache: appcache
    });
  });

  app.get('/notes', function (req, res, next) {
    if (req.session.email) {
      note.getAll(client, req, function (err, notes) {
        if (err) {
          res.status(400);
          next(err);
        } else {
          res.json({ notes: notes });
        }
      });
    } else {
      res.status(400);
      res.json({ message: 'not logged in' });
    }
  });

  app.post('/', isLoggedIn, function (req, res, next) {
    if (req.body.text.trim().length > 0) {
      note.add(client, req, function (err, newNote) {
        if (err) {
          res.status(400);
          next(err);
        } else {
          res.json(newNote);
        }
      });
    } else {
      res.status(400);
      res.json({ message: false });
    }
  });

  app.post('/note/:id', isLoggedIn, function (req, res, next) {
    note.delete(client, req, function (err, resp) {
      if (err) {
        res.status(400);
        res.next(err);
      } else {
        res.json({ message: true });
      }
    });
  });

  app.get('/logout', function (req, res) {
    req.session.reset();
    res.redirect('/');
  });
};
