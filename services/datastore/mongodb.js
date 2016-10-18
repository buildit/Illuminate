'use strict'

const CO = require('co');
const Config = require('config');
const constants = require('../../util/constants');
const Log4js = require('log4js');
const MongoClient = require('mongodb');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

exportConstant('COMMONEFFORT', 'commonEffort');
exportConstant('SUMMARYEFFORT', 'dailyEffortSummary');

function exportConstant (name, value) {
    Object.defineProperty(exports, name, {
        value:      value,
        enumerable: true
    });
}

/* eslint-disable no-unused-vars */
exports.deepPing = function () {
  logger.debug('pingDeep - mongodb');

  var dbUrl = Config.get('datastore.dbUrl');

  return new Promise(function (resolve, reject) {
    MongoClient.connect(dbUrl, function(err, db) {
      if (err) {
        logger.error(`Error connecting to Mongo ${dbUrl}`);
        resolve(generateConnectionInformation(dbUrl, 'Unable to access the data store'));
      } else {
        var adminDb = db.admin();
        adminDb.buildInfo(function(err, info) {
          if (err) {
            logger.error(`Error connecting to Mongo ${dbUrl}`);
            resolve(generateConnectionInformation(dbUrl, 'Unable to access admin data store'));
          } else {
            resolve(generateConnectionInformation(dbUrl, info.version));
          }
        });
      }
    });
  });
}
/* eslint-enable no-unused-vars */

function generateConnectionInformation(url, version) {
  logger.debug(`DataStoreURL : ${url} - DataStoreVersion: ${version}`);
  return {DataStoreURL: url, DataStoreVersion: version};
}

exports.upsertData = function (projectPath, collectionName, documentToStore) {
  logger.info(`UPSERT ${documentToStore.length} documents in [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);

      documentToStore.forEach(function(anEntry) {
        col.findOneAndReplace({_id: anEntry._id}, anEntry, {upsert: true});
      });
      db.close();
      resolve ();
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}

exports.insertData = function (projectPath, collectionName, documentToStore) {
  logger.info(`INSERT ${documentToStore.length} documents in [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var response = col.insertMany(documentToStore);
      db.close();
      resolve (response);
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}

exports.getAllData = function (projectPath, collectionName) {
  logger.info(`GET ALL [${collectionName}] Entries at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var result = yield col.find().toArray();
      db.close();
      resolve (result);
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}

exports.getDocumentByName = function (projectPath, collectionName, aName) {
  logger.info(`GET By Name [${aName}] from [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var result = yield col.find({name: aName}).toArray();
      db.close();
      resolve (result[0]);
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}

exports.getDocumentByID = function (projectPath, collectionName, anID) {
  logger.info(`GET By ID [${anID}] from [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var result = yield col.find({_id: anID}).toArray();
      db.close();
      resolve (result[0]);
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}

exports.clearData = function (projectPath, collectionName) {
  logger.info(`DELETE [${collectionName}] Entries at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var result = yield col.deleteMany();
      db.close();
      resolve (result);
    }).catch(function(err) {
      reject (err);
    });
  });
}

exports.wipeAndStoreData = function (projectPath, aCollection, documentToStore) {
  logger.info(`WIPE and STORE ${documentToStore.length} documents in [${aCollection}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    module.exports.clearData(projectPath, aCollection)
      .then(function (response1) {
        logger.debug(response1);
        module.exports.insertData(projectPath, aCollection, documentToStore)
        .then(function (response2) {
          resolve(response2);
        })
      })
      .catch(function (reason) {
        reject(reason);
      });
  });
}

const eventIsComplete = anEvent =>
    ((anEvent.demand === null || anEvent.demand['completion'] != null)
  && (anEvent.defect === null || anEvent.defect['completion'] != null)
  && (anEvent.effort === null || anEvent.effort['completion'] != null));

const wasCompletedSuccessfully = anEvent =>
    ((anEvent.demand === null || anEvent.demand.status === constants.SUCCESSEVENT)
  && (anEvent.defect === null || anEvent.defect.status === constants.SUCCESSEVENT)
  && (anEvent.effort === null || anEvent.effort.status === constants.SUCCESSEVENT));

exports.processEventData = function (projectPath, collectionName, eventInfo, sectionName, documentToStore) {
  logger.info(`PROCESS EVENT ${sectionName} in [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var result = null;

      var db = yield MongoClient.connect(projectPath);
      var col = db.collection(collectionName);
      var options = {returnOriginal: false, upsert: true};
      if (sectionName === undefined || sectionName === null) {
        result = yield col.insert(eventInfo);
      } else {
        var setModifier = { $set: {} };
        setModifier.$set[sectionName] = documentToStore;

        result = yield col.findOneAndUpdate({_id: eventInfo._id}, setModifier, options);
        var tmpObj = result.value;

        if (eventIsComplete(tmpObj)) {
          logger.debug('EVENT COMPLETE');
          tmpObj.endTime = new Date().toJSON().toString();
          if (wasCompletedSuccessfully(tmpObj)) {
            logger.debug('EVENT COMPLETE SUCCESSFULLY');
            tmpObj.status = constants.SUCCESSEVENT;
          } else {
            logger.debug('EVENT COMPLETE in ERROR');
            tmpObj.status = constants.FAILEDEVENT;
          }
          result = yield col.findOneAndReplace({_id: eventInfo._id},
            tmpObj,
            options);
        }
      }
      db.close();
      resolve ();
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}
