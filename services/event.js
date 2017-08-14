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