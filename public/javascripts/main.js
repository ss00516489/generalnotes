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

      asyncStorage.setItem('note:' + (new Date().getTime()), content);
      content = newText.join(' ');

      li = $('<li><p><span>' + content + '</span><a href="javascript:;" ' +
        'data-url="#" data-action="delete" class="delete">x</a></p></li>');
      body.find('ul').prepend(li);
      body.find('.cancel').click();
    }
  };

  var postForm = function () {
    var li;
    var content = form.find('textarea').val().trim();

    $.post('/', form.serialize(), function (data) {
      if (body.hasClass('authenticated-true')) {
        li = $('<li><p><span>' + data.message + '</span><a href="javascript:;" ' +
          'data-url="/note/' + data.id + '" data-action="delete" class="delete">x</a></p></li>');
      } else {
        saveLocalNote(li, content);
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

  // upload clientside notes
  var noteKey;
  var idx = localStorage.length;

  while (idx > -1) {
    noteKey = localStorage.key(idx);
    if (noteKey && noteKey.indexOf('note:') > -1) {
      form.find('textarea').val(localStorage.getItem(noteKey));
      postForm();
      asyncStorage.removeItem(noteKey);
    }

    idx --;
  }

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
