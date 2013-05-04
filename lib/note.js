'use strict';

exports.getAll = function (client, req, callback) {
  client.lrange('notes:' + req.session.email, 0, -1, function (err, notes) {
    if (err) {
      callback(err);

    } else {
      if (notes.length < 1) {
        callback(null, []);
      } else {
        var notesArr = [];

        notes.forEach(function (n) {
          client.hgetall(n, function (err, note) {
            if (err) {
              callback(new Error('Error getting note'));
            } else {
              notesArr.push(note);
            }

            if (notesArr.length === notes.length) {
              callback(null, notesArr);
            }
          });
        });
      }
    }
  });
};

exports.add = function (client, req, callback) {
  var textArr = req.body.text.trim().split(/[\s\n\r]/gi);
  var newText = [];

  if (textArr[0].length < 1) {
    callback(new Error('Note cannot be empty'));
  } else {
    for (var i = 0; i < textArr.length; i ++) {
      textArr[i] = textArr[i].replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;');

      if (textArr[i].match(/^http/i)) {
        newText.push('<a href="' + textArr[i] +'" target="_blank">' + textArr[i] + '</a>');
      } else {
        newText.push(textArr[i]);
      }
    }

    client.incr('notes:counter', function (err, id) {
      if (err) {
        callback(err);
      } else {
        var finalText = newText.join(' ');
        var keyName = 'notes:' + req.session.email + ':' + id;
        var timestamp = req.body.timestamp || Math.round(Date.now() / 1000);

        client.lpush('notes:' + req.session.email, keyName);
        client.hmset(keyName, {
          id: id,
          timestamp: timestamp,
          text: finalText
        });
        callback(null, {
          id: id,
          text: finalText,
          timestamp: timestamp
        });
      }
    });
  }
};

exports.del = function (client, req, callback) {
  var keyName = 'notes:' + req.session.email + ':' + parseInt(req.params.id, 10);

  client.hgetall(keyName, function (err, note) {
    if (err || !note) {
      callback(new Error('No note found'));
    } else {
      client.del(keyName);
      client.lrem('notes:' + req.session.email, 0, keyName);
      callback(null, true);
    }
  });
};
