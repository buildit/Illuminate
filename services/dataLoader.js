'use strict'

const Config = require('config');
const dataStore = require('../datastore/mongodb');
const demandLoader = require('../demand');
const effortLoader = require('../effort');
const errorHelper = require('../errors');
const Log4js = require('log4js');
const myConstants = require('../../util/constants');
const utils = require('../../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));``

// there is an event for a project, so go get data for it
// check if it is configured for demand, defect, and / or effort
exports.processProjectData = function (aProject, anEvent) {
  var processingInstructions = new utils.ProcessingInfo(utils.dbProjectPath(aProject.name));
  processingInstructions.endDate = utils.dateFormatIWant(determineProjectEndDate(aProject);
  processingInstructions.storageFunction = dataStore.upsertData;

  if (aProject['demand']) {
    var aSystemEvent = null;

    var demandInstructions = demandLoader.configureProcessingInstructions(processingInstructions, aProject.demand.source);
    if (demandInstructions.rawDataProcessor === null) {
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, `Unknown Demand System ${aProject.demand.source}`);
    } else {
      aSystemEvent = this.processProjectSystem(demandLoader, aProject.demand, anEvent, demandInstructions);
    }
    dataStore.processEventData(processingInfo.dbUrl,
      constants.EVENTCOLLECTION,
      anEvent,
      processingInfo.eventSection,
      aSystemEvent);
  }

  if (aProject['effort']) {
    var aSystemEvent = null;

    var effortInstructions = effortLoader.configureProcessingInstructions(processingInstructions, aProject.effort.source);
    if (effortInstructions.rawDataProcessor === null) {
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, `Unknown Demand System ${aProject.effort.source}`);
    } else {
      aSystemEvent = this.processProjectSystem(demandLoader, aProject.effort, anEvent, effortInstructions);
    }
    dataStore.processEventData(processingInfo.dbUrl,
      constants.EVENTCOLLECTION,
      anEvent,
      processingInfo.eventSection,
      aSystemEvent);
  }
}

// basically if there is a projection for this project, use that end date
// there is a test for the field because this is a future implementation
// if there isn't a project with and end date / see if the project has an end date
// otherwise default to today
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


exports.processProjectData = function (loaderClass, aProjectSystem, anEvent, processingInstructions) {
  logger.info(`processProjectData for project ${effortData.project} from ${effortData.source}`);
  logger.debug('anEvent');
  logger.debug(anEvent);
  logger.debug('processingInfo');
  logger.debug(processingInstructions);

  processingInstructions.rawDataProcessor.loadRawData(aProjectSystem, processingInstructions, anEvent.since)
    .then (function(recordsProcessesed) {
      logger.debug(`processProjectData -> rawDataProcessed #[${recordsProcessesed}]`);
      if (recordsProcessesed < 1) {
        return new utils.SystemEvent(constants.SUCCESSEVENT, `no records processed`);
      } else {
        dataStore.getAllData(processingInfo.dbUrl, processingInfo.rawLocation);
        .then (function (rawDataFormat) {
          logger.debug(`processProjectData -> readRawData #[${rawDataFormat.length}]`);
          var commonDataFormat = processingInstructions.rawDataProcessor.transformRawToCommon(rawDataFormat);
          dataStore.wipeAndStoreData(processingInfo.dbUrl, processingInfo.commonLocation, commonDataFormat)
            .then (function(response1) {
              logger.debug(`processProjectData -> updatedCommonData #[${commonDataFormat.length}]`);
              logger.debug(response1);
              var summaryDataFormat = loaderClass.transformCommonToSummary(commonDataFormat);
              dataStore.wipeAndStoreData(processingInfo.dbUrl, processingInfo.summaryLocation,  summaryDataFormat)
                .then (function (response2){
                  logger.debug(`processProjectData -> updatedSummaryData #[${summaryDataFormat.length}]`);
                  logger.debug(response2);
                  return new utils.SystemEvent(constants.SUCCESSEVENT, `${recordsProcessesed} records processed`);
                }).catch(function(err) {
                  logger.debug('loadEffort -> ERROR Summary Data');
                  return new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
                });
            }).catch(function(err) {
              logger.debug('loadEffort -> ERROR Common Data');
              return new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
            });
          }).catch(function(err) {
            logger.debug('loadEffort -> ERROR Load Raw Data');
            return new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
          });
      }
    }).catch(function(err) {
      logger.debug('loadEffort -> ERROR Raw Data');
      return new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err));
    });
};
