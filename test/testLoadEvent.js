'use strict'

const constants = require('../util/constants');
const HttpMocks = require('node-mocks-http');
const HttpStatus = require('http-status-codes');
const loadEvent = require('../services/v1/loadEvent');
const MongoDB = require('../services/datastore/mongodb');
const Should = require('should');
const Sinon = require('sinon');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const NOPROJECT = 'ShouldNotExistProject';
const UNITTESTPROJECT = 'EventUnitTestProject';

function buildResponse() {
  return HttpMocks.createResponse({eventEmitter: require('events').EventEmitter})
}

describe('Test GET of Events', function() {
  var anEvent = {};
  var anotherEvent = {};

  before('Create Test Events', function() {
    anEvent = new utils.DataEvent(constants.LOADEVENT);
    anotherEvent = new utils.DataEvent(constants.UPDATEEVENT);
    var events = [anEvent, anotherEvent];
    return MongoDB.insertData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION, events );
  });

  after('Delete Project Details', function() {
    return MongoDB.clearData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION)
  });

  it('Test getting load events', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': UNITTESTPROJECT}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.OK);
      var body = response._getData();
      Should(body.length).equal(2);
      done();
    });

    loadEvent.listEvents(request, response);
  });

  it('Test getting load events for an invalid project', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': NOPROJECT}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.NOT_FOUND);
      var body = response._getData();
      Should(body.error.statusCode).equal(HttpStatus.NOT_FOUND);
      done();
    });

    loadEvent.listEvents(request, response);
  });
});

describe('Test GET of AN Event', function() {
  var anEvent = {};
  var anotherEvent = {};

  before('Create Test Events', function() {
    anEvent = new utils.DataEvent(constants.LOADEVENT);
    anotherEvent = new utils.DataEvent(constants.UPDATEEVENT);
    var events = [anEvent, anotherEvent];
    return MongoDB.insertData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION, events );
  });

  after('Delete Project Details', function() {
    return MongoDB.clearData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION)
  });

  it('Test getting a single load event', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': UNITTESTPROJECT, 'id': anotherEvent._id}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.OK);
      var body = response._getData();
      Should(body._id).equal(anotherEvent._id);
      done();
    });

    loadEvent.listAnEvent(request, response);
  });

  it('Test getting an events for an invalid id', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': UNITTESTPROJECT, 'id': 7}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.NOT_FOUND);
      var body = response._getData();
      Should(body.error.statusCode).equal(HttpStatus.NOT_FOUND);
      done();
    });

    loadEvent.listAnEvent(request, response);
  });

});

describe('Project Load Event Error Path Tests', function() {

  before('Create Test Project', function() {
    const projectData = [{
        name: UNITTESTPROJECT,
        program: "Projection Test Data",
        portfolio: "Unit Test Data",
        description: "A set of basic test data to be used to validate behavior of client systems.",
        startDate: null,
        endDate: null,
        demand: {},
        defect: {},
        effort: {},
        projection: {}}];

    var anEvent = new utils.DataEvent(constants.LOADEVENT);
    var events = [anEvent];
    return MongoDB.insertData(utils.dbCorePath(), constants.PROJECTCOLLECTION, projectData )
      .then( function() {
        return MongoDB.insertData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION, events );
      });
  });

  after('Delete Project Details', function() {
    return MongoDB.clearData(utils.dbCorePath(), constants.PROJECTCOLLECTION)
      .then(function() {
        return MongoDB.clearData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION)
      });
  });

  it('Create an invalid load event type', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': NOPROJECT},
      query: {'type': constants.LOADEVENT + 'FAIL'}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.BAD_REQUEST);
      var body = response._getData();
      Should(body.error.statusCode).equal(HttpStatus.BAD_REQUEST);
      done();
    });

    loadEvent.createNewEvent(request, response);
  });

  it('Create a load event for a non-existant project', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': NOPROJECT},
      query: {'type': constants.LOADEVENT}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.NOT_FOUND);
      var body = response._getData();
      Should(body.error.statusCode).equal(HttpStatus.NOT_FOUND);
      done();
    });

    loadEvent.createNewEvent(request, response);
  });

  it('Try to create a load event when there is an existing open event', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      params: {'name': UNITTESTPROJECT},
      query: {'type': constants.LOADEVENT}
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.CONFLICT);
      var body = response._getData();
      Should(body.error.statusCode).equal(HttpStatus.CONFLICT);
      done();
    });

    loadEvent.createNewEvent(request, response);
  });
});

describe('Project Load Event - create', function() {

  before('Create Test Project', function() {
    const projectData = [{
        name: UNITTESTPROJECT,
        program: "Projection Test Data",
        portfolio: "Unit Test Data",
        description: "A set of basic test data to be used to validate behavior of client systems.",
        startDate: null,
        endDate: null,
        demand: {},
        defect: {},
        effort: {},
        projection: {}}];

    return MongoDB.insertData(utils.dbCorePath(), constants.PROJECTCOLLECTION, projectData );
  });

  after('Delete Project Details', function() {
    return MongoDB.clearData(utils.dbCorePath(), constants.PROJECTCOLLECTION)
      .then(function() {
        return MongoDB.clearData(utils.dbProjectPath(UNITTESTPROJECT), constants.EVENTCOLLECTION)
      });
  });

  beforeEach(function() {
    this.kickoffLoad = Sinon.stub(loadEvent, 'kickoffLoad');
  });

  afterEach(function() {
    loadEvent.kickoffLoad.restore();
  })

  it('create a load event', function(done) {
    var response = buildResponse();
    var request  = HttpMocks.createRequest({
      path: TESTPATH,
      params: {'name': UNITTESTPROJECT},
      query: {'type': constants.LOADEVENT}
    });
    loadEvent.kickoffLoad.returns({
      on:Sinon.stub().yields(null)
    });

    response.on('end', function() {
      Should(response.statusCode).equal(HttpStatus.CREATED);
      var body = response._getData();
      Should(body).have.property('url');
      done();
    });

    loadEvent.createNewEvent(request, response);
  });
});
