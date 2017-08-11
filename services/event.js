const constants = require('../util/constants');
const dataStore = require('./datastore/mongodb');

const Moment = require('moment');
const Config = require('config');
const Log4js = require('log4js');
const CO = require('co');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

exports.processEventData = function (aSystemEvent, processingInstructions, eventId) {
  logger.debug(`PROCESS EVENT ${aSystemEvent} for section ${processingInstructions.eventSection}`);

  return CO(function* () {
    const updatedEvent = yield dataStore.updateDocumentPart(processingInstructions.dbUrl, constants.EVENTCOLLECTION, eventId, processingInstructions.eventSection, aSystemEvent)
    if (eventIsComplete(updatedEvent)) {
      logger.debug('EVENT COMPLETE');
      updatedEvent.endTime = Moment.utc().format();
      if (wasCompletedSuccessfully(updatedEvent)) {
        logger.debug('EVENT COMPLETE SUCCESSFULLY');
        updatedEvent.status = constants.SUCCESSEVENT;
      } else {
        logger.debug('EVENT COMPLETE in ERROR');
        updatedEvent.status = constants.FAILEDEVENT;
      }
      yield dataStore.upsertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [updatedEvent]);
    }

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



exports.processEventData2 = function (projectPath, collectionName, eventInfo, sectionName, documentToStore) {
  logger.debug(`PROCESS EVENT ${eventInfo} for section ${sectionName} in [${collectionName}] at URL ${projectPath}`);

  return new Promise(function (resolve, reject) {
    CO(function*() {
      var result = null;

      var db = getDBConnection(projectPath);
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
          tmpObj.endTime = Moment.utc().format();
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
      // db.close();
      resolve ();
    }).catch(function(err) {
      logger.error(err);
      reject (err);
    });
  });
}