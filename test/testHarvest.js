'use strict'

const myDatastore = require('../services/datastore/mongodb');
const harvest = require('../services/effortSystem/harvest');
const Rest = require('restler');
const Should = require('should');
const Sinon = require('sinon');
require('sinon-as-promised');
const CO = require('co');
const R = require('ramda');
const constants = require('../util/constants');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const GOODPROJECT = 10284278;
const BADPROJECT = 98765432;

const SINCETIME = '2000-01-01+00:00';
const FUTURETIME = utils.dateFormatIWant() + '+23:59';

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

const MODIFIEDTIMERESPONSE = [
  {
    _id: 439722386,
    day_entry:
    {
      task_name: "Delivery",
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
    _id: 439722390,
    day_entry:
    {
      task_name: "Delivery",
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

const EXPECTEDCOMMONDATA = [
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

const CODENOTFOUND = 404;
const MESSAGENOTFOUND = 'There Be Dragons';
const ERRORRESULT = {statusCode: CODENOTFOUND, statusMessage: MESSAGENOTFOUND};

describe('testHarvest - Stubbed Tests', function() {
  const TIMEERRORMESSAGE = 'Error retrieving time entries from Harvest';
  const TASKERRORMESSAGE = 'Error retrieving task entries from Harvest';

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

describe('testHarvest -  Utility Function Test', function() {

  it('Translate task_id into task_name', function(done) {
    var time = JSON.parse(JSON.stringify(TIMERESPONSE));

    Should(time[0].day_entry).not.have.property('task_name');
    Should(time[0]).not.have.property('_id');
    harvest.replaceTaskIdwithName(time, EXPECTEDTASKLIST);
    Should(time[0]).have.property('_id');
    Should(time[0].day_entry).have.property('task_name');

    done();
  });
});

describe('testHarvest -  Data Convertion Test', function() {
  it('Convert', function(done) {
    var commonDataFormat = harvest.transformRawToCommon(MODIFIEDTIMERESPONSE);

    Should(commonDataFormat).deepEqual(EXPECTEDCOMMONDATA);
    done();
  });
});


describe('testHarvest -  GetRawData - fail getting time', function() {
  var aSetOfInfo = {};

  beforeEach(function() {
    this.getTimeEntries = Sinon.stub(harvest, 'getTimeEntries').rejects(ERRORRESULT);
  });

  afterEach(function() {
    harvest.getTimeEntries.restore();
  })

  it('Make sure the error is returned', function() {

    return harvest.loadRawData(EFFORTINFO, aSetOfInfo, SINCETIME)
      .then(function() {
        Should.ok(false);
      }).catch ( function(error) {
        Should(error).deepEqual(ERRORRESULT);
      });
  });
});

describe('testHarvest - GetRawData - fail getting task', function() {
  var aSetOfInfo = {};

  beforeEach(function() {
    this.getTimeEntries = Sinon.stub(harvest, 'getTimeEntries').resolves(TIMERESPONSE);
    this.getTaskEntries = Sinon.stub(harvest, 'getTaskEntries').rejects(ERRORRESULT);
  });

  afterEach(function() {
    harvest.getTimeEntries.restore();
    harvest.getTaskEntries.restore();
  })

  it('Make sure the error is returned', function() {

    return harvest.loadRawData(EFFORTINFO, aSetOfInfo, SINCETIME)
      .then(function() {
        Should.ok(false);
      }).catch ( function(error) {
        logger.debug(error);
        Should(error).deepEqual(ERRORRESULT);
      });
  });
});

describe('testHarvest - GetRawData - make sure count is returned', function() {
  var aSetOfInfo = {};

  beforeEach(function() {
    this.getTimeEntries = Sinon.stub(harvest, 'getTimeEntries').resolves(TIMERESPONSE);
    this.getTaskEntries = Sinon.stub(harvest, 'getTaskEntries').resolves(TASKREPONSE);
    this.upsertData = Sinon.stub(myDatastore, 'upsertData').resolves(MODIFIEDTIMERESPONSE);

    aSetOfInfo = new utils.ProcessingInfo('');
    aSetOfInfo.storageFunction = this.upsertData;
  });

  afterEach(function() {
    harvest.getTimeEntries.restore();
    harvest.getTaskEntries.restore();
    myDatastore.upsertData.restore();
  });

  it('Make sure the proper count', function() {

    return harvest.loadRawData(EFFORTINFO, aSetOfInfo, SINCETIME)
      .then(function(response) {
        Should(response).deepEqual(MODIFIEDTIMERESPONSE);
      }).catch ( function() {
        Should.ok(false);
      });
  });
});

describe('test/testHarvest - Harvest testEffort()', () => {
  const sandbox = Sinon.sandbox.create();

  const aProject = {
    name: 'Test Project',
    effort: {
      role: [{ name : `General / Delivery`, groupWith : "" }],
      source: 'Harvest',
      url: 'http://some.url',
      project: 'Some Harvest Project',
      authPolicy: 'Basic',
      userData: 'some secret key',
    }
  };

  afterEach(() => {
    sandbox.restore();
  })

  it('returns an error when the url is invalid.', () => {
    return CO(function* () {
      const project = R.mergeDeepRight(aProject, { effort: { url: 'invalid url' } });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when the harvest [project] is an empty string', () => {
    return CO(function* () {
      const project = R.mergeDeepRight(aProject, { effort: { project: '' } });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when the harvest [project] is null', () => {
    return CO(function* () {
      const effort = R.omit(['project'], aProject.effort);
      const project = R.mergeDeepRight(R.omit(['effort'], aProject), { effort });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [authPolicy] is an empty string', () => {
    return CO(function* () {
      const project = R.mergeDeepRight(aProject, { effort: { authPolicy: '' } });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [authPolicy] is null', () => {
    return CO(function* () {
      const effort = R.omit(['authPolicy'], aProject.effort);
      const project = R.mergeDeepRight(R.omit(['effort'], aProject), { effort });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [userData] is an empty string', () => {
    return CO(function* () {
      const project = R.mergeDeepRight(aProject, { effort: { userData: '' } });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [userData] is null', () => {
    return CO(function* () {
      const effort = R.omit(['userData'], aProject.effort);
      const project = R.mergeDeepRight(R.omit(['effort'], aProject), { effort });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [role] is an empty array', () => {
    return CO(function* () {
      const project = R.mergeDeepRight(aProject, { effort: { role: '' } });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns an error when [role] is null', () => {
    return CO(function* () {
      const effort = R.omit(['role'], aProject.effort);
      const project = R.mergeDeepRight(R.omit(['effort'], aProject), { effort });
      const result = yield harvest.testEffort(project);
      Should(result.status).equal(constants.STATUSERROR);
    });
  });

  it('returns green when the request to harvest is successful', () => {
    return CO(function* () {
      sandbox.stub(Rest, 'get').returns({
        on: sandbox.stub().yieldsTo()
      });
      const result = yield harvest.testEffort(aProject);
      Should(result.status).equal(constants.STATUSOK);
    });
  })
});
