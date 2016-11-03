'use strict'

const constants = require('../util/constants');
const mongoDB = require('../services/datastore/mongodb');
const myDemand = require('../services/demand');
//const sampleData = require('../testData/sampleIssues');
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
const GOODPROJECT = 'CIT';
const GOODSOURCE = 'Jira';

const DEMANDINFO = {
  source: GOODSOURCE,
  url: "https://digitalrig.atlassian.net/rest/api/latest/",
  project: GOODPROJECT,
  authPolicy: 'Basic',
  userData: 'ZGlnaXRhbHJpZzpEMWchdGFsUmln',
  flow: [{name: 'Backlog'}]};

const ERRORRETURN = {error: {status: 'BAD', message: 'FAILED'}};

const COMMONDEMAND = [
  { _id: '16204',
      history:[
        {statusValue: 'Backlog', startDate: '2016-03-22', changeDate: '2016-03-22'},
        {statusValue: 'UX Review', startDate: '2016-03-22', changeDate: '2016-03-22'},
        {statusValue: 'In Progress', startDate: '2016-03-22', changeDate: '2016-03-24'},
        {statusValue: 'UX Review', startDate: '2016-03-24', changeDate: null} ]
  }
];

const SUMMARYDEMAND = [
  { projectDate: '2016-03-21', status: { 'In Progress': 1 } },
  { projectDate: '2016-03-22', status: { 'In Progress': 1 } }
];

describe('Demand Loader - Bad effort System', function() {
  var url = '';
  var anEvent = new utils.DataEvent(constants.LOADEVENT);

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.demand = {};

      this.loadRawData = Sinon.stub(myDemand, 'loadRawData').rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myDemand.loadRawData.restore();
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
    return (myDemand.loadDemand(DEMANDINFO, anEvent, new utils.ProcessingInfo(url)));
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

      this.loadRawData = Sinon.stub(myDemand, 'loadRawData').resolves(COMMONDEMAND);
      this.wipeAndStoreData = Sinon.stub(mongoDB, 'wipeAndStoreData').rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myDemand.loadRawData.restore();
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
    return (myDemand.loadDemand(DEMANDINFO, anEvent, new utils.ProcessingInfo(url)));
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

      this.loadRawData = Sinon.stub(myDemand, 'loadRawData').resolves(COMMONDEMAND);
      this.wipeAndStoreData = Sinon.stub(mongoDB, 'wipeAndStoreData');
      this.wipeAndStoreData.onCall(0).resolves(COMMONDEMAND);
      this.wipeAndStoreData.onCall(1).rejects(ERRORRETURN);
  });

  after('Delete Event Details', function() {
    myDemand.loadRawData.restore();
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
    return (myDemand.loadDemand(DEMANDINFO, anEvent, new utils.ProcessingInfo(url)));
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

describe('Test conversion of common format into summary data', function () {
  it('Convert', function(done) {
    var summaryDataFormat = myDemand.createSummaryData(COMMONDEMAND);

    Should(summaryDataFormat).deepEqual(SUMMARYDEMAND);
    done();
  });
});
