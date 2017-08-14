'use strict'

const constants = require('../util/constants');
const testConstants = require('./testConstants');
const utils = require('../util/utils');
const dataStore = require('../services/datastore/mongodb');
const event = require('../services/event');
const statusIndicators = require('../services/statusIndicators');
const Sinon = require('sinon');

const R = require('ramda');
const CO = require('co');
const Should = require('should');
const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const SAMPLEPROJECTDATA = {
  name: 'COLLECTION-FOR-UNITESTING', // warning - I can't figure out how to use runtime constants for defineing other constants - change at your own risk
  program: "Projection Test Data",
  portfolio: "Unit Test Data",
  description: "A set of basic test data to be used to validate behavior of client systems.",
  startDate: null,
  endDate: null,
  demand: {},
  defect: {},
  effort: {
    source: 'GOODSOURCE',
    url: 'https://builditglobal.harvestapp.com',
    project: 'GOODPROJECT',
    authPolicy: 'Basic',
    userData: 'cGF1bC5rYXJzdGVuQHdpcHJvLmNvbTpXaDFwSXRHMDBk',
    role: []
  },
  projection: {}
};

describe('Event', () => {
  const sandbox = Sinon.sandbox.create();

  describe('processEventData', () => {

    describe('single system', () => {
      let processingInstructions;
      let anEvent;
      let aSystemEvent;
      let insertedDocument;

      beforeEach('setup', function () {
        sandbox.stub(statusIndicators, 'getStatuses').resolves();
        sandbox.stub(event, 'updateProjectStatus').resolves();
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
          yield event.processEventData()(aSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(aSystemEvent).match(updatedEvent.effort);
        });
      });

      it('sets an end time on the event is complete', () => {
        return CO(function* () {
          yield event.processEventData()(aSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.endTime).not.null();
        });
      });

      it('does not set an end time on the event is incomplete', () => {
        return CO(function* () {
          // Setting demand as not null so the event is incomplete
          yield dataStore.updateDocumentPart(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id, constants.DEMANDSECTION, {});

          yield event.processEventData()(aSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.endTime).is.null();
        });
      });


      it('sets an event as complete', () => {
        return CO(function* () {
          const successfulSystemEvent = R.merge(aSystemEvent, { status: constants.SUCCESSEVENT });
          yield event.processEventData()(successfulSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.status).equal(constants.SUCCESSEVENT);
        });
      });

      it('sets an event as failure', () => {
        return CO(function* () {
          const successfulSystemEvent = R.merge(aSystemEvent, { status: constants.FAILEDEVENT });
          yield event.processEventData()(successfulSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id)
          Should(updatedEvent.status).equal(constants.FAILEDEVENT);
        });
      });
    });

    describe('multiple systems', () => {
      let processingInstructions;
      let anEvent;
      let anEffortSystemEvent;
      beforeEach('setup', function () {
        sandbox.stub(statusIndicators, 'getStatuses').resolves();
        sandbox.stub(event, 'updateProjectStatus').resolves();
        processingInstructions = new utils.ProcessingInfo(testConstants.UNITTESTPROJECT);
        processingInstructions.eventSection = constants.EFFORTSECTION;
        anEvent = new utils.DataEvent(constants.LOADEVENT);
      });

      it('does not mark the event as complete if all systems are not complete', () => {
        return CO(function* () {
          anEvent.effort = {};
          anEvent.demand = {};
          anEffortSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, '');
          const insertedDocument = (yield dataStore.insertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [anEvent])).ops[0]
          yield event.processEventData()(anEffortSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.endTime).is.null();
        });
      });

      it('marks event.status as success when all systems are completed successfully', () => {
        return CO(function* () {
          anEvent.effort = {};
          anEvent.demand = new utils.SystemEvent(constants.SUCCESSEVENT, '');
          anEffortSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, '');
          const insertedDocument = (yield dataStore.insertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [anEvent])).ops[0]
          yield event.processEventData()(anEffortSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.status).match(constants.SUCCESSEVENT);
        });
      });

      it('marks event.status as failed when at least one systems fail', () => {
        return CO(function* () {
          anEvent.effort = {};
          anEvent.demand = new utils.SystemEvent(constants.SUCCESSEVENT, '');
          anEffortSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, '');
          const insertedDocument = (yield dataStore.insertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [anEvent])).ops[0]
          yield event.processEventData()(anEffortSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.status).match(constants.FAILEDEVENT);
        });
      });

      it('marks event.status as failed when all systems fail', () => {
        return CO(function* () {
          anEvent.effort = {};
          anEvent.demand = new utils.SystemEvent(constants.FAILEDEVENT, '');
          anEffortSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, '');
          const insertedDocument = (yield dataStore.insertData(processingInstructions.dbUrl, constants.EVENTCOLLECTION, [anEvent])).ops[0]
          yield event.processEventData()(anEffortSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id);
          Should(updatedEvent.status).match(constants.FAILEDEVENT);
        });
      });
    });

    describe('updating project status', () => {
      let processingInstructions;
      let anEvent;
      let aSystemEvent;
      let insertedDocument;

      beforeEach(() => {
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

      it('fails if the statuses are not returned', () => {
        return CO(function* () {
          sandbox.stub(statusIndicators, 'getStatuses').rejects();
          sandbox.stub(event, 'updateProjectStatus').resolves();
          const successfulSystemEvent = R.merge(aSystemEvent, { status: constants.SUCCESSEVENT });
          yield event.processEventData()(successfulSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id)
          Should(updatedEvent.status).equal(constants.FAILEDEVENT);
        });
      });

      it('fails if unable to update the status on the project', () => {
        return CO(function* () {
          sandbox.stub(statusIndicators, 'getStatuses').resolves();
          sandbox.stub(event, 'updateProjectStatus').rejects();
          const successfulSystemEvent = R.merge(aSystemEvent, { status: constants.SUCCESSEVENT });
          yield event.processEventData()(successfulSystemEvent, processingInstructions, insertedDocument._id)
          const updatedEvent = yield dataStore.getDocumentByID(processingInstructions.dbUrl, constants.EVENTCOLLECTION, insertedDocument._id)
          Should(updatedEvent.status).equal(constants.FAILEDEVENT);
        });
      });

      it('updates the project status', () => {
        return CO(function* () {
          sandbox.stub(statusIndicators, 'getStatuses').resolves();
          sandbox.stub(event, 'updateProjectStatus').resolves();
          const successfulSystemEvent = R.merge(aSystemEvent, { status: constants.SUCCESSEVENT });
          yield event.processEventData()(successfulSystemEvent, processingInstructions, insertedDocument._id)
          Should(event.updateProjectStatus.callCount).equal(1);
        });
      })
    });
  })

  describe('updateProjectStatus', () => {
    function makeStatuses() {
      return {
        demand: [{ status: constants.STATUSOK }, { status: constants.STATUSOK }],
        defect: [{ status: constants.STATUSOK }, { status: constants.STATUSOK }],
        effort: [{ status: constants.STATUSOK }, { status: constants.STATUSOK }],
      }
    }

    function getProjectStatus() {
      return dataStore.getDocumentByName(utils.dbCorePath(), constants.PROJECTCOLLECTION, SAMPLEPROJECTDATA.name)
      .then(project => {
        return project.status;
      });
    }

    beforeEach(() => {
      return CO(function* () {
        yield dataStore.insertData(utils.dbCorePath(), constants.PROJECTCOLLECTION, [SAMPLEPROJECTDATA] )
      });
    });
    
    it('does nothing if no statuses are passed in', () => {
      return CO(function* () {
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), {});
        const status = yield getProjectStatus();
        Should(status).be.undefined();
      });
    });

    it('marks the status as OK if all of the statuses are green', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSOK);
      });
    });

    it('marks the status as WARN if any demand statuses are WARN', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.demand[0].status = constants.STATUSWARNING;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSWARNING);
      });
    });

    it('marks the status as WARN if any defect statuses are WARN', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.defect[0].status = constants.STATUSWARNING;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSWARNING);
      });
    });

    it('marks the status as WARN if any effort statuses are WARN', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.effort[0].status = constants.STATUSWARNING;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSWARNING);
      });
    });

    it('marks the status as ERROR if any demand statuses are ERROR', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.effort[0].status = constants.STATUSERROR;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSERROR);
      });
    });

    it('marks the status as ERROR if any defect statuses are ERROR', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.effort[0].status = constants.STATUSERROR;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSERROR);
      });
    });

    it('marks the status as ERROR if any demand the statuses are ERROR', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.effort[0].status = constants.STATUSERROR;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSERROR);
      });
    });

    it('ERROR statuses take precedence over WARN statuses', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        statuses.demand[0].status = constants.STATUSERROR;
        statuses.defect[0].status = constants.STATUSWARN;
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield getProjectStatus();
        Should(status).equal(constants.STATUSERROR);
      });
    });

    it('stores the statuses in the correct collection', () => {
      return CO(function* () {
        const statuses = makeStatuses();
        yield event.updateProjectStatus(SAMPLEPROJECTDATA, utils.dbProjectPath(SAMPLEPROJECTDATA.name), statuses);
        const status = yield dataStore.getAllData(utils.dbProjectPath(SAMPLEPROJECTDATA.name), constants.STATUSCOLLECTION)
        Should(status).match(R.flatten(makeStatuses()));
      });
    });

    afterEach(() => {
      return CO(function* () {
        yield dataStore.clearData(utils.dbCorePath(), constants.PROJECTCOLLECTION);
      });
    })
  });

  afterEach(() => {
    sandbox.restore();
    return CO(function* () {
      yield dataStore.clearData(utils.dbProjectPath(testConstants.UNITTESTPROJECT), constants.EVENTCOLLECTION);
    });
  });
});



