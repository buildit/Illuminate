'use strict'

const Config = require('config');
const constants = require('../../util/constants');
const dataStore = require('../datastore/mongodb');
const demand = require('../demandSystem/index');
const Log4js = require('log4js');
const utils = require('../../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));``

exports.ping = function (req, res) {
  const projectName = decodeURIComponent(req.params.name);
  logger.info(`pinging ${projectName}`);
  getProjectData(projectName)
  .then(aProject => {
    const promises = [];
    promises.push(demand[aProject.demand.source.toLowerCase()].testDemand(aProject));
    return Promise.all(promises);
  })
  .then(([demand]) => {
    res.send({
      demand,
    })
  });
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