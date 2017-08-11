const demandVsProjected = require('./demandVsProjected');
const backlogRegressionEndDatePredictor = require('./backlogRegressionEndDatePredictor');

module.exports = {
  getStatuses(project, projectPath) {
    const statusIndicators = [];
    statusIndicators.push(demandVsProjected.evaluate(project, projectPath));
    statusIndicators.push(backlogRegressionEndDatePredictor.evaluate(project, projectPath));
    return Promise.all(statusIndicators).then(statuses => {
      return statuses.filter(status => status);
    });
  },
};
