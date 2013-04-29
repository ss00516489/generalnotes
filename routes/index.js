'use strict';

module.exports = function (app, client, isLoggedIn) {
  app.get('/', function(req, res) {
    if (req.session.email) {
      res.redirect('/dashboard');
    } else {
      res.render('index');
    }
  });

  app.get('/dashboard', isLoggedIn, function (req, res) {
    client.lrange('notes:' + req.session.email, 0, -1, function (err, notes) {
      if (err) {
        res.render('dashboard', { notes: [] });

      } else {
        if (notes.length < 1) {
          res.render('dashboard', { notes: [] });
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
                res.render('dashboard', { notes: notesArr });
              }
            });
          });
        }
      }
    });
  });

  app.post('/dashboard', isLoggedIn, function (req, res) {
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
          res.json({ message: finalText });
        }
      });
    } else {
      res.json({ message: false });
    }
  });

  app.post('/note/:id', isLoggedIn, function (req, res) {
    var keyName = 'notes:' + req.session.email + ':' + parseInt(req.params.id, 10);

    client.del(keyName);
    client.lrem('notes:' + req.session.email, 0, keyName);
    res.json({ message: true });
  });
};
