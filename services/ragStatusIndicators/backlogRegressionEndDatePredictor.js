const { linearRegression } = require('simple-statistics');
const moment = require('moment');
const dataStore = require('../datastore/mongodb');
const constants = require('../../util/constants');
const { omit, toPairs } = require('ramda');

const dbDateFormat = 'YYYY-MM-DD';
const name = 'Backlog Regression End Date Predictor';

module.exports = {
  evaluate(project, projectPath) {
    return dataStore.getAllData(projectPath, constants.SUMMARYDEMAND)
    .then(demand => {
      if (demand.length === 0) {
        return undefined;
      }

      const notDonePoints = [];

      const startDate = moment(project.startDate, dbDateFormat);
      const targetDate = moment(project.endDate, dbDateFormat);

      const doneKey = 'Done';
      demand
      .forEach(summary => {
        const summaryDate = moment(summary.projectDate, dbDateFormat);
        const x = summaryDate.diff(startDate, 'days');
        const yNotDone = toPairs(omit([doneKey], summary.status))
        .reduce((count, pair) => count + pair[1], 0) || 0;
        if (yNotDone) {
          notDonePoints.push([x, yNotDone]);
        }
      });

      const notDoneMB = linearRegression(notDonePoints);
      const xZero = - notDoneMB.b / notDoneMB.m;

      const estimatedCompletionDate = startDate.add(xZero, 'days');

      const returner = {
        name,
        target: project.endDate,
        value: estimatedCompletionDate.format(dbDateFormat),
      };

      if (estimatedCompletionDate.isAfter(targetDate) || xZero < 0) {
        returner.ragStatus = constants.RAGERROR;
      } else if (estimatedCompletionDate.isBefore(targetDate)) {
        returner.ragStatus = constants.RAGOK;
      } else {
        returner.ragStatus = constants.RAGWARNING;
      }
      return returner;
    });
  }
};
