'use strict'

const constants = require('../util/constants');
const testConstants = require('./testConstants');
const utils = require('../util/utils');
const dataStore = require('../services/datastore/mongodb');
const event = require('../services/event');

const CO = require('co');
const Should = require('should');
const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

describe.only('Event', () => {
  let processingInstructions;
  let anEvent;
  let aSystemEvent;
  let insertedDocument;

  before('setup', function () {
    processingInstructions = new utils.ProcessingInfo(testConstants.UNITTESTPROJECT);
    processingInstructions.eventSection = constants.EFFORTSECTION;
    anEvent = new utils.DataEvent(constants.LOADEVENT);
    anEvent.effort = {};
    aSystemEvent = new utils.SystemEvent(constants.PENDINGEVENT, '');
    return dataStore.insertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [anEvent])
    .then(document => {
      insertedDocument = document.ops[0];
    });
  });

  it('updates the effort in the event', () => {
    return CO(function* () {
      yield event.processEventData(aSystemEvent, processingInstructions, insertedDocument._id)
      const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
      Should(aSystemEvent).match(updatedEvent.effort);
    })
  })
});

