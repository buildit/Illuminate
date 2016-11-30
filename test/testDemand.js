'use strict'

const constants = require('../util/constants');
const myDemand = require('../services/demand');
const Should = require('should');
const testConstants = require('./testConstants');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const GOODPROJECT = 'CIT';
const GOODSOURCE = 'Jira';

const DEMANDINFO = {
  source: GOODSOURCE,
  url: "https://digitalrig.atlassian.net/rest/api/latest/",
  project: GOODPROJECT,
  authPolicy: 'Basic',
  userData: 'ZGlnaXRhbHJpZzpEMWchdGFsUmln',
  flow: [{name: 'Backlog'}]};

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
  { projectDate: '2016-03-22', status: { 'In Progress': 1 } },
  { projectDate: '2016-03-23', status: { 'In Progress': 1 } }
];

describe('testDemand - configure Processing info', function() {
  var originalInfo = null;

  before('setup', function() {
    originalInfo = new utils.ProcessingInfo(utils.dbProjectPath(testConstants.UNITTESTPROJECT));
    originalInfo.rawLocation = constants.RAWEFFORT;
    originalInfo.commonLocation = constants.COMMONDEMAND;
    originalInfo.summaryLocation = constants.SUMMARYDEMAND;
    originalInfo.eventSection = constants.DEMANDSECTION;
    originalInfo.storageFunction = myDemand.rawDataProcessor;
  });

  it('Call effort function - should not effect the original object', function() {
    var effortInfo = myDemand.configureProcessingInstructions(originalInfo);

    Should(effortInfo).not.deepEqual(originalInfo);
    Should(effortInfo.rawLocation).equal(constants.RAWDEMAND);  // make sure things get set
    Should(effortInfo.storageFunction).equal(myDemand.rawDataProcessor); // make sure we don't slam the db function
  });
});

describe('testDemand - determine effort processing system', function() {
  it('Should decode Harvest', function() {
    var systemClass = myDemand.rawDataProcessor(DEMANDINFO);
    Should(systemClass).not.equal(null);
  });

  it('Should NOT decode not Harvest', function() {
    var badEffort = JSON.parse(JSON.stringify(DEMANDINFO));
    badEffort.source = GOODSOURCE + 'BADMAN';
    var systemClass = myDemand.rawDataProcessor(badEffort);
    Should(systemClass).equal(null);
  });
});

describe('testDemand - convert common to summary', function() {
  var processingInstructions = {};

  before('set up', function() {
    processingInstructions = new utils.ProcessingInfo(utils.dbProjectPath(testConstants.UNITTESTPROJECT));
    processingInstructions.endDate = '2016-03-24';
  });

  it('Should translate', function() {
    var summaryData = myDemand.transformCommonToSummary(COMMONDEMAND, processingInstructions);
    Should(summaryData).deepEqual(SUMMARYDEMAND);
  });
});
