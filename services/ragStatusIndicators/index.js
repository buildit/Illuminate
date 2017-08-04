const demandVsProjected = require('./demandVsProjected');

module.exports = {
  getStatuses(project, projectPath) {
    const ragStatusIndicators = [];
    ragStatusIndicators.push(demandVsProjected.evaluate(project, projectPath));
    return Promise.all(ragStatusIndicators).then(ragStatuses => {
      return ragStatuses.filter(ragStatus => ragStatus);
    });
  },
};
