const demandVsProjected = require('../services/ragStatusIndicators/demandVsProjected');
const dataStore = require('../services/datastore/mongodb');
const testConstants = require('./testConstants');
const constants = require('../util/constants');
const moment = require('moment');
const utils = require('../util/utils');
const CO = require('co');
const Should = require('should');

describe('Rag Status Indicators - Demand Vs Projected', () => {
  const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
  const name = 'Demand vs. Projected';

  describe('First Piece of S curve', () => {
    const week = 1;
    const expectedComplete = 5;
    it('returns red when under the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete - 1, constants.RAGERROR));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete, constants.RAGWARNING));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete + 1, constants.RAGOK));
      });
    });
  });

  describe('Second Piece of S curve', () => {
    const week = 6;
    const expectedComplete = 35;
    it('returns red when under the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete - 1, constants.RAGERROR));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete, constants.RAGWARNING));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete + 1, constants.RAGOK));
      });
    });
  });

  describe('Third Piece of S curve', () => {
    const week = 14;
    const expectedComplete = 110;
    it('returns red when under the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete - 1, constants.RAGERROR));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete, constants.RAGWARNING));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(expected(name, expectedComplete, expectedComplete + 1, constants.RAGOK));
      });
    });
  });

  after(() => {
    return CO(function* after() {
      yield dataStore.clearData(url, constants.SUMMARYDEMAND);
    })
  })
});

function insertDemandSpecificDoneCountOf(desiredDoneCount) {
  const entries = [
    {
      projectDate: moment().format('YYYY-MM-DD'), 
      status: {
        Done: desiredDoneCount,
      },
    },
    {
     projectDate: moment().subtract(1, "days").format('YYYY-MM-DD'), 
      status: {
        Done: desiredDoneCount - 1,
      }, 
    }
  ];
  const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
  return dataStore.wipeAndStoreData(url, constants.SUMMARYDEMAND, entries);
}

function createProjectStartingWeeksAgo(numberOfWeeksAgo) {
  return {
    projection: {
      backlogSize: 100,
      darkMatterPercentage: 20,
      endIterations: 3,
      endVelocity: 5,
      iterationLength: 1,
      startDate: moment().subtract(numberOfWeeksAgo, 'weeks').format('YYYY-MM-DD'),
      startIterations: 5,
      startVelocity: 5,
      targetVelocity: 10,
    },
  };
}

function expected(name, target, value, ragStatus) {
  return { name, target, value, ragStatus}
}