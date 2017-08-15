const backlogRegression = require('../services/statusIndicators/demand/backlogRegressionEndDatePredictor');
const dataStore = require('../services/datastore/mongodb');
const testConstants = require('./testConstants');
const constants = require('../util/constants');
const { CommonProjectStatusResult } = require('../util/utils');
const utils = require('../util/utils');
const moment = require('moment');
const R = require('ramda');
const CO = require('co');
const Should = require('should');

const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
const name = 'Backlog Regression End Date Predictor';
const dbDateFormat = 'YYYY-MM-DD';
const expectedDateFormat = 'MMM DD, YYYY';

describe('Rag Status Indicators - Backlog Regression End Date Predictor', () => {
  it('returns red when the projected end date is after the project end date', () => {
    return CO(function* foo() {
      const startDate = moment().utc().subtract(10, 'weeks').format(dbDateFormat);
      const endDate = moment().utc().add(5, 'weeks');
      const target = moment().utc().add(15, 'weeks').format(expectedDateFormat);
      const entryData = [
        { weeksAgo: 5, count: 100 },
        { weeksAgo: 0, count: 75 },
      ];
      yield insertDemand(entryData);
      const result = yield backlogRegression.evaluate(createProjectWithDates(startDate, endDate.format(dbDateFormat)), url);
      Should(result).match(CommonProjectStatusResult(name, target, endDate.format(expectedDateFormat), constants.STATUSERROR, constants.DEMANDSECTION));
    });
  });

  it('returns amber when the projected end date is on the project end date', () => {
    return CO(function* foo() {
      const startDate = moment().utc().subtract(10, 'weeks').format(dbDateFormat);
      const endDate = moment().utc().add(5, 'weeks');
      const entryData = [
        { weeksAgo: 5, count: 100 },
        { weeksAgo: 0, count: 50 },
      ];
      yield insertDemand(entryData);
      const result = yield backlogRegression.evaluate(createProjectWithDates(startDate, endDate.format(dbDateFormat)), url);
      Should(result).match(CommonProjectStatusResult(name, endDate.format(expectedDateFormat), endDate.format(expectedDateFormat), constants.STATUSWARNING, constants.DEMANDSECTION));
    });
  });

  it('returns green when the projected end date is before the project end date', () => {
    return CO(function* foo() {
      const startDate = moment().utc().subtract(4, 'weeks').format(dbDateFormat);
      const endDate = moment().utc().add(1, 'weeks');
      const targetDate = moment().utc().subtract(1, 'weeks').format(expectedDateFormat);
      const entryData = [
        { weeksAgo: 4, count: 75 },
        { weeksAgo: 3, count: 50 },
      ];
      yield insertDemand(entryData);
      const result = yield backlogRegression.evaluate(createProjectWithDates(startDate, endDate.format(dbDateFormat)), url);
      Should(result).match(CommonProjectStatusResult(name, targetDate, endDate.format(expectedDateFormat), constants.STATUSOK, constants.DEMANDSECTION));
    });
  });
});

function insertDemand(entryData) {
  const entries = entryData.reduce((array, entry) => {
    const status = distributeIncompleteTasks(entry.count);
    status.Done = getRandomInt(10, 20);
    const projectDate = moment().utc().subtract(entry.weeksAgo, 'weeks').format('YYYY-MM-DD');
    array.push({
      projectDate,
      status,
    });
    return array;
  }, []);
  const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
  return dataStore.wipeAndStoreData(url, constants.SUMMARYDEMAND, entries);
}

function createProjectWithDates(startDate, endDate) {
  return {
    name: 'testProject',
    startDate,
    endDate,
  };
}

function distributeIncompleteTasks(count) {
  const possibleStatuses = ['Backlog', 'Selected for development', 'Ready for Demo', 'In Progress'];
  const starter = possibleStatuses.reduce((object, key) => {
    object[key] = 0;
    return object;
  }, {});

  return R.range(0, count)
  .reduce((object) => {
    const index = getRandomInt(0, possibleStatuses.length - 1);
    object[possibleStatuses[index]]++;
    return object;
  }, starter);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}