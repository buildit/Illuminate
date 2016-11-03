'use strict'

const constants = require('../util/constants');
const MongoDB = require('../services/datastore/mongodb');
const harvest = require('../services/effortSystem/harvest');
const Rest = require('restler');
const Should = require('should');
const Sinon = require('sinon');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const PROJECTNAME = 'UNITESTEFFORT';
const GOODPROJECT = 10284278;
const BADPROJECT = 98765432;

const SINCETIME = '2000-01-01+00:00';
const FUTURETIME = utils.dateFormatIWant(new Date()) + '+23:59';

const EFFORTINFO = {
  source: 'Harvest',
  url: 'https://builditglobal.harvestapp.com',
  project: GOODPROJECT,
  authPolicy: 'Basic',
  userData: 'cGF1bC5rYXJzdGVuQHdpcHJvLmNvbTpXaDFwSXRHMDBk',
  role: []};

const EXPECTEDTASKLIST = {5715688 :'Delivery', 6375838 :'Discovery'};
const TIMERESPONSE = [
  {
    day_entry:
    {
      id: 439722386,
      notes: "Sheffeld co-lo, planning",
      spent_at: "2015-10-21",
      hours: 8,
      user_id: 1239662,
      project_id: 10284278,
      task_id: 5715688,
      created_at: "2016-03-15T17:00:48Z",
      updated_at: "2016-03-15T17:00:48Z",
      adjustment_record: false,
      timer_started_at: null,
      is_closed: false,
      is_billed: false
    }
  },
  {
    day_entry:
    {
      id: 439722390,
      notes: "Sheffeld co-lo, planning",
      spent_at: "2015-10-22",
      hours: 8,
      user_id: 1239646,
      project_id: 10284278,
      task_id: 5715688,
      created_at: "2016-03-15T17:00:48Z",
      updated_at: "2016-03-15T17:00:48Z",
      adjustment_record: false,
      timer_started_at: null,
      is_closed: false,
      is_billed: false
    }
  }
];

describe('Harvest Stubbed Tests', function() {
  const CODENOTFOUND = 404;
  const MESSAGENOTFOUND = 'There Be Dragons';
  const ERRORRESULT = {statusCode: CODENOTFOUND, statusMessage: MESSAGENOTFOUND};
  const TIMEERRORMESSAGE = 'Error retrieving time entries from Harvest';
  const TASKERRORMESSAGE = 'Error retrieving task entries from Harvest';

  const TASKREPONSE = [
    {
      "task":
      {
        "id": 6375838,
        "name": "Discovery",
        "billable_by_default": false,
        "created_at": "2016-08-02T09:16:49Z",
        "updated_at": "2016-09-13T12:26:15Z",
        "is_default": false,
        "default_hourly_rate": 0,
        "deactivated": false
      }
    },
    {
      "task":
      {
        "id": 5715688,
        "name": "Delivery",
        "billable_by_default": true,
        "created_at": "2016-03-15T12:46:08Z",
        "updated_at": "2016-03-15T13:12:49Z",
        "is_default": true,
        "default_hourly_rate": 0,
        "deactivated": false
      }
    }
  ];

  beforeEach(function() {
    this.get = Sinon.stub(Rest, 'get');
  });

  afterEach(function() {
    Rest.get.restore();
  })

  it('Test Get Time Entries', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(TIMERESPONSE, null)
    });

    return harvest.getTimeEntries(EFFORTINFO, SINCETIME)
      .then(function(response) {
        Should(response.length).be.above(0);
        Should(response[0].day_entry).have.property('spent_at');
        Should(response[0].day_entry).have.property('task_id');
      });
  });

  it('Test Getting an empty set Time Entries', function() {
    Rest.get.returns({
      on:Sinon.stub().yields([], null)
    });

    return harvest.getTimeEntries(EFFORTINFO, FUTURETIME)
      .then(function(response) {
        Should(response.length).equal(0);
      });
  });

  it('Test Error Getting Time Entries for a non-existant project', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(null, ERRORRESULT)
    });

    var badEffort = JSON.parse(JSON.stringify(EFFORTINFO));
    badEffort.project = BADPROJECT;
    return harvest.getTimeEntries(badEffort, SINCETIME)
      .then(function(response) {
        Should(response.length).be(0);
      })
      .catch(function (reason) {
        Should(reason).not.be.null;
        Should(reason.error.statusCode).equal(CODENOTFOUND);
        Should(reason.error.message).equal(TIMEERRORMESSAGE);
      });
  });

  it('Test Get Task Entries', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(TASKREPONSE, null)
    });

    return harvest.getTaskEntries(EFFORTINFO)
      .then(function(response) {
        Should(response).deepEqual(EXPECTEDTASKLIST);
      });
  });

  it('Test Getting a 404 response on Task Entries', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(null, ERRORRESULT)
    });

    var badEffort = JSON.parse(JSON.stringify(EFFORTINFO));
    badEffort.project = BADPROJECT;
    return harvest.getTaskEntries(badEffort)
      .then(function(response) {
        Should(response.length).be(0);
      })
      .catch(function (reason) {
        Should(reason).not.be.null;
        Should(reason.error.statusCode).equal(CODENOTFOUND);
        Should(reason.error.message).equal(TASKERRORMESSAGE);
      });
  });
});

describe('Harvest Utility Function Tests', function() {

  it('Translate task_id into task_name', function(done) {
    var time = JSON.parse(JSON.stringify(TIMERESPONSE));

    Should(time[0].day_entry).not.have.property('task_name');
    Should(time[0]).not.have.property('_id');
    harvest.replaceTaskIdwithName(time, EXPECTEDTASKLIST);
    Should(time[0]).have.property('_id');
    Should(time[0].day_entry).have.property('task_name');

    done();
  });

  it('Map Harvest to common format', function(done) {
    var time = JSON.parse(JSON.stringify(TIMERESPONSE));

    harvest.replaceTaskIdwithName(time, EXPECTEDTASKLIST);
    var aDatedEffortArray = harvest.mapHarvestEffort(time);
    Should(aDatedEffortArray.length).equal(time.length);
    done();
  });
});

describe('Harvest Real Service Tests', function() {
  var aSetOfInfo = {};

  before (function(){
    aSetOfInfo = new utils.ProcessingInfo(utils.dbProjectPath(PROJECTNAME));
    aSetOfInfo.rawLocation = constants.RAWEFFORT;
    aSetOfInfo.storageFunction = MongoDB.upsertData;
  });

  it('Test That When I call Load Entries that I have mapped the task name instead of the task ID', function() {
    this.timeout(5000);

    return harvest.loadTimeEntries(EFFORTINFO, aSetOfInfo, SINCETIME)
      .then(function(response) {
        Should(response.length).be.above(0);
      });
  });

  it('Test That Load Entries returns empty when no data', function() {
    this.timeout(5000);

    return harvest.loadTimeEntries(EFFORTINFO, aSetOfInfo, FUTURETIME)
      .then(function(response) {
        Should(response.length).equal(0);
      });
  });
});
