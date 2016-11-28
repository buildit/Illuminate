'use strict'

const Config = require('config');
const constants = require('../util/constants');
const jira = require('./defectSystem/jira');
const Log4js = require('log4js');
const utils = require('../util/utils');
const R = require('ramda');

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
  var upsertFunction = processingInfo.storageFunction;
  var updatedInfo = JSON.parse(JSON.stringify(processingInfo)); // this does a deep copy on purpose
  updatedInfo.rawLocation = constants.RAWDEFECT;
  updatedInfo.commonLocation = constants.COMMONDEFECT;
  updatedInfo.summaryLocation = constants.SUMMARYDEFECT;
  updatedInfo.eventSection = constants.DEFECTSECTION;
  updatedInfo.storageFunction = upsertFunction;
  logger.debug(`configured demand proceessing info ${JSON.stringify(updatedInfo)}`);
  return updatedInfo;
}

exports.rawDataProcessor = function(defectData) {
  if (R.isNil(defectData) || R.isEmpty(defectData)) {
    logger.debug('UNKNOWN DEMAND SYSTEM ');
    logger.debug(defectData);
    return null;
  } else {
    switch(defectData.source.toUpperCase()) {
        case 'JIRA':
          return jira;
        default:
          return null;
    }
  }
}


exports.transformCommonToSummary = function(commonData, processingInstructions) {
  logger.info(`mapCommonDataToSummary for ${commonData.length} records`);

  var datedData = [];

  commonData.forEach(function (storySummary) {
    storySummary.history.forEach(function (aStatusChange) {
      var endDate = (R.isNil(aStatusChange.changeDate)) ? processingInstructions.endDate : aStatusChange.changeDate;
      var daysDifference = utils.createDayArray(aStatusChange.startDate, endDate);
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

  var defectStatusByDay = [];
  datedData.forEach(function (aDayInTime) {
    var statusSummary = datedData[aDayInTime];
    var datedStatus = {projectDate: aDayInTime, status: statusSummary};
    defectStatusByDay.push(datedStatus);
  });

  return defectStatusByDay;
}
