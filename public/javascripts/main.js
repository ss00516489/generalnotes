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
        $.ajax({
          url: '/persona/verify',
          type: 'POST',
          data: { assertion: assertion },
          dataType: 'json',
          cache: false
        }).done(function (res, status, xhr) {
          asyncStorage.setItem('personaUser', res.email);
          document.location.href = '/';

        }).fail(function (res, status, xhr) {
          console.log('Login failed because ' + data.reason);
        });
      },
      onlogout: function() {
        $.ajax({
          url: '/persona/logout',
          type: 'POST',
          dataType: 'json',
          cache: false
        }).done(function (res, status, xhr) {
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
      'data-url="/note/' + id + '" data-action="delete" class="delete">x</a></p></li>');
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

      asyncStorage.setItem('note:local:' + (new Date().getTime()), content);
      content = newText.join(' ');
      li = drawNote(content, 0);
      body.find('ul').prepend(li);
      body.find('.cancel').click();
    }
  };

  var postForm = function (callback) {
    var li;
    var content = form.find('textarea').val().trim();

    $.post('/', form.serialize(), function (data) {
      if (body.hasClass('authenticated-true')) {
        li = drawNote(data.message, data.id);
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
        body.find('ul').prepend(li);
      }
      body.find('.cancel').click();
    });
  };

  // upload client-side notes
  var noteKey;
  var idx;
  var uploadNotes;
  var loadLocalNotes;

  asyncStorage.length(function (length) {
    idx = length;

    uploadNotes = setInterval(function () {
      if (idx > -1) {
        asyncStorage.key(idx, function (noteKey) {
          console.log('** ', noteKey)
          if (noteKey && noteKey.indexOf('note:local:') > -1) {
            console.log('*** ', idx, noteKey)
            asyncStorage.getItem(noteKey, function (noteVal) {
              if (noteVal) {
                form.find('textarea').val(noteVal);
                postForm(function (data) {
                  console.log(data)
                  // remove old item, rename it as new item
                  asyncStorage.removeItem(noteKey);
                  asyncStorage.setItem('note:' + currentUser + ':' + data.id, data.message, function () {
                    body.find('ul').prepend(drawNote(data.message, data.id));
                  });
                });
              }
            });
          }
          idx --;
        });

      } else {
        clearInterval(uploadNotes);
      }
    }, 1);
  });

  $.get('/notes', function (data) {
    for (var i = 0; i < data.notes.length; i ++) {
      body.find('ul').prepend(drawNote(data.notes[i].text, data.notes[i].id));
    }

  }).fail(function (data) {
    asyncStorage.length(function (length) {
      idx = length;

      // offline, grab local version
      loadLocalNotes = setInterval(function () {
        if (idx > -1) {
          asyncStorage.key(idx, function (noteKey) {
            if (noteKey && noteKey.indexOf('note:') > -1) {
              asyncStorage.getItem(noteKey, function (noteVal) {
                body.find('ul').prepend(drawNote(noteVal, noteKey.split(':')[2]));
              });
            }
          });
        } else {
          clearInterval(loadLocalNotes);
        }
        idx --;
      }, 1);
    });
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
        $.post(self.attr('data-url'));
        if (currentUser) {
          console.log('deleted')
          asyncStorage.removeItem('note:' + currentUser + ':' + self.attr('data-url').split('/')[2]);
        }
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
