const constants = require('../../util/constants');
const Config = require('config');
const errorHelper = require('../errors');
const HttpStatus = require('http-status-codes');
const moment = require('moment');
const Log4js = require('log4js');
const R = require('ramda');
const Rest = require('restler');
const utils = require('../../util/utils');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const type = 'TRELLO'

function loadRawData (demandInfo, processingInfo, sinceTime) {
  logger.info(`loadStoryEntries(${type}) for ${demandInfo.project} updated since [${sinceTime}]`);
  return module.exports.loadTrelloDemand(demandInfo, sinceTime)
  .then(stories => {
    logger.debug(`total stories read - ${stories.length}`);
    if (stories.length < 1) {
      return [];
    }
    return processingInfo.storageFunction(processingInfo.dbUrl, processingInfo.rawLocation, stories)
  });
}

function loadTrelloDemand (demandInfo, sinceTime) {
  const sinceMoment = moment(sinceTime, constants.DBDATEFORMAT);
  logger.info(`loadTrelloDemand() for ${type} project ${demandInfo.project}`);

  return new Promise((resolve, reject) => {
    Rest.get(appendAuth(`${demandInfo.url}/cards?fields=id,labels,dateLastActivity,shortUrl&actions=updateCard,createCard`, demandInfo))
      .on('complete', (data, response) => {
        if (response.statusCode === HttpStatus.OK) {
          logger.info(`Success reading demand: count [${data.length}]`);
          const returner = data
          .filter(card => card.actions.length > 0)
          .filter(card => sinceMoment.isSameOrBefore(moment(card.dateLastActivity)))
          .map(card => R.merge(card, { creationDate: getCardCreationDate(card.id), _id: card.id }))

          resolve(returner);
        } else {
          logger.error("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
          reject(errorHelper.errorBody(response.statusCode, `Error retrieving stories from ${type}`));
        }
      })
      .on('fail', (data, response) => {
        logger.error("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
        reject(errorHelper.errorBody(response.statusCode, `Error retrieving stories from ${type}`));
      })
      .on('error', (data, response) => {
        logger.error("ERROR: " + data.message + " / " + response);
        reject(errorHelper.errorBody(response.statusCode, `Error retrieving stories from ${type}`));
      });
  });
}

function transformRawToCommon(issueData) {

  logger.info('mapTrelloDemand into a common format');

  const commonDataFormat = [];

  issueData.forEach(aStory => {
    const commonDemandEntry = new utils.CommonDemandEntry(aStory.id);
    commonDemandEntry.uri = aStory.shortUrl;
    let historyEntry;
    const actions = aStory.actions.reverse().filter(action => action.data.listBefore);
    if (actions.length === 0) {
      historyEntry = new utils.DemandHistoryEntry(aStory.actions[0].data.list.name, aStory.creationDate);
    } else {
      actions.forEach(action => {
        if (!historyEntry) {
          historyEntry = new utils.DemandHistoryEntry(action.data.listBefore.name, aStory.creationDate);
        }
        historyEntry.changeDate = action.date;
        commonDemandEntry.history.push(historyEntry);
        historyEntry = new utils.DemandHistoryEntry(action.data.listAfter.name, action.date);
      });
    }
    commonDemandEntry.history.push(historyEntry);
    commonDataFormat.push(commonDemandEntry);
  });

  return commonDataFormat;
}

function appendAuth(url, demandInfo) {
  const keys = demandInfo.authPolicy.split(':');
  const values = demandInfo.userData.split(':');
  const divider = url.includes('?') ? '&' : '?';
  return `${url}${divider}${keys[0]}=${values[0]}&${keys[1]}=${values[1]}`;
}

function getCardCreationDate(cardId) {
  return moment.unix(parseInt(cardId.substring(0,8),16)).toISOString();
}

module.exports = {
  loadRawData,
  loadTrelloDemand,
  transformRawToCommon,
}