/*jshint expr:true */
'use strict';

var Pouch = require('pouchdb');
//var Readable = require('stream').Readable;
//var Writable = require('stream').Writable;

//
// your plugin goes here
//
var replicationStream = require('../');
Pouch.plugin(replicationStream.plugin);
Object.keys(replicationStream.adapters).forEach(function (adapterName) {
  var adapter = replicationStream.adapters[adapterName];
  Pouch.adapter(adapterName, adapter);
});

var chai = require('chai');
chai.use(require("chai-as-promised"));

//
// more variables you might want
//
chai.should(); // var should = chai.should();
var Promise = require('bluebird'); // var Promise = require('bluebird');

var dbs;
if (process.browser) {
  dbs = 'testdb' + Math.random() +
    ',http://localhost:5984/testdb' + Math.round(Math.random() * 100000);
} else {
  dbs = process.env.TEST_DB;
}

dbs.split(',').forEach(function (db) {
  var dbType = /^http/.test(db) ? 'http' : 'local';
  tests(db, dbType);
});

function tests(dbName, dbType) {

  var db;
  var remote;

  beforeEach(function () {
    db = new Pouch(dbName);
    return db.then(function () {
      remote = new Pouch(dbName + '_remote');
      return remote.then(function () {});
    });
  });

  afterEach(function () {
    return db.destroy().then(function () {
      return remote.destroy();
    });
  });

  describe(dbType + ': hello test suite', function () {

    it('should dump and load a basic db', function () {

      // TODO: don't use fs
      var fs = require('fs');
      var file = '/tmp/pouchdb-' + dbType + '-tmp.txt';
      function deleteFile() {
        return Promise.promisify(fs.unlink)(file).catch(function () {});
      }

      return deleteFile().then(function () {
        return db.bulkDocs([{}, {}, {}]);
      }).then(function () {
        var writeStream = fs.createWriteStream(file);
        return db.dump(writeStream);
      }).then(function () {
        var readStream = fs.createReadStream(file);
        return remote.load(readStream);
      }).then(function () {
        return remote.allDocs();
      }).then(function (res) {
        res.rows.should.have.length(3, '3 docs replicated');
      });
    });
  });

}
