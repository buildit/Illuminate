const constants = require('../util/constants');
const utils = require('../util/utils');
const dataStore = require('./datastore/mongodb');
const statusIndicators = require('./statusIndicators');

const Moment = require('moment');
const Config = require('config');
const Log4js = require('log4js');
const CO = require('co');
const R = require('ramda');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

exports.processEventData = function(aProject) {
  return function (aSystemEvent, processingInstructions, eventId) {
    logger.debug(`PROCESS EVENT for section ${processingInstructions.eventSection}`);

    return CO(function* () {
      const updatedEvent = yield dataStore.updateDocumentPart(
        processingInstructions.dbUrl,
        constants.EVENTCOLLECTION,
        eventId,
        processingInstructions.eventSection,
        aSystemEvent
      );
      if (eventIsComplete(updatedEvent)) {
        logger.debug('EVENT COMPLETE');
        updatedEvent.endTime = Moment.utc().format();
        if (wasCompletedSuccessfully(updatedEvent)) {
          updatedEvent.status = constants.SUCCESSEVENT;
          try {
            const statuses = yield statusIndicators.getStatuses(aProject, processingInstructions.dbUrl);
            yield module.exports.updateProjectStatus(aProject, processingInstructions.dbUrl, statuses);
            logger.debug('EVENT COMPLETE SUCCESSFULLY');
          } catch (error) {
            logger.debug('EVENT COMPLETE BUT ERROR POSTING STATUS');
            updatedEvent.status = constants.FAILEDEVENT;
          }
        } else {
          logger.debug('EVENT COMPLETE in ERROR');
          updatedEvent.status = constants.FAILEDEVENT;
        }
        yield dataStore.upsertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [updatedEvent]);
      }

    });
  }
}

const eventIsComplete = anEvent =>
    ((anEvent.demand === null || anEvent.demand['completion'] != null)
  && (anEvent.defect === null || anEvent.defect['completion'] != null)
  && (anEvent.effort === null || anEvent.effort['completion'] != null));

const wasCompletedSuccessfully = anEvent =>
    ((anEvent.demand === null || anEvent.demand.status === constants.SUCCESSEVENT)
  && (anEvent.defect === null || anEvent.defect.status === constants.SUCCESSEVENT)
  && (anEvent.effort === null || anEvent.effort.status === constants.SUCCESSEVENT));

exports.updateProjectStatus = function(aProject, projectPath, statuses) {
  function checkStatus(desiredStatus) {
    return (status) => status.status === desiredStatus;
  }
  const flattened = R.flatten(R.toPairs(statuses).map(system => system[1]));

  if (flattened.length > 0) {
    let color = constants.STATUSOK;
    if (flattened.some(checkStatus(constants.STATUSERROR))) {
      color = constants.STATUSERROR
    } else if (flattened.some(checkStatus(constants.STATUSWARNING))) {
      color = constants.STATUSWARNING;
    }
    return dataStore.updateDocumentPart(
      utils.dbCorePath(),
      constants.PROJECTCOLLECTION,
      aProject._id,
      constants.PROJECTSTATUSKEY,
      color
    )
    .then(() => dataStore.wipeAndStoreData(projectPath, constants.STATUSCOLLECTION, flattened))
    .catch(error => {
      logger.error('updateProjectStatus', error);
      throw error;
    });
  } else {
    return Promise.resolve();
  }
}