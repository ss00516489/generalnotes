define(['jquery'],
  function($) {

  'use strict';

  var body = $('body');
  var form = body.find('form');
  var currentUser = localStorage.getItem('personaUser');

  body.on('click', '#login', function (ev) {
    ev.preventDefault();
    navigator.id.request();
  });

  body.on('click', '#logout', function (ev) {
    ev.preventDefault();
    navigator.id.logout();
  });

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
        localStorage.setItem('personaUser', res.email);
        document.location.href = '/dashboard';

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
        localStorage.removeItem('personaUser');
        document.location.href = '/';

      }).fail(function (res, status, xhr) {
        console.log('Logout failed because ' + data.reason);
      });
    }
  });

  var postForm = function () {
    $.post('/dashboard', form.serialize(), function (data) {
      var li = $('<li><p><span>' + data.message + '</span><a href="javascript:;" ' +
        'data-url="/note/' + data.id + '" class="delete">x</a></p></li>');
      body.find('ul').prepend(li);
      body.find('.cancel').click();

    }).fail(function () {
      console.log('error posting');
    });
  };

  body.on('click', '#add', function (ev) {
    if (form.hasClass('hidden')) {
      form.removeClass('hidden');
    } else {
      postForm();
    }
  });

  body.on('keydown', function (ev) {
    if (ev.keyCode === 13 && (ev.ctrlKey || ev.metaKey)) {
      postForm();
    }
  });

  body.on('click', '.delete', function (ev) {
    var self = $(this);
    $.post(self.attr('data-url'));
    self.closest('li').remove();
  });

  body.on('click', '.cancel', function (ev) {
    body.find('textarea').val('');
    form.addClass('hidden');
  });
});
