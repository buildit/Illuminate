'use strict'

const constants = require('../util/constants');
const myDefect = require('../services/defect');
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

const DEFECTINFO = {
  source: GOODSOURCE,
  url: "https://digitalrig.atlassian.net/rest/api/latest/",
  project: GOODPROJECT,
  authPolicy: 'Basic',
  userData: 'ZGlnaXRhbHJpZzpEMWchdGFsUmln',
  flow: [{name: 'Backlog'}]};

const COMMONDEFECT = [
  { _id: '16204',
      history:[
        {statusValue: 'Backlog', startDate: '2016-03-22', changeDate: '2016-03-22'},
        {statusValue: 'UX Review', startDate: '2016-03-22', changeDate: '2016-03-22'},
        {statusValue: 'In Progress', startDate: '2016-03-22', changeDate: '2016-03-24'},
        {statusValue: 'UX Review', startDate: '2016-03-24', changeDate: null} ]
  }
];

const SUMMARYDEFECT = [
  { projectDate: '2016-03-22', status: { 'In Progress': 1 } },
  { projectDate: '2016-03-23', status: { 'In Progress': 1 } }
];

describe('testDefect - configure Processing info', function() {
  var originalInfo = null;

  before('setup', function() {
    originalInfo = new utils.ProcessingInfo(utils.dbProjectPath(testConstants.UNITTESTPROJECT));
    originalInfo.rawLocation = constants.RAWEFFORT;
    originalInfo.commonLocation = constants.COMMONDEFECT;
    originalInfo.summaryLocation = constants.SUMMARYDEFECT;
    originalInfo.eventSection = constants.DEFECTSECTION;
    originalInfo.storageFunction = myDefect.rawDataProcessor;
  });

  it('Call effort function - should not effect the original object', function() {
    var defectInfo = myDefect.configureProcessingInstructions(originalInfo);

    Should(defectInfo).not.deepEqual(originalInfo);
    Should(defectInfo.rawLocation).equal(constants.RAWDEFECT);  // make sure things get set
    Should(defectInfo.storageFunction).equal(myDefect.rawDataProcessor); // make sure we don't slame the db function
  });
});

describe('testDefect - determine effort processing system', function() {
  it('Should decode Harvest', function() {
    var systemClass = myDefect.rawDataProcessor(DEFECTINFO);
    Should(systemClass).not.equal(null);
  });

  it('Should NOT decode not Harvest', function() {
    var badEffort = JSON.parse(JSON.stringify(DEFECTINFO));
    badEffort.source = GOODSOURCE + 'BADMAN';
    var systemClass = myDefect.rawDataProcessor(badEffort);
    Should(systemClass).equal(null);
  });
});

describe('testDefect - convert common to summary', function() {

  it('Should translate', function() {
    var summaryData = myDefect.transformCommonToSummary(COMMONDEFECT);
    Should(summaryData).deepEqual(SUMMARYDEFECT);
  });
});
