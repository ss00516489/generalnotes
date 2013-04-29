define(['jquery'],
  function($) {

  'use strict';

  var body = $('body');
  var form = body.find('form');

  body.on('click', '#login', function (ev) {
    ev.preventDefault();

    navigator.id.get(function (assertion) {
      if (!assertion) {
        return;
      }

      $.ajax({
        url: '/persona/verify',
        type: 'POST',
        data: { assertion: assertion },
        dataType: 'json',
        cache: false
      }).done(function(data) {
        if (data.status === 'okay') {
          document.location.href = '/dashboard';
        } else {
          console.log('Login failed because ' + data.reason);
        }
      });
    });
  });

  body.on('click', '#logout', function (ev) {
    ev.preventDefault();

    $.ajax({
      url: '/persona/logout',
      type: 'POST',
      dataType: 'json',
      cache: false
    }).done(function(data) {
      if (data.status === 'okay') {
        document.location.href = '/';
      } else {
        console.log('Logout failed because ' + data.reason);
      }
    });
  });

  body.on('click', '#add', function (ev) {
    if (form.hasClass('hidden')) {
      form.removeClass('hidden');
    } else {
      form.submit();
    }
  });

  body.on('click', '.cancel', function (ev) {
    form.addClass('hidden');
  });
});
