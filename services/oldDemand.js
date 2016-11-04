'use strict'

const Config = require('config');
const constants = require('../util/constants');
const dataStore = require('./datastore/mongodb');
const errorHelper = require('./errors')
const jira = require('./demandSystem/jira');
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


exports.loadDemand = function(demandData, anEvent, processingInfo) {
  var aSystemEvent = null;
  logger.info(`loadDemand for project ${demandData.project} from ${demandData.source}`);
  logger.debug('anEvent');
  logger.debug(anEvent);
  logger.debug('processingInfo');
  logger.debug(processingInfo);

  configureProcessingInfo(processingInfo);
  module.exports.loadRawData(demandData, processingInfo, anEvent.since)
    .then (function(commonDataFormat) {
      logger.debug('loadDemand -> loadRawData');
      logger.debug(commonDataFormat);
      dataStore.wipeAndStoreData(processingInfo.dbUrl, constants.COMMONDEMAND,  commonDataFormat)
        .then (function(response1) {
          logger.debug('loadDemand -> wipeAndStoreData Common Data');
          logger.debug(response1);
          dataStore.wipeAndStoreData(processingInfo.dbUrl, constants.SUMMARYDEMAND,  this.createSummaryData(commonDataFormat))
            .then (function (response2){
              logger.debug('loadDemand -> wipeAndStoreData Summary Data');
              logger.debug(response2);
              logger.debug('loadDemand -> success');
              aSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, `${commonDataFormat.length} records processed`);
              dataStore.processEventData(processingInfo.dbUrl, constants.DEMANDCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
            }).catch(function(err) {
              logger.debug('loadDemand -> ERROR Summary Data');
              aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
              dataStore.processEventData(processingInfo.dbUrl, constants.DEMANDCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
            });
        }).catch(function(err) {
          logger.debug('loadDemand -> ERROR Common Data');
          aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
          dataStore.processEventData(processingInfo.dbUrl, constants.DEMANDCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
        });
    }).catch(function(err) {
      logger.debug('loadEffort -> ERROR Raw Data');
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
      dataStore.processEventData(processingInfo.dbUrl, constants.DEMANDCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
    });
};

function configureProcessingInfo(processingInfo) {
  processingInfo.rawLocation = constants.RAWDEMAND;
  processingInfo.storageFunction = dataStore.upsertData;
}

exports.loadRawData = function(demandData, processingInfo, sinceTime) {
  return new Promise(function (resolve, reject) {
    switch(demandData.source.toUpperCase()) {
        case "JIRA":
          jira.loadJiraDemand(demandData, processingInfo, sinceTime)
            .then(function (commonDataStructure) {
              resolve (commonDataStructure);
            })
            .catch(function (reason) {
              logger.error(`Error getting time entries ${reason}`);
              reject (reason);
            });
            break;
        default:
          logger.debug(`loadDemand - Unknown Project System - ${demandData.source}`);
          reject (errorHelper.errorBody('Unknown', 'Unknown Project System ' + demandData.source));
    }
  });
}

// const createSummaryData = data => {
//     const objectResult = data.reduce((result, point) => {
//         if (!result[point.day]) result[point.day] = { status: {} }
//         if (result[point.day].activity[point['role']]) {
//             result[point.day].activity[point['role']] =
//                 result[point.day].activity[point['role']] + point['effort']
//         } else {
//             result[point.day].activity[point['role']] = point['effort']
//         }
//         return result
//     }, {})
//     return Object.keys(objectResult).map(date => ({
//         projectDate: date,
//         activity: objectResult[date].activity
//     }))
// };
//

exports.createSummaryData = function (commonFormat) {
  logger.info(`createSummaryData for ${commonFormat.length} records`);

  var datedData = [];

  commonFormat.forEach(function (storySummary) {
    storySummary.history.forEach(function (aStatusChange) {
      var daysDifference = utils.createDayArray(aStatusChange.startDate, aStatusChange.changeDate);
      for (var i = 0; i < daysDifference.length; i++) {
        if (!(daysDifference[i] in datedData)) {
          datedData.push(daysDifference[i]);
          datedData[daysDifference[i]] = {};
        }
        var temp = datedData[daysDifference[i]];
        if (!(aStatusChange.statusValue in temp)) {
          temp[aStatusChange.statusValue] = 0;
        }
        temp[aStatusChange.statusValue]++;
      }
    });
  });

  var demandStatusByDay = [];
  datedData.forEach(function (aDayInTime) {
//    var statusSummary = JSON.parse(JSON.stringify(datedData[aDayInTime]));
    var statusSummary = datedData[aDayInTime];
    var datedStatus = {projectDate: aDayInTime, status: statusSummary};
    demandStatusByDay.push(datedStatus);
  });

  logger.debug('demandStatusByDay');
  logger.debug(demandStatusByDay);

  return demandStatusByDay;
}
