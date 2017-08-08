'use strict'

const Config = require('config');
const constants = require('../util/constants');
const jira = require('./demandSystem/jira');
const trello = require('./demandSystem/trello');
const Log4js = require('log4js');
const utils = require('../util/utils');
const R = require('ramda');
const moment = require('moment');

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

exports.configureProcessingInstructions = function(processingInfo) {
  var updatedInfo = R.clone(processingInfo);
  updatedInfo.rawLocation = constants.RAWDEMAND;
  updatedInfo.commonLocation = constants.COMMONDEMAND;
  updatedInfo.summaryLocation = constants.SUMMARYDEMAND;
  updatedInfo.eventSection = constants.DEMANDSECTION;
  return updatedInfo;
}

exports.rawDataProcessor = function(demandData) {
  if (R.isNil(demandData) || R.isEmpty(demandData)) {
    logger.debug('UNKNOWN DEMAND SYSTEM ');
    logger.debug(demandData);
    return null;
  } else {
    switch(demandData.source.toUpperCase()) {
        case 'JIRA':
          return jira;
        case 'TRELLO':
          return trello;
        default:
          return null;
    }
  }
}


exports.transformCommonToSummary = function(commonData, processingInstructions) {
  logger.info(`mapCommonDataToSummary for ${commonData.length} records`);

  var datedData = {};

  commonData.forEach(function (aHistoryItem) {
    let previousKey;
    aHistoryItem.history.forEach(function (aStatusChange) {
      if (!aStatusChange.statusValue.startsWith(constants.JIRARELEASEFIELD)) {
        previousKey = aStatusChange.statusValue;
        const endDate = R.isNil(aStatusChange.changeDate)
                            ? processingInstructions.endDate : aStatusChange.changeDate;
        const daysDifference = utils.createDayArray(aStatusChange.startDate, endDate);

        daysDifference.forEach(date => {
          if (!datedData[date]) {
            datedData[date] = {};
          }
          const temp = datedData[date];
          if (!temp[aStatusChange.statusValue]) {
            temp[aStatusChange.statusValue] = 0;
          }
          temp[aStatusChange.statusValue]++;
        });
      } else {
        if (previousKey) {
          const endDate = processingInstructions.endDate;
          const daysDifference = utils.createDayArray(aStatusChange.startDate, endDate);

          daysDifference.forEach(date => {
            if (!datedData[date]) {
              datedData[date] = {};
            }
            const temp = datedData[date];
            if (!temp[previousKey]) {
              temp[previousKey] = 0;
            }
            temp[previousKey]++;
          });
        }
      }
    });
  });

  var demandStatusByDay = Reflect.ownKeys(datedData)
  .map(aDayInTime => ({ projectDate: aDayInTime, status: datedData[aDayInTime] }));

  return demandStatusByDay;
}
