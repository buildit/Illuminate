const moment = require('moment');
const dataStore = require('../datastore/mongodb');
const constants = require('../../util/constants');

module.exports = (project, projectPath) => {
  return dataStore.getAllData(projectPath, constants.SUMMARYDEMAND)
  .then(demand => {
    if (demand.length === 0) {
      return undefined;
    }
    const value = demand
    .sort((a, b) => a.projectDate < b.projectDate ? -1 : 1)
    .reduce((finalDone, summary) => summary.status.Done, undefined);

    const safeValue = value ? value : 0;

    const target = getTodaysStoryTarget(project);
    const returner = {
      name: 'Demand vs. Projected',
      target,
      value,
    };
    if (safeValue < target) {
      returner.ragStatus = constants.RAGERROR;
    } else if (safeValue > target) {
      returner.ragStatus = constants.RAGOK;
    } else {
      returner.ragStatus = constants.RAGWARNING;
    }
    return returner;
  });
}

function getTodaysStoryTarget ({ projection }) {
  const {
    backlogSize,
    darkMatterPercentage,
    endIterations,
    endVelocity,
    iterationLength,
    startDate,
    startIterations,
    startVelocity,
    targetVelocity,
  } = projection;

  const dailyIterationLength = iterationLength * 7;
  const dailyEndLength = endIterations * dailyIterationLength;
  const dailyEndVelocity = endVelocity / dailyIterationLength;
  const dailyStartLength = startIterations * dailyIterationLength;
  const dailyStartVelocity = startVelocity / dailyIterationLength;
  const dailyTargetVelocity = targetVelocity / dailyIterationLength;
  const middleStories = backlogSize * (1 + darkMatterPercentage / 100)
                      - startIterations * startVelocity
                      - endIterations * endVelocity;
  const dailyMiddleLength = Math.ceil(middleStories / targetVelocity) * dailyIterationLength;
  const totalLength = dailyStartLength + dailyMiddleLength + dailyEndLength;

  const today = moment();
  const momentStartDate = moment(startDate, 'YYYY-MM-DD');
  const dayNumber = today.diff(momentStartDate, 'days');

  function startPiece(day) {
    return Math.floor(dailyStartVelocity * day);
  }

  function middlePiece(day) {
    const m = dailyTargetVelocity;
    const x = dailyStartLength;
    const y = startPiece(x);
    const b = y - m * x;
    return Math.floor(m * day + b);
  }

  function endPiece(day) {
    const m = dailyEndVelocity;
    const x = dailyStartLength + dailyMiddleLength;
    const y = middlePiece(x);
    const b = y - m * x;
    return Math.floor(m * day + b);
  }
  if (dayNumber <= dailyStartLength) {
    return startPiece(dayNumber);
  }
  if (dayNumber > dailyStartLength && dayNumber <= totalLength - dailyEndLength) {
    return middlePiece(dayNumber); 
  }
  if (dayNumber  > totalLength - dailyEndLength) {
    return endPiece(dayNumber);
  }
}