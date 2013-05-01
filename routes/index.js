'use strict';

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

  app.get('/notes', function (req, res) {
    if (req.session.email) {
      client.lrange('notes:' + req.session.email, 0, -1, function (err, notes) {
        if (err) {
          res.status(400);
          res.json({ message: err });

        } else {
          if (notes.length < 1) {
            res.json({ notes: [] });
          } else {
            var notesArr = [];

            notes.forEach(function (n) {
              client.get(n, function (err, noteItem) {
                if (err) {
                  throw new Error('Error getting note');
                } else {
                  var nDetail = {
                    id: n.split(':')[2],
                    text: noteItem
                  };
                  notesArr.push(nDetail);
                }

                if (notesArr.length === notes.length) {
                  res.json({ notes: notesArr });
                }
              });
            });
          }
        }
      });
    } else {
      res.status(400);
      res.json({ message: 'not logged in' });
    }
  });

  app.post('/', isLoggedIn, function (req, res) {
    if (req.body.text.trim().length > 0) {
      var textArr = req.body.text.trim().split(/\s|\n|\r/gi);
      var newText = [];

      for (var i = 0; i < textArr.length; i ++) {
        textArr[i] = textArr[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (textArr[i].match(/^http/i)) {
          newText.push('<a href="' + textArr[i] +'" target="_blank">' + textArr[i] + '</a>');
        } else {
          newText.push(textArr[i]);
        }
      }

      client.incr('notes:counter', function (err, id) {
        if (err) {
          throw new Error('Error creating note id');

        } else {
          var finalText = newText.join(' ');
          var keyName = 'notes:' + req.session.email + ':' + id;

          client.lpush('notes:' + req.session.email, keyName);
          client.set(keyName, finalText);
          res.json({ text: finalText, id: id });
        }
      });
    } else {
      res.status(400);
      res.json({ message: false });
    }
  });

  app.post('/note/:id', isLoggedIn, function (req, res) {
    var keyName = 'notes:' + req.session.email + ':' + parseInt(req.params.id, 10);

    client.del(keyName);
    client.lrem('notes:' + req.session.email, 0, keyName);
    res.json({ message: true });
  });

  app.get('/logout', function (req, res) {
    req.session.reset();
    res.redirect('/');
  });
};
