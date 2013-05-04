define(['jquery', '../javascripts/note'],
  function ($, Note) {
  'use strict';

  var note = new Note();

  describe('Note', function () {
    after(function () {
      asyncStorage.clear();
    });

    beforeEach(function () {
      sinon.spy($, 'post');
    });

    afterEach(function () {
      $.post.restore();
    });

    it('should draw', function () {
      note.offline = true;
      var id = Math.round(Date.now() / 1000);
      var noteItem = note.draw('test', id, id);
      expect(noteItem.html()).to.equal('<p><span>test</span><a href="javascript:;" data-url="/note/' + id +
        '" data-action="delete" data-id="' + id + '" class="delete">x</a></p>');
    });

    it('should save', function (done) {
      note.saveLocal('http://test.com', function () {
        asyncStorage.getItem('note:local:' + note.localIds[0], function (n) {
          expect(n.text).to.equal('http://test.com');
          expect(n.content).to.equal('<a href="http://test.com" target="_blank">http://test.com</a>');
          done();
        });
      });
    });

    it('should add', function (done) {
      var timestamp = Math.round(Date.now() / 1000);
      note.add({
        id: 1,
        text: 'test',
        timestamp: timestamp
      }, function () {
        asyncStorage.getItem('note:1', function (n) {
          expect(n.text).to.equal('test');
          expect(n.timestamp).to.equal(timestamp);
          expect(n.id).to.equal(1);
          done();
        });
      });
    });

    it('should delete', function (done) {
      var timestamp = Math.round(Date.now() / 1000);
      note.add({
        id: 1,
        text: 'test',
        timestamp: timestamp
      }, function () {
        note.del(1, function () {
          asyncStorage.getItem('note:1', function (n) {
            expect(n).to.equal(null);
            done();
          });
        });
      });
    });

    it('should post the form', function (done) {
      note.postForm(function () {
        expect($.post.calledOnce).to.be.true;
        asyncStorage.getItem('localNoteIds', function (n) {
          expect(n.length).to.equal(1);
          done();
        });
      });
    });
  });
});
