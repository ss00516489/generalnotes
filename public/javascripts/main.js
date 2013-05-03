define(['jquery', 'asyncStorage', 'note'],
  function($, asyncStorage, Note) {
  'use strict';

  var note = new Note();

  var body = $('body');
  var form = body.find('form');
  var currentUser;

  /**
   * Persona login
   */
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

  /**
   * Get all local and remote notes.
   * If online, sync local and server notes; otherwise load whatever
   * indexedDB has.
   */
  asyncStorage.getItem('noteIds', function (rNoteIds) {
    note.remoteIds = rNoteIds || [];

    asyncStorage.getItem('localNoteIds', function (noteIds) {
      note.localIds = noteIds || [];

      $.get('/notes', function (data) {
        note.syncLocal();
        note.syncServer(data);

      }).fail(function (data) {
        note.offline = true;
        note.load('localNoteIds', 'note:local:');
        note.load('noteIds', 'note:');
      });
    });
  });

  /**
   * All click activity
   */
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
        note.del(self);
        self.closest('li').addClass('deleted');
        break;

      case 'cancel':
        body.find('textarea').val('');
        form.addClass('hidden');
        break;
    }
  });

  /**
   * Submit form on ctrl+enter or cmd+enter
   */
  form.on('keydown', function (ev) {
    if (ev.keyCode === 13 && (ev.ctrlKey || ev.metaKey)) {
      note.postForm();
    }
  });
});
