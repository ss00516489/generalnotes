define(['jquery', 'asyncStorage', 'note'],
  function($, asyncStorage, Note) {

  'use strict';

  var note = new Note();

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

  asyncStorage.getItem('noteIds', function (rNoteIds) {
    note.remoteIds = rNoteIds || [];

    asyncStorage.getItem('localNoteIds', function (noteIds) {
      note.localIds = noteIds || [];

      $.get('/notes', function (data) {
        note.syncLocal();
        note.syncServer(data);

      }).fail(function (data) {
        note.load('localNoteIds', 'note:local:');
        note.load('noteIds', 'note:');
      });
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
          note.postForm();
        }
        break;

      case 'delete':
        $.post(self.attr('data-url'), function () {
          note.del(self.attr('data-id'));
        });

        self.closest('li').remove();
        break;

      case 'cancel':
        body.find('textarea').val('');
        form.addClass('hidden');
        break;
    }
  });

  form.on('keydown', function (ev) {
    if (ev.keyCode === 13 && (ev.ctrlKey || ev.metaKey)) {
      note.postForm();
    }
  });
});
