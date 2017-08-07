const demandVsProjected = require('./demandVsProjected');
const backlogRegressionEndDatePredictor = require('./backlogRegressionEndDatePredictor');

module.exports = {
  getStatuses(project, projectPath) {
    const ragStatusIndicators = [];
    ragStatusIndicators.push(demandVsProjected.evaluate(project, projectPath));
    ragStatusIndicators.push(backlogRegressionEndDatePredictor.evaluate(project, projectPath));
    return Promise.all(ragStatusIndicators).then(ragStatuses => {
      return ragStatuses.filter(ragStatus => ragStatus);
    });
  },
};
