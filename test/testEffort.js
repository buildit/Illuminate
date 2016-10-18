'use strict'

const constants = require('../util/constants');
const mongoDB = require('../services/datastore/mongodb');
const myEffort = require('../services/effort');
const Should = require('should');
const Sinon = require('sinon');
require('sinon-as-promised');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const PROJECTNAME = 'UNITESTEFFORT';
const GOODPROJECT = 10284278;
const GOODSOURCE = 'Harvest';

const EFFORTINFO = {
  source: GOODSOURCE,
  url: 'https://builditglobal.harvestapp.com',
  project: GOODPROJECT,
  authPolicy: 'Basic',
  userData: 'cGF1bC5rYXJzdGVuQHdpcHJvLmNvbTpXaDFwSXRHMDBk',
  role: []};

const COMMONDATA = [
  {
    day: '2015-10-21',
    role: 'Delivery',
    effort: 8
  },
  {
    day: '2015-10-22',
    role: 'Delivery',
    effort: 8
  }
];

const ERRORRETURN = {error: {status: 'BAD', message: 'FAILED'}};

describe('Effort Loader - Bad effort System', function() {
  var url = '';
  var anEvent = new utils.DataEvent(constants.LOADEVENT);

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.effort = {};

      this.loadRawData = Sinon.stub(myEffort, 'loadRawData').rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myEffort.loadRawData.restore();
    return mongoDB.clearData(utils.dbProjectPath(PROJECTNAME), constants.EVENTCOLLECTION)
  });

  it('Create An Event', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(anEvent).match(readData);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  it('Create in Load Raw', function() {
    return (myEffort.loadEffort(EFFORTINFO, anEvent, new utils.ProcessingInfo(url, null, null, null)));
  });

  it('Validate Failed Event', function() {
    process.nextTick( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
        .then ( function(readData) {
          Should(constants.FAILEDEVENT).match(readData.status);
      });
    });
  });
});

describe('Effort Loader - Failed Common Load', function() {
  var url = '';
  var anEvent = new utils.DataEvent(constants.LOADEVENT);

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.effort = {};

      this.loadRawData = Sinon.stub(myEffort, 'loadRawData').resolves(COMMONDATA);
      this.wipeAndStoreData = Sinon.stub(mongoDB, 'wipeAndStoreData').rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myEffort.loadRawData.restore();
    mongoDB.wipeAndStoreData.restore();

    return mongoDB.clearData(utils.dbProjectPath(PROJECTNAME), constants.EVENTCOLLECTION)
  });

  it('Create An Event', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(anEvent).match(readData);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  it('Create in Load Raw', function() {
    return (myEffort.loadEffort(EFFORTINFO, anEvent, new utils.ProcessingInfo(url, null, null, null)));
  });

  it('Validate Failed Event', function() {
    process.nextTick( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
        .then ( function(readData) {
          Should(constants.FAILEDEVENT).match(readData.status);
      });
    });
  });
});

describe('Effort Loader - Failed Summary Load', function() {
  var url = '';
  var anEvent = new utils.DataEvent(constants.LOADEVENT);

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.effort = {};

      this.loadRawData = Sinon.stub(myEffort, 'loadRawData').resolves(COMMONDATA);
      this.wipeAndStoreData = Sinon.stub(mongoDB, 'wipeAndStoreData');
      this.wipeAndStoreData.onCall(0).resolves(COMMONDATA);
      this.wipeAndStoreData.onCall(1).rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myEffort.loadRawData.restore();
    mongoDB.wipeAndStoreData.restore();

    return mongoDB.clearData(utils.dbProjectPath(PROJECTNAME), constants.EVENTCOLLECTION)
  });

  it('Create An Event', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(anEvent).match(readData);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  it('Create in Load Raw', function() {
    return (myEffort.loadEffort(EFFORTINFO, anEvent, new utils.ProcessingInfo(url, null, null, null)));
  });

  it('Validate Failed Event', function() {
    process.nextTick( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
        .then ( function(readData) {
          Should(constants.FAILEDEVENT).match(readData.status);
      });
    });
  });
});
