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
    client.keys('notes:' + req.session.email + ':*', function (err, notes) {
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
          client.set('notes:' + req.session.email + ':' + id, newText.join(' '));
          res.redirect('/dashboard');
        }
      });
    } else {
      res.redirect('/dashboard');
    }
  });

  app.get('/note/:id', isLoggedIn, function (req, res) {
    client.del('notes:' + req.session.email + ':' + parseInt(req.params.id, 10), function (err, resp) {
      if (err) {
        throw new Error("Could not delete from a note you don't own");
      }
      res.redirect('/dashboard');
    });
  });
};
