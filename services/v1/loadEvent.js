'use strict'

const Config = require('config');
const dataStore = require('../datastore/mongodb');
const demandLoader = require('../demand');
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
  logger.info(`listEvents for ${projectName}`);

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
  logger.info(`list an event [${eventId}] for ${projectName}`);

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

const isActive = (anEvent) => anEvent.endTime === null;

exports.createNewEvent = function (req, res) {
  var projectName = decodeURIComponent(req.params.name);
  logger.info(`createNewEvent for ${projectName}`);
  var aLoadEvent = {};

  if (req.query.type === undefined || ((req.query.type.toUpperCase() != myConstants.LOADEVENT) && (req.query.type.toUpperCase() != myConstants.UPDATEEVENT))) {
    logger.debug(`Missing or invalid type query parameter`);
    res.status(HttpStatus.BAD_REQUEST);
    res.send(errorHelper.errorBody(HttpStatus.BAD_REQUEST,
      `Query Parameter type must be specified.  Must either be ${myConstants.LOADEVENT} or ${myConstants.UPDATEEVENT}`));
  } else {
    getProjectData(projectName)
      .then (function(aProject) {
        module.exports.getMostRecentEvent(projectName)
          .then (function(anEvent) {
            if (anEvent != undefined && isActive(anEvent)) {
              var url = `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}/${anEvent._id}`;
              logger.debug(`createNewEvent -> There is an existing active event ${url}`);
              logger.debug(anEvent);
              res.status(HttpStatus.CONFLICT);
              res.send(errorHelper.errorBody(HttpStatus.CONFLICT,
                `There is currently an active event for this project, please wait for it to complete.  ${url}`));
            } else {
              aLoadEvent = new utils.DataEvent(req.query.type.toUpperCase());
              logger.debug('createNewEvent -> NOT AN ACTIVE EVENT');
              logger.debug(aLoadEvent);
              if ((anEvent != undefined) && (req.query.type.toUpperCase() === myConstants.UPDATEEVENT)) {
                logger.debug('createNewEvent -> An Udate Event');
                aLoadEvent.since = fromLastCompletion(anEvent);
                logger.debug(aLoadEvent);
              }
              var loadEvents = [aLoadEvent];
              dataStore.insertData(utils.dbProjectPath(projectName), myConstants.EVENTCOLLECTION, loadEvents)
                .then ( function(result) {
                  if (result.insertedCount > 0) {
                    res.status(HttpStatus.CREATED);
                    var tmpBody = {url: `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}/${aLoadEvent._id}`};
                    logger.debug("createNewEvent -> Created @ " + tmpBody.url);
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

function fromLastCompletion(anEvent) {
  var endTime = anEvent.endTime.toJSON().toString();
  return (endTime.slice(0, 10) + '+' + endTime.slice(11, 16));
}

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

var dateSort = function(a, b) { return (a.startTime.getTime() - b.startTime.getTime()); };

exports.getMostRecentEvent = function (aProjectName) {
  logger.debug(`loadEvent->getMostRecentEvent for ${aProjectName}`);

  return new Promise(function (resolve, reject) {
      dataStore.getAllData(utils.dbProjectPath(aProjectName), myConstants.EVENTCOLLECTION)
        .then ( function(allEvents) {
          if (allEvents.length < 1) {
            logger.debug('loadEvent->getMostRecentEvent - Not Found');
            resolve(null);
          } else {
            logger.debug(`loadEvent->getMostRecentEvent - ${allEvents.length} events found`);
            var orderedEvents = R.sort(dateSort, allEvents);
            logger.debug('orderedEvents');
            logger.debug(orderedEvents);
            resolve (R.last(orderedEvents));
          }
        }).catch(function(err) {
          logger.debug("loadEvent->getMostRecentEvent - ERROR");
          logger.error(err);
          reject(err);
        });
  });
}

exports.kickoffLoad = function (aProject, anEvent) {
  var proeccessingIntructions = new utils.ProcessingInfo(utils.dbProjectPath(aProject.name));
  var proeccessingIntructions.endDate = utils.dateFormatIWant(determineProjectEndDate(aProject);

  if (!(aProject.demand === null)) {
    demandLoader.loadDemand(aProject.effort, anEvent, proeccessingIntructions);
  }
  if (!(aProject.effort === null)) {
    effortLoader.loadEffort(aProject.effort, anEvent, proeccessingIntructions);
  }
}

function determineProjectEndDate(aProject) {
  if (aProject.projection != undefined) {
    if (aProject.projection.endDate != undefined) {
      return aProject.projection.endDate;
    }
  } elseif (aProject.endDate != undefined) {
    return aProject.endDate;
  }
  return (new Date());
}
