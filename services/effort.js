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

exports.configureProcessingInstructionsn = function(processingInfo) {
  var updatedInfo = JSON.parse(JSON.stringify(processingInfo)); // this does a deep copy on purpose
  updatedInfo.rawLocation = constants.RAWEFFORT;
  updatedInfo.commonLocation = constants.COMMONEFFORT;
  updatedInfo.summaryLocation = constants.SUMMARYEFFORT;
  updatedInfo.eventSection = constants.EFFORTSECTION;
  return updatedInfo;
}

exports.rawDataProcessor = function(effortData) {
  switch(effortData.source.toUpperCase()) {
      case "HARVEST":
        return harvest;
          break;
      default:
        return null;
  }
}

exports.transformCommonToSummary = function(commonData) {
  return createSummaryData(commmonData);
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
