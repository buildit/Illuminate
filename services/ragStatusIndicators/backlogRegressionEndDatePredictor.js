const { linearRegression } = require('simple-statistics');
const moment = require('moment');
const dataStore = require('../datastore/mongodb');
const constants = require('../../util/constants');
const { omit, toPairs, merge } = require('ramda');

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

      const targetDate = moment(project.endDate, dbDateFormat);

      const [ doneStartDate, doneEndDate ] = getDataRange(demand, constants.JIRACOMPLETE);

      demand
      .map(summary => merge(summary, { projectDate: moment(summary.projectDate, dbDateFormat)}))
      .filter(summary => summary.projectDate.isSameOrAfter(doneStartDate) && summary.projectDate.isSameOrBefore(doneEndDate))
      .forEach(summary => {
        const x = summary.projectDate.unix();
        const yNotDone = toPairs(omit([constants.JIRACOMPLETE], summary.status))
        .reduce((count, pair) => count + pair[1], 0) || 0;
        if (yNotDone) {
          notDonePoints.push([x, yNotDone]);
        }
      });

      notDonePoints.sort((a, b) => a[0] < b[0] ? -1 : 1)

      const notDoneMB = linearRegression(notDonePoints);
      const xZero = - notDoneMB.b / notDoneMB.m;

      const estimatedCompletionDate = moment.unix(xZero);

      const returner = {
        name,
        expected: project.endDate,
        actual: estimatedCompletionDate.format(dbDateFormat),
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

function getDataRange(statusData, category) {
  const datesInCategory = statusData.filter(datapoint => datapoint.status[category])
    .map(datapoint => moment(datapoint.projectDate));
  const tomorrow = moment.utc().add(1, 'days').hours(0).minutes(0).seconds(0);
  const max = moment.max(datesInCategory);
  const returnedMax = max.isAfter(tomorrow) ? tomorrow : max;
  return [
    moment.min(datesInCategory),
    returnedMax,
  ];
}
