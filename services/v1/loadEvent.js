'use strict'

const Config = require('config');
const dataStore = require('../datastore/mongodb');
const effortLoader = require('../effort');
const errorHelper = require('../errors');
const HttpStatus = require('http-status-codes');
const Log4js = require('log4js');
const myConstants = require('../../util/constants');
const R = require('ramda');
const utils = require('../../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));``

exports.listEvents = function (req, res) {
  var projectName = decodeURIComponent(req.params.name);
  logger.debug(`listEvents for ${projectName}`);

  dataStore.getAllData(utils.dbProjectPath(projectName), myConstants.EVENTCOLLECTION)
    .then ( function(eventData) {
      logger.debug('listEvents->eventData');
      logger.debug(eventData);
      if (eventData.length < 1) {
        logger.debug("listEvents -> Not Found");
        res.status(HttpStatus.NOT_FOUND);
        res.send(errorHelper.errorBody(HttpStatus.NOT_FOUND, `Unable to find events for ${projectName}`));
      } else {
        res.status(HttpStatus.OK);
        res.send(eventData);
      }
    }).catch(function(err) {
      logger.debug("listEvents -> ERROR");
      logger.error(err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.send(errorHelper.errorBody(HttpStatus.INTERNAL_SERVER_ERROR, 'Unable to find events for ' + projectName));
    });
};

exports.listAnEvent = function (req, res) {
  var projectName = decodeURIComponent(req.params.name);
  var eventId = decodeURIComponent(req.params.id);
  logger.debug(`list an event [${eventId}] for ${projectName}`);

  dataStore.getDocumentByID(utils.dbProjectPath(projectName), myConstants.EVENTCOLLECTION, eventId)
    .then ( function(eventData) {
      if (eventData === undefined) {
        logger.debug("listAnEvent -> Not Found");
        res.status(HttpStatus.NOT_FOUND);
        res.send(errorHelper.errorBody(HttpStatus.NOT_FOUND, `Unable to find event [${eventId}]`));
      } else {
        res.status(HttpStatus.OK);
        res.send(eventData);
      }
    }).catch(function(err) {
      logger.debug("listAnEvent -> ERROR");
      logger.error(err);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.send(errorHelper.errorBody(HttpStatus.INTERNAL_SERVER_ERROR, 'Unable to find events for ' + projectName));
    });
};

exports.createNewEvent = function (req, res) {
  var projectName = decodeURIComponent(req.params.name);
  logger.debug(`createNewEvent for ${projectName}`);

  if (req.query.type === undefined || ((req.query.type.toUpperCase() != myConstants.LOADEVENT) && (req.query.type.toUpperCase() != myConstants.UPDATEEVENT))) {
    logger.debug(`Missing or invalid type query parameter`);
    res.status(HttpStatus.BAD_REQUEST);
    res.send(errorHelper.errorBody(HttpStatus.BAD_REQUEST,
      `Query Parameter type must be specified.  Must either be ${myConstants.LOADEVENT} or ${myConstants.UPDATEEVENT}`));
  } else {
    getProjectData(projectName)
      .then (function(aProject) {
        getActiveEvent(projectName)
          .then (function(anEvent) {
            if (anEvent) {
              var url = `${req.protocol}://${req.hostname}${req.originalUrl}/${anEvent._id}`;
              logger.debug(`createNewEvent -> There is an existing active event ${url}`);
              logger.debug(anEvent);
              res.status(HttpStatus.CONFLICT);
              res.send(errorHelper.errorBody(HttpStatus.CONFLICT,
                `There is currently an active event for this project, please wait for it to complete.  ${url}`));
            } else {
              var aLoadEvent = new utils.DataEvent(utils.LOADEVENT);
              var loadEvents = [aLoadEvent];
              dataStore.insertData(utils.dbProjectPath(projectName), myConstants.EVENTCOLLECTION, loadEvents)
                .then ( function(result) {
                  if (result.insertedCount > 0) {
                    res.status(HttpStatus.CREATED);
                    var tmpBody = {url: `${req.protocol}://${req.hostname}${req.originalUrl}${aLoadEvent._id}`};
                    logger.debug("createNewEvent -> Created @ " + tmpBody);
                    module.exports.kickoffLoad(aProject, aLoadEvent);
                    res.send(tmpBody);
                  } else {
                    logger.debug("createNewEvent -> Event was not created " + projectName);
                    res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                    res.send(errorHelper.errorBody(HttpStatus.INTERNAL_SERVER_ERROR, 'Unable to find create event for ' + projectName));
                  }
                }).catch(function(err) {
                  logger.debug("createNewEvent -> ERROR 1");
                  logger.error(err);
                  res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                  res.send(errorHelper.errorBody(HttpStatus.INTERNAL_SERVER_ERROR, 'Unable to find events for ' + projectName));
                });
                logger.debug('createNewEvent->aProject');
                logger.debug(aProject);
              }
          }).catch(function(err) {
            logger.debug("createNewEvent -> ERROR 2");
            if (err != undefined) {
              logger.error(err);
            }
            res.status(HttpStatus.NOT_FOUND);
            res.send(errorHelper.errorBody(HttpStatus.NOT_FOUND, 'Unable to find project information for ' + projectName));
          });
        }).catch(function(err) {
          logger.debug("createNewEvent -> ERROR 3");
          if (err != undefined) {
            logger.error(err);
          }
          res.status(HttpStatus.NOT_FOUND);
          res.send(errorHelper.errorBody(HttpStatus.NOT_FOUND, 'Unable to find project information for ' + projectName));
        });
  }
};

function getProjectData(aProjectName) {
  logger.debug('loadEvent->getProjectData');

  return new Promise(function (resolve, reject) {
      dataStore.getDocumentByName(utils.dbCorePath(), myConstants.PROJECTCOLLECTION, aProjectName)
        .then ( function(aProject) {
          if (aProject === undefined) {
            logger.debug("getProjectData -> Not Found");
            reject(aProject);
          } else {
            resolve(aProject)
          }
        }).catch(function(err) {
          logger.debug("getProjectData -> ERROR");
          logger.error(err);
          reject(err);
        });
  });
}

function getActiveEvent(aProjectName) {
  logger.debug('loadEvent->getActiveEvent');

  return new Promise(function (resolve, reject) {
      dataStore.getAllData(utils.dbProjectPath(aProjectName), myConstants.EVENTCOLLECTION)
        .then ( function(allEvents) {
          if (allEvents.length < 1) {
            logger.debug("loadEvent->getActiveEvent - Not Found");
            resolve(null);
          } else {
            var anEvent = R.find(R.propEq('endTime', null))(allEvents);
            logger.debug('getActiveEvent -> anEvent');
            logger.debug(anEvent);
            resolve(anEvent);
          }
        }).catch(function(err) {
          logger.debug("loadEvent->getActiveEvent - ERROR");
          logger.error(err);
          reject(err);
        });
  });
}

exports.kickoffLoad = function (aProject, anEvent) {
  // if (!(aProject.demand === null) && (JIRA === aProject.demand.source.toUpperCase())) {
  //   logger.info("Load Jira Demand for " + aProject.name + "(" + aProject.id + ")");
  //   jiraDemand.load(aProject);
  // }
  // if (!(aProject.defect === null) && (JIRA === aProject.defect.source.toUpperCase())) {
  //   logger.info("Load Jira Defects for " + aProject.name + "(" + aProject.id + ")");
  //   jiraDefect.load(aProject);
  // }
  if (!(aProject.effort === null)) {
    effortLoader.loadEffort(aProject.effort, anEvent, new utils.ProcessingInfo(utils.dbProjectPath(aProject.name, null, null, null)));
  }
}
