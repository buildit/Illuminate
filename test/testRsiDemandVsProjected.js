const demandVsProjected = require('../services/statusIndicators/demand/demandVsProjected');
const dataStore = require('../services/datastore/mongodb');
const testConstants = require('./testConstants');
const constants = require('../util/constants');
const { CommonProjectStatusResult } = require('../util/utils');
const moment = require('moment');
const utils = require('../util/utils');
const CO = require('co');
const Should = require('should');

describe('Rag Status Indicators - Demand Vs Projected', () => {
  const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
  const name = 'Demand vs Projected';

  describe('First Piece of S curve', () => {
    const week = 1;
    const expectedComplete = 5;
    
    it('returns red when under the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete - 1, expectedComplete, constants.STATUSERROR, constants.DEMANDSECTION));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete, expectedComplete, constants.STATUSWARNING, constants.DEMANDSECTION));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete + 1, expectedComplete, constants.STATUSOK, constants.DEMANDSECTION));
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
        Should(result).match(CommonProjectStatusResult(name, expectedComplete - 1, expectedComplete, constants.STATUSERROR, constants.DEMANDSECTION));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete, expectedComplete, constants.STATUSWARNING, constants.DEMANDSECTION));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete + 1, expectedComplete, constants.STATUSOK, constants.DEMANDSECTION));
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
        Should(result).match(CommonProjectStatusResult(name, expectedComplete - 1, expectedComplete, constants.STATUSERROR, constants.DEMANDSECTION));
      });
    });

    it('returns amber when right on the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete, expectedComplete, constants.STATUSWARNING, constants.DEMANDSECTION));
      });
    });
    
    it('returns green when above the curve', () => {
      return CO(function* foo() {
        yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
        const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week), url);
        Should(result).match(CommonProjectStatusResult(name, expectedComplete + 1, expectedComplete, constants.STATUSOK, constants.DEMANDSECTION));
      });
    });
  });

  describe('No ramp up (0 start iterations)', () => {

    describe('First piece of S curve', () => {
      const week = 2;
      const expectedComplete = 20;
      it('returns red when under the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete - 1, expectedComplete, constants.STATUSERROR, constants.DEMANDSECTION));
        });
      });

      it('returns amber when right on the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete, expectedComplete, constants.STATUSWARNING, constants.DEMANDSECTION));
        });
      });
      
      it('returns green when above the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete + 1, expectedComplete, constants.STATUSOK, constants.DEMANDSECTION));
        });
      });
    });

    describe('Second piece of S curve', () => {
      const week = 11;
      const expectedComplete = 110;
      it('returns red when under the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete  - 1);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete - 1, expectedComplete, constants.STATUSERROR, constants.DEMANDSECTION));
        });
      });

      it('returns amber when right on the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete, expectedComplete, constants.STATUSWARNING, constants.DEMANDSECTION));
        });
      });
      
      it('returns green when above the curve', () => {
        return CO(function* foo() {
          yield insertDemandSpecificDoneCountOf(expectedComplete + 1);
          const result = yield demandVsProjected.evaluate(createProjectStartingWeeksAgo(week, 0), url);
          Should(result).match(CommonProjectStatusResult(name, expectedComplete + 1, expectedComplete, constants.STATUSOK, constants.DEMANDSECTION));
        });
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
      projectDate: moment().utc().format('YYYY-MM-DD'), 
      status: {
        Done: desiredDoneCount,
      },
    },
    {
     projectDate: moment().utc().subtract(1, "days").format('YYYY-MM-DD'), 
      status: {
        Done: desiredDoneCount - 1,
      }, 
    }
  ];
  const url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
  return dataStore.wipeAndStoreData(url, constants.SUMMARYDEMAND, entries);
}

function createProjectStartingWeeksAgo(numberOfWeeksAgo, startIterations = 5) {
  return {
    projection: {
      backlogSize: 100,
      darkMatterPercentage: 20,
      endIterations: 3,
      endVelocity: 5,
      iterationLength: 1,
      startDate: moment().utc().subtract(numberOfWeeksAgo, 'weeks').format('YYYY-MM-DD'),
      startIterations,
      startVelocity: 5,
      targetVelocity: 10,
    },
  };
}