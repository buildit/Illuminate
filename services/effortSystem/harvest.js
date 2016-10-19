'use strict';

const Config = require('config');
const errorHelper = require('../errors');
const Log4js = require('log4js');
const R = require('ramda');
const Rest = require('restler');
const utils = require('../../util/utils');

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

const MILLENIUM = '2000-01-01';
const DEFAULTSTARTDATE = MILLENIUM+'+00:00';

exports.loadTimeEntries = function(effortInfo, processingInfo, sinceTime) {
  var startDate = (sinceTime) ? sinceTime : DEFAULTSTARTDATE;
  logger.info(`loadTimeEntries for ${effortInfo.project} updated since [${startDate}]`);

  return new Promise(function (resolve, reject) {
    module.exports.getTimeEntries(effortInfo, startDate)
      .then(function (timeData) {
        if (timeData.length < 1) {
          resolve([]);
        }
        logger.debug(`total time entries - ${timeData.length}`);
        module.exports.getTaskEntries(effortInfo)
          .then(function (taskData) {
            logger.debug(`total task entries - ${taskData.length}`);
            module.exports.replaceTaskIdwithName(timeData, taskData);
            processingInfo.storageFunction(processingInfo.dbUrl, processingInfo.rawLocation, timeData)
            .then (function () {
              resolve(module.exports.mapHarvestEffort(timeData));
            });
          })
          .catch(function (reason) {
            reject(reason);
          });
      })
      .catch(function (reason) {
        reject(reason);
      });
  });
};

exports.getTimeEntries = function(effortInfo, startDate) {
  logger.info(`getTimeEntries since ${startDate}`);

  var harvestURL = `${effortInfo.url}/projects/${effortInfo.project}/entries?from=${MILLENIUM}&to=${utils.dateFormatIWant(new Date())}&updated_since=${startDate}`;
  logger.debug(`harvestURL ${harvestURL}`);
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
        logger.debug('getTimeEntries - FAIL');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${data.errorMessages}`);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving time entries from Harvest'));
      }).on('error', function(data, response) {
        logger.debug('getTimeEntries - ERROR');
        logger.error(`FAIL: ${response.statusCode} - MESSAGE ${data.errorMessages}`);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving time entries from Harvest'));
      });
  });
}

exports.getTaskEntries = function(effortInfo) {
  logger.info('getTaskEntries');

  var harvestURL = `${effortInfo.url}/tasks`;
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

const makeCommon = ({day_entry}) => ({
  day: day_entry.spent_at,
  role: day_entry.task_name,
  effort: day_entry.hours
});

exports.mapHarvestEffort = function(timeData) {
  logger.info('mapHarvestEffort');

  return R.map(makeCommon, timeData);
}
