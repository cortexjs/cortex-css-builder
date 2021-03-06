#!/usr/bin/env node

var shrink = require('cortex-shrinkwrap');
var path = require('path');
var semver = require('semver');
var cortexJson = require('read-cortex-json');
var Walker = require('./lib/walker');
var _ = require('underscore');
var events = require('events');
var util = require('util');

var builder = new events.EventEmitter();

builder.pickVersion = function (modules, callback) {
  var self = this;
  var conflict = false;
  var mods = {};
  for (var name in modules) {
    var module = modules[name];
    var versions = Object.keys(module);
    var version_to_choose = null;

    versions.forEach(function (version) {
      var v = semver.parse(version);
      if (!version_to_choose) {
        version_to_choose = version;
      } else {
        var parsed = semver.parse(version_to_choose);
        if (parsed.major == v.major) {
          // error
          conflict = true;
        } else if (parsed.minor == v.minor) {
          // warn
          self.emit("warn", util("multi minor version %s@%s <-> %s@%s", name, version, name, version_to_choose_raw));
          if (parsed.minor < v.minor) {
            version_to_choose = version;
          }
        }
      }
    });

    mods[name] = modules[name][version_to_choose];
    mods[name].version = version_to_choose;
  }
  if (conflict) {
    callback("multi major version!");
  } else {
    callback(null, mods);
  }
}

builder.get = function (options, callback) {
  var self = this;
  var cwd = options.cwd || process.cwd();
  var cache_root = options.cache_root


  cortexJson.enhanced(cwd, function (err, cortex_json) {
    if (err) {
      return callback(err);
    }
    var traveller = shrink.shrinktree(cortex_json, cache_root, {
      stableOnly: false
    }, function (err, tree) {
      if (err) {
        return callback(err);
      }

      var walker = new Walker(traveller);

      walker.walk(tree, function (err, modules) {
        if (err) {
          return callback(err);
        }


        self.pickVersion(modules, function (err, mods) {
          if (err) {
            return callback(err);
          }
          callback(null, mods);
        });
      });
    });
  });
}

module.exports = builder;