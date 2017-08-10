'use strict'

const constants = require('../util/constants');
const mongoDB = require('../services/datastore/mongodb');
const Should = require('should');
const testConstants = require('./testConstants');
const utils = require('../util/utils');
const { CommonProjectStatusResult } = require('../util/utils');
const demandVsProjected = require('../services/statusIndicators/demandVsProjected');

const CO = require('co');
const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

describe('Test Creation of Event', function() {
  var url = '';
  var anEvent = {};

  before('setup', function () {
      url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.effort = {};
  });

  it('Create Event', function() {
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

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.EVENTCOLLECTION);
  });
});

describe('Create an Event and then update the event and make sure the event is completed as success', function() {
  var url = '';
  var anEvent = { };
  var aSystemEvent = {};
  const aProject = { _id: 'some project id' };

  before('setup', function () {
    url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
    anEvent = new utils.DataEvent(constants.LOADEVENT);
    anEvent.status = constants.PENDINGEVENT;
    anEvent.effort = {};
    aSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, "Message");
  });

  it('Create Event', function() {
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

  it('Update Event', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent, aProject)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.SUCCESSEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.EVENTCOLLECTION);
  });
});

describe('Create an Event and make sure statuses are updated', function() {
  var url = '';
  var anEvent = { demand: null, effect: null, effort: null };
  var aSystemEvent = {};
  const aProject = { _id: 'some project id' };
  const expectedResult = [];

  before('setup', function () {
    return CO(function* foo() {
      url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.demand = null,
      anEvent.effect = null,
      anEvent.effort = {};
      aSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, "Message");
      expectedResult.push(stubRsiResult(demandVsProjected, 'Demand vs. Projected', 100, 200, constants.STATUSOK));
      yield mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent);
      yield mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent, aProject); 
    });
  });

  it('correctly stores the individual rsi results in the database', () => {
    return CO(function* foo() {
      const storedRsi = yield mongoDB.getAllData(url, constants.STATUSCOLLECTION);
      Should(storedRsi).match(expectedResult);
    });
  }) 

  after('Delete the stuff you created', function() {
    return CO(function* foo() {
      restoreRsiStub(demandVsProjected);
      yield mongoDB.clearData(url, constants.STATUSCOLLECTION);
      yield mongoDB.clearData(url, constants.EVENTCOLLECTION);
    });
  });

  function stubRsiResult(rsiObject, name, actual, projected, status) {
    const expected = CommonProjectStatusResult(name, actual, projected, status);
    rsiObject._evaluate = rsiObject.evaluate;
    rsiObject.evaluate = () => Promise.resolve(expected);
    return expected;
  }

  function restoreRsiStub(rsiObject) {
    rsiObject.evaluate = rsiObject._evaluate;
    delete rsiObject._evaluate;  
  }
});

describe('Create an Event and then update the event and make sure the event is completed as failure', function() {
  var url = '';
  var anEvent = { demand: null, effect: null, effort: null };
  var aSystemEvent = {};
  const aProject = {};

  before('setup', function () {
      url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.effort = {};
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, "Message");
  });

  it('Create Event', function() {
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

  it('Update Event', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent, aProject)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.FAILEDEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.EVENTCOLLECTION);
  });
});


describe('Create an Event with multiple updates and  make sure the event is completed as success', function() {
  var url = '';
  var anEvent = { demand: null, effect: null, effort: null };
  var aSystemEvent = {};
  const aProject = {};

  before('setup', function () {
      url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.demand = {};
      anEvent.effort = {};
      aSystemEvent = new utils.SystemEvent(constants.SUCCESSEVENT, "Message");
  });

  it('Create Event', function() {
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

  it('Update Effort - should not be complete', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent, aProject)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.PENDINGEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  it('Update Demand - should now be complete', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent, aProject)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.SUCCESSEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.EVENTCOLLECTION);
  });
});

describe('Create an Event with multiple updates and make sure the event is completed as failure', function() {
  var url = '';
  var anEvent = {};
  var aSystemEvent = {};

  before('setup', function () {
      url = utils.dbProjectPath(testConstants.UNITTESTPROJECT);
      anEvent = new utils.DataEvent(constants.LOADEVENT);
      anEvent.status = constants.PENDINGEVENT;
      anEvent.demand = {};
      anEvent.effort = {};
      aSystemEvent = new utils.SystemEvent(constants.FAILEDEVENT, "Message");
  });

  it('Create Event', function() {
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

  it('Update Effort - should not be complete', function() {
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.PENDINGEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  it('Update Demand - should now be complete', function() {
    aSystemEvent.status = constants.SUCCESSEVENT;
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
    .then ( function() {
      return mongoDB.getDocumentByID(url, constants.EVENTCOLLECTION, anEvent._id)
      .then ( function(readData) {
        Should(readData.status).equal(constants.FAILEDEVENT);
      })
    }).catch ( function(error) {
      logger.debug(error);
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.EVENTCOLLECTION);
  });
});
