'use strict';

const Config = require('config');
const constants = require('../../util/constants');
const errorHelper = require('../errors');
const HttpStatus = require('http-status-codes');
const Log4js = require('log4js');
const R = require('ramda');
const Rest = require('restler');
const moment = require('moment');
const utils = require('../../util/utils');
const ValidUrl = require('valid-url');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

//  Sample Data from Harvest
//
//  "task":
// {
//     "id": 5752604,
//     "name": "Bank Holiday",
//     "billable_by_default": false,
//     "created_at": "2016-03-22T12:02:12Z",
//     "updated_at": "2016-03-22T12:02:12Z",
//     "is_default": true,
//     "default_hourly_rate": 0,
//     "deactivated": false
// }
//
//
// "day_entry":
// {
//     "id": 439722386,
//     "notes": "Sheffeld co-lo, planning",
//     "spent_at": "2015-10-21",
//     "hours": 8,
//     "user_id": 1239662,
//     "project_id": 10284278,
//     "task_id": 5715688,
//     "created_at": "2016-03-15T17:00:48Z",
//     "updated_at": "2016-03-15T17:00:48Z",
//     "adjustment_record": false,
//     "timer_started_at": null,
//     "is_closed": false,
//     "is_billed": false
// }

//const MILLENIUM = '2000-01-01';
//const DEFAULTSTARTDATE = MILLENIUM+'+00:00';

exports.loadRawData = function(effortInfo, processingInfo, sinceTime) {
  logger.info(`loadRawData for ${effortInfo.project} updated since [${sinceTime}]`);
  logger.debug(`processing Instructions`);
  logger.debug(processingInfo);

  return new Promise(function (resolve, reject) {
    module.exports.getTimeEntries(effortInfo, sinceTime)
      .then(function (timeData) {
        if (timeData.length < 1) {
          resolve(timeData);
        }
        logger.debug(`total time entries - ${timeData.length}`);
        module.exports.getTaskEntries(effortInfo)
          .then(function (taskData) {
            module.exports.replaceTaskIdwithName(timeData, taskData);
            processingInfo.storageFunction(processingInfo.dbUrl, processingInfo.rawLocation, timeData)
            .then (function (allRawData) {
              resolve(allRawData); // return the number of records
            });
          })
          .catch(function (reason) {
            logger.error('loadRawData - ERROR');
            reject(reason);
          });
      })
      .catch(function (reason) {
        reject(reason);
      });
  });
};

const makeCommon = ({day_entry}) => ({
  day: day_entry.spent_at,
  role: day_entry.task_name,
  effort: day_entry.hours
});

exports.transformRawToCommon = function(timeData) {
  logger.info('mapHarvestEffort');

  return R.map(makeCommon, timeData);
}

exports.getTimeEntries = function(effortInfo, startDate) {
  logger.info(`getTimeEntries since ${startDate}`);

  var harvestURL = `${effortInfo.url}/projects/${effortInfo.project}/entries?from=${constants.DEFAULTSTARTDATE}&to=${utils.dateFormatIWant()}&updated_since=${startDate}+00:00`;
  logger.debug(`getTimeEntries->harvestURL ${harvestURL}`);
  return new Promise(function (resolve, reject) {
    Rest.get(encodeURI(harvestURL),
      {headers: utils.createBasicAuthHeader(effortInfo.userData)}
      ).on('complete', function(data, response) {

        if (response && response.statusCode !== 200){
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          reject(errorHelper.errorBody(response.statusCode, 'Error retrieving time entries from Harvest'));
        }

        if (data.length < 1) {
          logger.debug('no time entires available');
          resolve([]);
        } else {
          logger.debug(`time entries retrieved - ${data.length}`);

          resolve(data);
        }
      }).on('fail', function(data, response) {
        logger.debug('getTimeEntries -> FAIL');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${data.errorMessages}`);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving time entries from Harvest'));
      }).on('error', function(data, response) {
        logger.debug('getTimeEntries -> ERROR');
        logger.error(`ERROR: ${response}`);
        if (response === null) {
          reject(errorHelper.errorBody(HttpStatus.NOT_FOUND, 'Error retrieving time entries from Harvest'));
        } else {
          reject(errorHelper.errorBody(response.statusCode, 'Error retrieving time entries from Harvest'));
        }
      });
  });
}

exports.getTaskEntries = function(effortInfo) {
  logger.info('getTaskEntries');

  var harvestURL = `${effortInfo.url}/tasks`;
  logger.debug(`getTaskEntries->harvestURL ${harvestURL}`);
  return new Promise(function (resolve, reject) {
    Rest.get(harvestURL,
      {headers: utils.createBasicAuthHeader(effortInfo.userData)}
      ).on('complete', function(data, response) {

        if (response && response.statusCode !== 200){
          logger.error(`FAIL: ${response.statusCode} MESSAGE ${response.statusMessage}`);
          reject(errorHelper.errorBody(response.statusCode, 'Error retrieving task entries from Harvest'));
        }

        if (data.length < 1) {
          logger.debug('no task entires available');
          resolve([]);
        } else {
          logger.debug(`task entries retrieved - ${data.length}`);
          const availableTasks = {};
          data.forEach(function(aTask) {
            availableTasks[aTask.task.id] = aTask.task.name;
          });
          resolve(availableTasks);
        }
      }).on('fail', function(data, response) {
        logger.debug('getTaskEntries - FAIL');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${data.errorMessages}`);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving task entries from Harvest'));
      }).on('error', function(data, response) {
        logger.debug('getTaskEntries - ERROR');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${data.errorMessages}`);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving task entries from Harvest'));
      });
  });
}

exports.replaceTaskIdwithName = function(timeData, taskData) {
  logger.info('replaceTaskIdwithName');

  timeData.forEach(function(aTimeEntry) {
    aTimeEntry['_id'] = aTimeEntry.day_entry.id;
    aTimeEntry.day_entry['task_name'] = taskData[aTimeEntry.day_entry.task_id];
  });
}

exports.testEffort = function(project) {
  logger.debug(`Jira -> testEffort() for ${project.name}`);
  return new Promise(function (resolve) {
    if (!ValidUrl.isUri(project.effort.url)) {
      logger.debug(`ERROR, invalid url: ${project.effort.url} on project ${project.name}`)
      return resolve({ status: constants.STATUSERROR, data: `invalid effort URL [${project.effort.url}]` });
    }
    
    if (R.isNil(project.effort.project) || R.isEmpty(project.effort.project)) {
      return resolve({ status: constants.STATUSERROR, data: `[Project] must be a valid Jira project name` });
    }
    
    if (R.isNil(project.effort.authPolicy) || R.isEmpty(project.effort.authPolicy)) {
      return resolve({ status: constants.STATUSERROR, data: `[Auth Policy] must be filled out` });
    }
    
    if (R.isNil(project.effort.userData) || R.isEmpty(project.effort.userData)) {
      return resolve({ status: constants.STATUSERROR, data: `[User Data] must be filled out` });
    }
    
    if (R.isNil(project.effort.role) || R.isEmpty(project.effort.role)) {
      return resolve({ status: constants.STATUSERROR, data: `Missing [Role] information` });
    }
    
    var harvestURL = `${project.effort.url}/projects/${project.effort.project}/entries?from=${constants.DEFAULTSTARTDATE}&to=${utils.dateFormatIWant()}&updated_since=${moment().toISOString()}`;
    
    Rest.get(encodeURI(harvestURL),
      {headers: utils.createBasicAuthHeader(project.effort.userData)}
      ).on('complete', function() {
        resolve({ status: constants.STATUSOK });
      }).on('fail', function(data, response) {
        logger.debug("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
        resolve({ status: constants.STATUSERROR, data});
      }).on('error', function(data, response) {
        logger.debug("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
        resolve({ status: constants.STATUSERROR, data});
      });
  });
}
