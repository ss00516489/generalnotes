define(['jquery', 'asyncStorage'],
  function($, asyncStorage) {

  'use strict';

  var body = $('body');
  var form = body.find('form');
  var currentUser;

  asyncStorage.getItem('personaUser', function (email) {
    currentUser = email;
    navigator.id.watch({
      loggedInUser: currentUser,
      onlogin: function (assertion) {
        $.post('/persona/verify', { assertion: assertion })
         .done(function (res, status, xhr) {
          asyncStorage.setItem('personaUser', res.email);
          document.location.href = '/';

        }).fail(function (res, status, xhr) {
          console.log('Login failed because ' + data.reason);
        });
      },
      onlogout: function() {
        $.post('/persona/logout')
         .done(function (res, status, xhr) {
          asyncStorage.removeItem('personaUser');
          document.location.href = '/';

        }).fail(function (res, status, xhr) {
          console.log('Logout failed because ' + data.reason);
        });
      }
    });
  });

  var drawNote = function (message, id) {
    return $('<li><p><span>' + message + '</span><a href="javascript:;" ' +
      'data-url="/note/' + id + '" data-action="delete" data-id="' + id +
      '" class="delete">x</a></p></li>');
  };

  var saveLocalNote = function (li, content) {
    if (content.length > 0) {
      var textArr = content.split(/\s|\n|\r/gi);
      var newText = [];

      for (var i = 0; i < textArr.length; i ++) {
        textArr[i] = textArr[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        if (textArr[i].match(/^http/i)) {
          newText.push('<a href="' + textArr[i] +'" target="_blank">' + textArr[i] + '</a>');
        } else {
          newText.push(textArr[i]);
        }
      }

      var rendered = newText.join(' ');

      asyncStorage.getItem('localNoteIds', function (noteIds) {
        if (!noteIds) {
          var noteIds = [];
        }

        var id = Math.round((new Date()).getTime() / 1000);

        noteIds.push(id);
        asyncStorage.setItem('localNoteIds', noteIds, function () {
          asyncStorage.setItem('note:local:' + id, {
            content: rendered,
            text: content
          }, function () {
            li = drawNote(rendered, id);
            body.find('ul').prepend(li);
            body.find('.cancel').click();
          });
        });
      });
    }
  };

  var postForm = function (callback) {
    var li;
    var content = form.find('textarea').val().trim();

    $.post('/', form.serialize(), function (data) {
      if (body.hasClass('authenticated-true')) {
        var id = parseInt(data.id, 10);

        asyncStorage.getItem('noteIds', function (noteIds) {
          if (!noteIds) {
            var noteIds = [];
          }

          noteIds.push(id);
          asyncStorage.setItem('noteIds', noteIds, function () {
            asyncStorage.setItem('note:' + id, data.text);
          });
        });

        li = drawNote(data.text, id);
      } else {
        saveLocalNote(li, content);
      }

      if (callback) {
        callback(data);
      }

    }).fail(function () {
      saveLocalNote(li, content);

    }).always(function () {
      if (content.length > 0 && li) {
        body.find('ul').append(li);
      }
      body.find('.cancel').click();
    });
  };

  var loadNotes = function () {
    asyncStorage.getItem('localNoteIds', function (noteIds) {
      if (noteIds) {
        for (var i = 0; i < noteIds.length; i ++) {
          var id = noteIds[i];
          asyncStorage.getItem('note:local:' + id, function (note) {
            body.find('ul').append(drawNote(note.text, id));
          });
        }
      }
    });

    asyncStorage.getItem('noteIds', function (noteIds) {
      if (noteIds) {
        for (var i = 0; i < noteIds.length; i ++) {
          var id = noteIds[i];
          asyncStorage.getItem('note:' + id, function (note) {
            body.find('ul').append(drawNote(note, id));
          });
        }
      }
    });
  };

  // upload client-side notes
  var syncNotes = function (count, noteIdLength, noteIds, rNoteIds, callback) {
    for (var i = 0; i < noteIds.length; i ++) {
      var id = noteIds[i];
      asyncStorage.removeItem('note:local:' + id);
      asyncStorage.getItem('note:local:' + id, function (note) {
        form.find('textarea').val(note.text);
        postForm(function (data) {
          // remove old item, push as new item
          rNoteIds.push(data.id);

          noteIds.splice(noteIds.indexOf(id));
          asyncStorage.setItem('note:' + data.id, data.text);
          asyncStorage.setItem('localNoteIds', noteIds);

          if (count === noteIdLength) {
            asyncStorage.removeItem('noteIds', function () {
              asyncStorage.setItem('noteIds', rNoteIds);
            });
          }

          count ++;
        });
      });
    }
  };

  $.get('/notes', function (data) {
    var count = 1;
    var sCount = 1;

    asyncStorage.getItem('noteIds', function (rNoteIds) {
      if (!rNoteIds) {
        var rNoteIds = [];
      }

      console.log('checking server');
      for (var i = 0; i < data.notes.length; i ++) {
        var id = parseInt(data.notes[i].id, 10);
        var text = data.notes[i].text;
        console.log(data.notes)
        asyncStorage.setItem('note:' + id, text);
        if (rNoteIds.indexOf(id) === -1) {
          rNoteIds.push(id);
        }

        if (sCount === data.notes.length) {
          asyncStorage.setItem('noteIds', rNoteIds);

          asyncStorage.getItem('localNoteIds', function (noteIds) {
            var noteIdLength = noteIds.length;
            syncNotes(count, noteIdLength, noteIds, rNoteIds);
          });
        }

        body.find('ul').append(drawNote(text, id));

        sCount ++;
      }
    });

  }).fail(function (data) {
    loadNotes();
  });

  body.on('click', function (ev) {
    var self = $(ev.target);

    switch (self.data('action')) {
      case 'login':
        ev.preventDefault();
        navigator.id.request();
        break;

      case 'logout':
        ev.preventDefault();
        navigator.id.logout();
        break;

      case 'add':
        if (form.hasClass('hidden')) {
          form.removeClass('hidden');
          form.find('textarea').focus();
        } else {
          postForm();
        }
        break;

      case 'delete':
        var id = self.attr('data-id');
        $.post(self.attr('data-url'), function () {
          asyncStorage.removeItem('note:' + id);
          asyncStorage.getItem('noteIds', function (noteIds) {
            if (noteIds) {
              noteIds.splice(noteIds.indexOf(id));
              asyncStorage.setItem('noteIds', noteIds);
            }
          });
          asyncStorage.removeItem('note:local:' + id);
          asyncStorage.getItem('localNoteIds', function (noteIds) {
            if (noteIds) {
              noteIds.splice(noteIds.indexOf(id));
              asyncStorage.setItem('localNoteIds', noteIds);
            }
          });
        });

        self.closest('li').remove();
        break;

      case 'cancel':
        body.find('textarea').val('');
        form.addClass('hidden');
        break;
    }
  });

  body.on('keydown', function (ev) {
    if (ev.keyCode === 13 && (ev.ctrlKey || ev.metaKey)) {
      postForm();
    }
  });
});
