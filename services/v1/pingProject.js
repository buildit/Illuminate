'use strict'

const Config = require('config');
const constants = require('../../util/constants');
const dataStore = require('../datastore/mongodb');
const demand = require('../demandSystem/index');
const defect = require('../defectSystem/index');
const effort = require('../effortSystem/index');
const Log4js = require('log4js');
const HttpStatus = require('http-status-codes');
const utils = require('../../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));``

exports.ping = function (req, res) {
  const projectName = decodeURIComponent(req.params.name);
  logger.info(`pinging ${projectName}`);
  getProjectData(projectName)
  .then(module.exports.check)
  .then((pingResults) => {
    res.send(pingResults);
  })
  .catch(() => {
    res.status(HttpStatus.NOT_FOUND);
    res.send('Project not found');
  });
}

exports.check = function(aProject) {
  const validDemandSystems = ['Jira', 'Trello'];
  const validDefectSystems = ['Jira'];
  const validEffortSystems = ['Harvest'];
  
  const promises = [];
  
  if (!aProject.demand) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('No Demand Configured') }));
  } else if (!aProject.demand.source || !validDemandSystems.includes(aProject.demand.source)) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('Invalid Demand Source') }));
  } else {
    promises.push(demand[aProject.demand.source.toLowerCase()].testDemand(aProject));
  }

  if (!aProject.defect) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('No Defect Configured') }));
  } else if (!aProject.defect.source || !validDefectSystems.includes(aProject.defect.source)) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('Invalid Defect Source') }));
  } else {
    promises.push(defect[aProject.defect.source.toLowerCase()].testDefect(aProject));
  }

  if (!aProject.effort) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('No Effort Configured') }));
  } else if (!aProject.effort.source || !validEffortSystems.includes(aProject.effort.source)) {
    promises.push(Promise.resolve({ status: constants.STATUSERROR, data: utils.pingReponseMessageFormat('Invalid effort Source') }));
  } else {
    promises.push(effort[aProject.effort.source.toLowerCase()].testEffort(aProject));
  }

  return Promise.all(promises)
  .then(([demand, defect, effort]) => ({
    demand,
    defect,
    effort,
  }));
}

function getProjectData(aProjectName) {
  logger.debug('testProject -> getProjectData');
  return dataStore.getDocumentByName(utils.dbCorePath(), constants.PROJECTCOLLECTION, aProjectName)
  .then ( function(aProject) {
    if (aProject === undefined) {
      logger.debug("testProject -> getProjectData -> Not Found");
      throw new Error(`Project ${aProjectName} is undefined`);
    }
    return aProject;
  }).catch(function(err) {
    logger.debug("testProject -> getProjectData -> ERROR");
    logger.error(err);
    throw err;
  });
}