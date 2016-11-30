'use strict'

const Config = require('config');
const HttpStatus = require('http-status-codes');
const jira = require('../services/defectSystem/jira');
const Log4js = require('log4js');
const Rest = require('restler');
const Should = require('should');
const Sinon = require('sinon');
require('sinon-as-promised');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

// NOTE:  I had to put an 'a' in front of the avart urls to get past compiler errors
const RAWJIRASTORY = {
      "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
      "id": "24904",
      "self": "https://digitalrig.atlassian.net/rest/api/latest/issue/24904",
      "key": "SYNAPSE-88",
      "changelog":
      {
          "startAt": 0,
          "maxResults": 2,
          "total": 2,
          "histories":
          [
              {
                  "id": "47774",
                  "author":
                  {
                      "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=digitalrig",
                      "name": "digitalrig",
                      "key": "digitalrig",
                      "emailAddress": "paul.karsten@wipro.com",
                      "avatarUrls":
                      {
                          "48x48": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=48",
                          "24x24": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=24",
                          "16x16": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=16",
                          "32x32": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=32"
                      },
                      "displayName": "Paul Karsten [Administrator]",
                      "active": true,
                      "timeZone": "America/Denver"
                  },
                  "created": "2016-11-23T14:39:12.428-0700",
                  "items":
                  [
                      {
                          "field": "status",
                          "fieldtype": "jira",
                          "from": "10000",
                          "fromString": "Backlog",
                          "to": "10001",
                          "toString": "Selected for development"
                      }
                  ]
              },
              {
                  "id": "47976",
                  "author":
                  {
                      "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=digitalrig",
                      "name": "digitalrig",
                      "key": "digitalrig",
                      "emailAddress": "paul.karsten@wipro.com",
                      "avatarUrls":
                      {
                          "48x48": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=48",
                          "24x24": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=24",
                          "16x16": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=16",
                          "32x32": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=32"
                      },
                      "displayName": "Paul Karsten [Administrator]",
                      "active": true,
                      "timeZone": "America/Denver"
                  },
                  "created": "2016-11-28T13:16:16.733-0700",
                  "items":
                  [
                      {
                          "field": "priority",
                          "fieldtype": "jira",
                          "from": "3",
                          "fromString": "Medium",
                          "to": "2",
                          "toString": "High"
                      }
                  ]
              }
          ]
      },
      "fields":
      {
          "summary": "Project Creation Journey Broken",
          "issuetype":
          {
              "self": "https://digitalrig.atlassian.net/rest/api/2/issuetype/1",
              "id": "1",
              "description": "A problem which impairs or prevents the functions of the product.",
              "iconUrl": "https://digitalrig.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10303&avatarType=issuetype",
              "name": "Bug",
              "subtask": false,
              "avatarId": 10303
          },
          "created": "2016-11-23T14:39:04.000-0700",
          "reporter":
          {
              "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=digitalrig",
              "name": "digitalrig",
              "key": "digitalrig",
              "emailAddress": "paul.karsten@wipro.com",
              "avatarUrls":
              {
                  "48x48": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=48",
                  "24x24": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=24",
                  "16x16": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=16",
                  "32x32": "https://secure.gravatar.com/avatar/886f42fb26825693a4c0fcf96ba08ed0?d=mm&s=32"
              },
              "displayName": "Paul Karsten [Administrator]",
              "active": true,
              "timeZone": "America/Denver"
          },
          "priority":
          {
              "self": "https://digitalrig.atlassian.net/rest/api/2/priority/2",
              "iconUrl": "https://digitalrig.atlassian.net/images/icons/priorities/high.svg",
              "name": "High",
              "id": "2"
          },
          "updated": "2016-11-28T13:16:16.000-0700",
          "status":
          {
              "self": "https://digitalrig.atlassian.net/rest/api/2/status/10001",
              "description": "",
              "iconUrl": "https://digitalrig.atlassian.net/images/icons/subtask.gif",
              "name": "Selected for development",
              "id": "10001",
              "statusCategory":
              {
                  "self": "https://digitalrig.atlassian.net/rest/api/2/statuscategory/4",
                  "id": 4,
                  "key": "indeterminate",
                  "colorName": "yellow",
                  "name": "In Progress"
              }
          }
      }
  };

const EMPTYJIRARESPONSE = {
  startAt: 0,
  maxResults: 50,
  total: 555,
  issues: []
};

const SINGLEJIRARESPOSE = {
  startAt: 0,
  maxResults: 50,
  total: 1,
  issues: [RAWJIRASTORY]
};

const DEFECTINFO = {
  source: 'JIRA',
  url: "https://digitalrig.atlassian.net/rest/api/latest/",
  project: 'CIT',
  authPolicy: 'Basic',
  userData: 'ZGlnaXRhbHJpZzpEMWchdGFsUmln',
  flow: [{name: 'Backlog'}]};

const EXPECTEDCOMMON = [
  { _id: '24904',
    key: 'SYNAPSE-88',
      history:[
        {statusValue: 'CREATED', severity: 'Medium', startDate: '2016-11-23T14:39:04.000-0700', changeDate: '2016-11-23T14:39:12.428-0700'},
        {statusValue: 'Selected for development', severity: 'Medium', startDate: '2016-11-23T14:39:12.428-0700', changeDate: '2016-11-28T13:16:16.733-0700'},
        {statusValue: 'Selected for development', severity: 'High', startDate: '2016-11-28T13:16:16.733-0700', changeDate: null} ]
  }
];

const CODENOTFOUND = 404;
const MESSAGENOTFOUND = 'There Be Dragons';
const ERRORRESULT = {statusCode: CODENOTFOUND, statusMessage: MESSAGENOTFOUND};
const SINCETIME = '2000-01-01+00:00';

describe('Test Fixing of Jira History', function() {

    it('Convert Jira Object', function(done) {
      var fixedStory = jira.fixHistoryData([RAWJIRASTORY]);

      Should(fixedStory[0].changelog.histories[0].items).not.Array();
      done();
    });
});

describe('Empty result from Jira test', function() {
  var jiraResponse = {};

  beforeEach(function() {
    this.get = Sinon.stub(Rest, 'get');
    jiraResponse.statusCode = HttpStatus.OK;
  });

  afterEach(function() {
    Rest.get.restore();
  })

  it('Test Getting an empty set of Jira Issues', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(EMPTYJIRARESPONSE, jiraResponse)
    });

    return jira.loadJiraDefects(DEFECTINFO, [])
      .then(function(response) {
        Should(response.length).equal(0);
      });
  });
});

describe('Test getting all of the defects in a single request. ', function() {
  var jiraResponse = {};

  beforeEach(function() {
    this.get = Sinon.stub(Rest, 'get');
    jiraResponse.statusCode = HttpStatus.OK;
  });

  afterEach(function() {
    Rest.get.restore();
  })

  it('Test Getting an empty set of Jira defects', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(SINGLEJIRARESPOSE, jiraResponse)
    });

    return jira.loadJiraDefects(DEFECTINFO, [])
      .then(function(response) {
        Should(response.length).equal(1);
      });
  });
});


describe('Test creating common demand format from Jira issues ', function() {

  it('Convert Jira Object', function(done) {
    var commonDataFormat = jira.transformRawToCommon([RAWJIRASTORY], DEFECTINFO);

    Should(commonDataFormat).match(EXPECTEDCOMMON);
    done();
  });
});

describe('Jira GetRawData - fail getting defects', function() {
  var aSetOfInfo = {};

  beforeEach(function() {
    this.loadJiraDefects = Sinon.stub(jira, 'loadJiraDefects').rejects(ERRORRESULT);
  });

  afterEach(function() {
    jira.loadJiraDefects.restore();
  })

  it('Make sure the error is returned', function() {

    return jira.loadRawData(DEFECTINFO, aSetOfInfo, SINCETIME)
      .then(function() {
        Should.ok(false);
      }).catch ( function(error) {
        logger.debug(error);
        Should(error).deepEqual(ERRORRESULT);
      });
  });
});
