const { linearRegression } = require('simple-statistics');
const moment = require('moment');
const dataStore = require('../../datastore/mongodb');
const constants = require('../../../util/constants');
const { CommonProjectStatusResult } = require('../../../util/utils');
const { omit, toPairs, merge } = require('ramda');
const name = 'Backlog Regression End Date Predictor';

module.exports = {
  evaluate(project, projectPath) {
    return dataStore.getAllData(projectPath, constants.SUMMARYDEMAND)
    .then(demand => {
      if (demand.length === 0) {
        return undefined;
      }

      const notDonePoints = [];

      const targetDate = moment(project.endDate, constants.DBDATEFORMAT);

      const [ doneStartDate, doneEndDate ] = getDataRange(demand, constants.JIRACOMPLETE);

      demand
      .map(summary => merge(summary, { projectDate: moment(summary.projectDate, constants.DBDATEFORMAT)}))
      .filter(summary => summary.projectDate.isSameOrAfter(doneStartDate) && summary.projectDate.isSameOrBefore(doneEndDate))
      .forEach(summary => {
        const x = summary.projectDate.unix();
        const yNotDone = toPairs(omit([constants.JIRACOMPLETE], summary.status))
        .reduce((count, pair) => count + pair[1], 0) || 0;
        if (yNotDone) {
          notDonePoints.push([x, yNotDone]);
        }
      });

      const notDoneMB = linearRegression(notDonePoints);
      const xZero = - notDoneMB.b / notDoneMB.m;

      const estimatedCompletionDate = moment.unix(xZero);

      const dateFormat = 'MMM DD, YYYY';
      
      const projected = moment(project.endDate, constants.DBDATEFORMAT).format(dateFormat);
      const actual = estimatedCompletionDate.format(dateFormat);
      let status = constants.STATUSWARNING;


      if (estimatedCompletionDate.isAfter(targetDate) || xZero < 0) {
        status = constants.STATUSERROR;
      } else if (estimatedCompletionDate.isBefore(targetDate)) {
        status = constants.STATUSOK;
      }
      return CommonProjectStatusResult(name, actual, projected, status, constants.DEMANDSECTION);
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