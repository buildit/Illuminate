'use strict'

const constants = require('../util/constants');
const mongoDB = require('../services/datastore/mongodb');
const Should = require('Should');
const testConstants = require('./testConstants');
const utils = require('../util/utils');

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
  var anEvent = {};
  var aSystemEvent = {};

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
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
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


describe('Create an Event and then update the event and make sure the event is completed as failure', function() {
  var url = '';
  var anEvent = {};
  var aSystemEvent = {};

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
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.EFFORTSECTION, aSystemEvent)
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
  var anEvent = {};
  var aSystemEvent = {};

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
    return mongoDB.processEventData(url, constants.EVENTCOLLECTION, anEvent, constants.DEMANDSECTION, aSystemEvent)
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
