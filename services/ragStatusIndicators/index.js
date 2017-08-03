const demandVsProjected = require('./demandVsProjected');

module.exports = (project, projectPath) => {
    const ragStatusIndicators = [];
    ragStatusIndicators.push(demandVsProjected(project, projectPath));
    return Promise.all(ragStatusIndicators);
}