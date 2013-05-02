define(['jquery', 'asyncStorage'],
  function($, asyncStorage) {

  'use strict';

  var body = $('body');
  var form = body.find('form');

  var Note = function () {
    var self = this;

    this.localIds = [];
    this.remoteIds = [];

    this.draw = function (message, id) {
      if (message) {
        return $('<li><p><span>' + message + '</span><a href="javascript:;" ' +
          'data-url="/note/' + id + '" data-action="delete" data-id="' + id +
          '" class="delete">x</a></p></li>');
      }
    };

    this.saveLocal = function (content) {
      var self = this;

      if (content.length > 0) {
        var textArr = content.split(/\s|\n|\r/gi);
        var newText = [];

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

        var rendered = newText.join(' ');
        var id = Math.round((new Date()).getTime() / 1000);

        this.localIds.push(id);
        asyncStorage.setItem('localNoteIds', this.localIds, function () {
          asyncStorage.setItem('note:local:' + id, {
            content: rendered,
            text: content
          }, function () {
            body.find('ul').append(self.draw(rendered, id));
            body.find('.cancel').click();
          });
        });
      }
    };

    this.syncLocal = function () {
      console.log('uploading local notes');
      var self = this;
      var count = this.localIds.length;

      for (var i = 0; i < this.localIds.length; i ++) {
        var id = parseInt(this.localIds[i], 10);

        asyncStorage.getItem('note:local:' + id, function (n) {
          if (n) {
            form.find('textarea').val(n.text);
            self.postForm(function (data) {
              // remove old item, push as new item
              self.localIds.splice(self.localIds.indexOf(id), 1);

              if (count === self.localIds.length) {
                asyncStorage.removeItem('localNoteIds', function () {
                  asyncStorage.setItem('localNoteIds', self.localIds);
                });
              }
            });
          }
        });

        asyncStorage.removeItem('note:local:' + id);
        count --;
      }
    };

    this.syncServer = function (data) {
      console.log('checking server notes');
      var count = 1;

      for (var i = 0; i < data.notes.length; i ++) {
        var id = parseInt(data.notes[i].id, 10);
        var text = data.notes[i].text;

        asyncStorage.setItem('note:' + id, text);

        if (self.remoteIds.indexOf(id) === -1) {
          self.remoteIds.push(id);
        }

        if (count === data.notes.length) {
          asyncStorage.setItem('noteIds', self.remoteIds);
        }

        body.find('ul').append(this.draw(text, id));
        count ++;
      }
    };

    this.load = function (keyName, noteName) {
      var self = this;

      asyncStorage.getItem(keyName, function (noteIds) {
        if (noteIds) {
          for (var i = 0; i < noteIds.length; i ++) {
            var id = noteIds[i];
            self.get(noteName, noteIds[i]);
          }
        }
      });
    };

    this.add = function (data) {
      var id = parseInt(data.id, 10);

      this.remoteIds.push(id);
      asyncStorage.setItem('noteIds', this.remoteIds, function () {
        asyncStorage.setItem('note:' + id, data.text);
      });
    };

    this.get = function (noteName, id) {
      var self = this;

      asyncStorage.getItem(noteName + id, function (n) {
        if (n) {
          body.find('ul').append(self.draw(n.content || n, id));
        }
      });
    };

    this.delete = function (id) {
      var self = this;
      id = parseInt(id, 10);

      if (this.localIds.indexOf(id) > -1) {
        this.localIds.splice(this.localIds.indexOf(id), 1);
        asyncStorage.removeItem('note:local:' + id);
        asyncStorage.removeItem('localNoteIds', function () {
          asyncStorage.setItem('localNoteIds', self.localIds);
        });
      } else if (this.remoteIds.indexOf(id) > -1) {
        this.remoteIds.splice(this.remoteIds.indexOf(id), 1);
        asyncStorage.removeItem('note:' + id);
        asyncStorage.removeItem('noteIds', function () {
          asyncStorage.setItem('noteIds', self.remoteIds);
        });
      }
    };

    this.postForm = function (callback) {
      var self = this;
      var li;
      var content = form.find('textarea').val().trim();

      $.post('/', form.serialize(), function (data) {
        if (body.hasClass('authenticated-true')) {
          self.add(data);
          li = self.draw(data.text, data.id);
        } else {
          li = self.saveLocal(content);
        }

        if (callback) {
          callback(data);
        }

      }).fail(function () {
        self.saveLocal(content);

      }).always(function () {
        if (content.length > 0 && li) {
          body.find('ul').append(li);
        }
        body.find('.cancel').click();
      });
    }
  };

  return Note;
});
