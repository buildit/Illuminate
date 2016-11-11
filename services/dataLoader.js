'use strict'

const Config = require('config');
const constants = require('../util/constants');
const dataStore = require('./datastore/mongodb');
const demandLoader = require('./demand');
const effortLoader = require('./effort');
const Log4js = require('log4js');
const utils = require('../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

// there is an event for a project, so go get data for it
// check if it is configured for demand, defect, and / or effort
exports.processProjectData = function (aProject, anEvent) {
  var processingInstructions = new utils.ProcessingInfo(utils.dbProjectPath(aProject.name));
  processingInstructions.endDate = utils.dateFormatIWant(determineProjectEndDate(aProject));
  processingInstructions.storageFunction = dataStore.upsertData;

  if (aProject['demand']) {
    var demandInstructions = demandLoader.configureProcessingInstructions(processingInstructions);
    demandInstructions.sourceSystem = demandLoader.rawDataProcessor(aProject.demand);
    dataStore.processEventData(processingInstructions.dbUrl,
      constants.EVENTCOLLECTION,
      anEvent,
      processingInstructions.eventSection,
      module.exports.processProjectSystem(demandLoader, aProject.demand, anEvent, demandInstructions));
  }

  if (aProject['effort']) {
    var effortInstructions = effortLoader.configureProcessingInstructions(processingInstructions);
    effortInstructions.sourceSystem = effortLoader.rawDataProcessor(aProject.effort);
    dataStore.processEventData(processingInstructions.dbUrl,
      constants.EVENTCOLLECTION,
      anEvent,
      processingInstructions.eventSection,
      module.export.processProjectSystem(effortLoader, aProject.effort, anEvent, effortInstructions));
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
  } else {
    if (aProject.endDate != undefined) {
      return aProject.endDate;
    }
  }
  return (new Date());
}

exports.processProjectSystem = function (loaderClass, aProjectSystem, anEvent, processingInstructions) {
  logger.info(`processProjectData for project ${aProjectSystem.project} from ${aProjectSystem.source}`);

  return new Promise(function (resolve) {
    if (processingInstructions.sourceSystem === null) {
      logger.debug(`processProjectSystem -> unknown source system`);
      resolve(new utils.SystemEvent(constants.FAILEDEVENT, `unknown source system`));
    } else {
      processingInstructions.sourceSystem.loadRawData(aProjectSystem, processingInstructions, anEvent.since)
        .then (function(recordsProcessesed) {
          logger.debug(`processProjectSystem -> rawDataProcessed #[${recordsProcessesed}]`);
          if (recordsProcessesed < 1) { // there wasn't any new data
            resolve(new utils.SystemEvent(constants.SUCCESSEVENT, `no records processed`));
          } else {  // there was new data - reprocess to generate a common format
            dataStore.getAllData(processingInstructions.dbUrl, processingInstructions.rawLocation)
            .then (function (rawDataFormat) {
              logger.debug(`processProjectSystem -> readRawData #[${rawDataFormat.length}]`);
              var commonDataFormat = processingInstructions.sourceSystem.transformRawToCommon(rawDataFormat);
              dataStore.wipeAndStoreData(processingInstructions.dbUrl, processingInstructions.commonLocation, commonDataFormat)
                .then (function(response1) {  // now generate the summary data format
                  logger.debug(`processProjectSystem -> updatedCommonData #[${commonDataFormat.length}]`);
                  logger.debug(response1);
                  var summaryDataFormat = loaderClass.transformCommonToSummary(commonDataFormat);
                  dataStore.wipeAndStoreData(processingInstructions.dbUrl, processingInstructions.summaryLocation,  summaryDataFormat)
                    .then (function (response2){
                      logger.debug(`processProjectSystem -> updatedSummaryData #[${summaryDataFormat.length}]`);
                      logger.debug(response2);
                      resolve (new utils.SystemEvent(constants.SUCCESSEVENT, `${recordsProcessesed} records processed`));
                    }).catch(function(err) {
                      logger.debug('processProjectSystem -> ERROR Summary Data');
                      resolve (new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err)));
                    });
                }).catch(function(err) {
                  logger.debug('processProjectSystem -> ERROR Common Data');
                  resolve (new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err)));
                });
              }).catch(function(err) {
                logger.debug('processProjectSystem -> ERROR reading Raw Data');
                resolve (new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err)));
              });
          }
        }).catch(function(err) {
          logger.debug('processProjectSystem -> ERROR getting Raw Data');
          resolve (new utils.SystemEvent(constants.FAILEDEVENT, JSON.stringify(err)));
        });
    }
  });
};
