'use strict'

const Config = require('config');
const constants = require('../util/constants');
const dataStore = require('./datastore/mongodb');
const errorHelper = require('./errors')
const harvest = require('./effortSystem/harvest');
const Log4js = require('log4js');
const utils = require('../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

// effortInfo = {
//   source: "Excel",
//   url: "",
//   project: "TestData1",
//   authPolicy: "None",
//   userData: "",
//   role: [
//       {name: "PM", groupWith: "BA"},
//       {name: "BA", groupWith: "PM"},
//       {name: "SD", groupWith: null}
//     ]};


exports.loadEffort = function(effortData, anEvent, processingInfo) {
  var aSystemEvent = null;
  logger.info(`loadEffort for project ${effortData.project} from ${effortData.source}`);
  logger.debug('anEvent');
  logger.debug(anEvent);
  logger.debug('processingInfo');
  logger.debug(processingInfo);

  configureProcessingInfo(processingInfo);
  module.exports.loadRawData(effortData, processingInfo)
    .then (function(commonDataFormat) {
      logger.debug('loadEffort -> loadRawData');
      logger.debug(commonDataFormat);
      dataStore.wipeAndStoreData(processingInfo.dbUrl, constants.COMMONEFFORT,  commonDataFormat)
        .then (function(response1) {
          logger.debug('loadEffort -> wipeAndStoreData Common Data');
          logger.debug(response1);
          dataStore.wipeAndStoreData(processingInfo.dbUrl, constants.SUMMARYEFFORT,  createSummaryData(commonDataFormat))
            .then (function (response2){
              logger.debug('loadEffort -> wipeAndStoreData Summary Data');
              logger.debug(response2);
              logger.debug('loadEffort -> success');
              aSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, `${commonDataFormat.length} records processed`);
              dataStore.processEventData(processingInfo.dbUrl, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
            }).catch(function(err) {
              logger.debug('loadEffort -> ERROR Summary Data');
              aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
              dataStore.processEventData(processingInfo.dbUrl, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
            });
        }).catch(function(err) {
          logger.debug('loadEffort -> ERROR Common Data');
          aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
          dataStore.processEventData(processingInfo.dbUrl, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
        });
    }).catch(function(err) {
      logger.debug('loadEffort -> ERROR Raw Data');
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
      dataStore.processEventData(processingInfo.dbUrl, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
    });
};

function configureProcessingInfo(processingInfo) {
  processingInfo.rawLocation = constants.RAWEFFORT;
  processingInfo.storageFunction = dataStore.upsertData;
}

exports.loadRawData = function(effortData, processingInfo) {
  return new Promise(function (resolve, reject) {
    switch(effortData.source.toUpperCase()) {
        case "HARVEST":
          harvest.loadTimeEntries(effortData, null, processingInfo)
            .then(function (commonDataStructure) {
              resolve (commonDataStructure);
            })
            .catch(function (reason) {
              logger.error(`Error getting time entries ${reason}`);
              reject (reason);
            });
            break;
        default:
          logger.debug(`loadEffort - Unknown Project System - ${effortData.source}`);
          reject (errorHelper.errorBody('Unknown', 'Unknown Project System ' + effortData.source));
    }
  });
}

const createSummaryData = data => {
    const objectResult = data.reduce((result, point) => {
        if (!result[point.day]) result[point.day] = { activity: {} }
        if (result[point.day].activity[point['role']]) {
            result[point.day].activity[point['role']] =
                result[point.day].activity[point['role']] + point['effort']
        } else {
            result[point.day].activity[point['role']] = point['effort']
        }
        return result
    }, {})
    return Object.keys(objectResult).map(date => ({
        projectDate: date,
        activity: objectResult[date].activity
    }))
};
