define(['jquery', 'asyncStorage'],
  function($, asyncStorage) {
  'use strict';

  var Note = function () {
    var NOTE_IDS = 'noteIds';
    var LOCAL_IDS = 'localNoteIds';
    var LOCAL_NOTE = 'note:local:';
    var SYNC_NOTE = 'note:';

    this.offline = false;
    this.localIds = [];
    this.remoteIds = [];

    var body = $('body');
    var form = body.find('form');

    /**
     * Render the note.
     * If we are offline, don't render the delete link for synced notes.
     */
    this.draw = function (message, timestamp, id) {
      var local = '';
      var deletable = '<a href="javascript:;" ' + 'data-url="/note/' + id +
        '" data-action="delete" data-id="' + id + '" class="delete">x</a>';

      if (timestamp === id) {
        local = 'local';
      } else {
        if (this.offline) {
          deletable = '';
        }
      }

      return $('<li class="' + local + '" data-timestamp="' +
        timestamp + '"><p><span>' + message + '</span>' + deletable + '</p></li>');
    };

    /**
     * Save a local version of the note.
     */
    this.saveLocal = function (content, callback) {
      var self = this;

      if (content.length > 0) {
        var textArr = content.split(/[\s\n\r]/gi);
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
        var id = Math.round(Date.now() / 1000);

        if (this.localIds.indexOf(id) === -1) {
          this.localIds.push(id);

          var data = {
            content: rendered,
            timestamp: id,
            text: content
          };

          asyncStorage.setItem(LOCAL_IDS, this.localIds, function () {
            asyncStorage.setItem(LOCAL_NOTE + id, data, function () {
              body.find('ul.notes').append(self.draw(rendered, id, id));
              body.find('.cancel').click();

              if (callback) {
                callback(data);
              }
            });
          });
        } else {
          body.find('.cancel').click();

          if (callback) {
            callback();
          }
        }
      }
    };

    /**
     * Upload local notes to the server.
     */
    this.syncLocal = function (callback) {
      var self = this;
      var count = 0;
      var notesLength = this.localIds.length;
      var interval;

      interval = setInterval(function () {
        if (count < notesLength) {
          var id = parseInt(self.localIds[count], 10);

          asyncStorage.getItem(LOCAL_NOTE + id, function (n) {
            if (n) {
              form.find('textarea').val(n.text);
              form.find('input[name="timestamp"]').val(id);
              self.postForm(function (data) {
                if (data) {
                  if (self.remoteIds.indexOf(data.id) === -1) {
                    self.remoteIds.push(data.id);
                    self.remoteIds.sort();
                    self.drawSorted(data);
                  }
                }
              });
            }
          });

          asyncStorage.removeItem(LOCAL_NOTE + id);

        } else {
          asyncStorage.setItem(LOCAL_IDS, []);
          clearInterval(interval);
          if (callback) {
            callback();
          }
        }

        count ++;
      });
    };

    /**
     * Sort synced notes by id.
     */
    this.drawSorted = function (n) {
      var noteIdx = this.remoteIds.indexOf(n.id);
      var nextIdx = noteIdx + 1;
      var li = this.draw(n.text, n.timestamp, n.id);

      if (nextIdx && noteIdx > nextIdx) {
        body.find('ul.notes').append(li);
      } else {
        body.find('ul.notes').prepend(li);
      }
    };

    /**
     * Download remote notes.
     */
    this.syncServer = function (data, callback) {
      var self = this;
      var interval;
      var count = 0;
      var notesLength = data.notes.length;

      this.remoteIds = [];

      interval = setInterval(function () {
        if (count < notesLength) {
          var id = parseInt(data.notes[count].id, 10);
          var text = data.notes[count].text;
          var newNote = {
            id: id,
            timestamp: data.notes[count].timestamp,
            text:text
          };

          asyncStorage.setItem(SYNC_NOTE + id, newNote);

          if (self.remoteIds.indexOf(id) === -1) {
            self.remoteIds.push(id);
            self.remoteIds.sort();
          }

          self.drawSorted(newNote);

        } else {
          asyncStorage.setItem(NOTE_IDS, self.remoteIds);
          clearInterval(interval);
          if (callback) {
            callback();
          }
        }

        count ++;
      }, 1);
    };

    /**
     * Load all synced or local notes.
     */
    this.load = function (keyName, noteName) {
      var self = this;

      asyncStorage.getItem(keyName, function (noteIds) {
        if (noteIds) {
          noteIds.sort();
          for (var i = 0; i < noteIds.length; i ++) {
            var id = noteIds[i];
            self.get(noteName, noteIds[i]);
          }
        }
      });
    };

    /**
     * Add a new synced note.
     */
    this.add = function (data, callback) {
      var id = parseInt(data.id, 10);

      this.remoteIds.push(id);
      asyncStorage.setItem(NOTE_IDS, this.remoteIds, function () {
        asyncStorage.setItem(SYNC_NOTE + id, {
          id: id,
          text: data.text,
          timestamp: data.timestamp
        }, function () {
          if (callback) {
            callback();
          }
        });
      });
    };

    /**
     * Get local or synced note object.
     */
    this.get = function (noteName, id) {
      var self = this;

      asyncStorage.getItem(noteName + id, function (n) {
        if (n) {
          body.find('ul.notes').append(self.draw(n.content || n.text, n.timestamp, id));
        }
      });
    };

    /**
     * Delete local or synced note.
     */
    this.del = function (id, callback) {
      var self = this;
      var id = parseInt(id, 10);

      if (self.localIds.indexOf(id) > -1) {
        self.localIds.splice(self.localIds.indexOf(id), 1);
        asyncStorage.removeItem(LOCAL_NOTE + id);
        asyncStorage.setItem(LOCAL_IDS, self.localIds);

      } else if (self.remoteIds.indexOf(id) > -1) {
        self.remoteIds.splice(self.remoteIds.indexOf(id), 1);
        asyncStorage.removeItem(SYNC_NOTE + id);
        asyncStorage.setItem(NOTE_IDS, self.remoteIds);
      }

      if (callback) {
        callback();
      }
    };

    /**
     * Post note form to the server if online; otherwise
     * save locally.
     */
    this.postForm = function (callback) {
      var self = this;
      var li;
      var content = form.find('textarea').val().trim();

      $.post('/', form.serialize(), function (data) {
        if (!self.offline) {
          self.add(data);
          li = self.draw(data.text, data.timestamp, data.id);
        } else {
          li = self.saveLocal(content);
        }

        if (callback) {
          callback(data);
        }

      }).fail(function () {
        self.saveLocal(content, callback);

      }).always(function () {
        if (content.length > 0 && li) {
          body.find('ul.notes').append(li);
        }
        body.find('.cancel').click();

        if (callback) {
          callback();
        }
      });
    }
  };

  return Note;
});
