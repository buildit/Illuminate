'use strict'

const Config = require('config');
const HttpStatus = require('http-status-codes');
const jira = require('../services/demandSystem/jira');
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
 expand: "operations,versionedRepresentations,editmeta,changelog,renderedFields",
 id: "16204",
 self: "https://digitalrig.atlassian.net/rest/api/latest/issue/16204",
 key: "CIT-1055",
 changelog:
    {
     startAt: 0,
     maxResults: 4,
     total: 4,
     histories:
        [
            {
             id: "32317",
             author:
                {
                 self: "https://digitalrig.atlassian.net/rest/api/2/user?username=amit.sarkar",
                 name: "amit.sarkar",
                 key: "amit.sarkar",
                 emailAddress: "amit.sarkar5@wipro.com",
                 avatarUrls:
                    {
                     a48x48: "https://digitalrig.atlassian.net/secure/useravatar?avatarId=11529",
                     a24x24: "https://digitalrig.atlassian.net/secure/useravatar?size=small&avatarId=11529",
                     a16x16: "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&avatarId=11529",
                     a32x32: "https://digitalrig.atlassian.net/secure/useravatar?size=medium&avatarId=11529"
                    },
                 displayName: "Amit Sarkar",
                 active: true,
                 timeZone: "Asia/Kolkata"
                },
             created: "2016-03-22T02:59:01.278-0600",
             items:
                [
                    {
                     field: "assignee",
                     fieldtype: "jira",
                     from: "amit.sarkar",
                     fromString: "Amit Sarkar",
                     to: "darpan.36",
                     'toString': "Darpan"
                    }
                ]
            },
            {
             id: "32327",
             author:
                {
                 self: "https://digitalrig.atlassian.net/rest/api/2/user?username=darpan.36",
                 name: "darpan.36",
                 key: "darpan.36",
                 emailAddress: "darpan.36@wipro.com",
                 avatarUrls:
                    {
                     a48x48: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=48",
                     a24x24: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=24",
                     a16x16: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=16",
                     a32x32: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=32"
                    },
                 displayName: "Darpan",
                 active: false,
                 timeZone: "America/Denver"
                },
             created: "2016-03-22T04:40:55.652-0600",
             items:
                [
                    {
                     field: "status",
                     fieldtype: "jira",
                     from: "10000",
                     fromString: "Backlog",
                     to: "10700",
                     'toString': "UX Review"
                    }
                ]
            },
            {
             id: "32372",
             author:
                {
                 self: "https://digitalrig.atlassian.net/rest/api/2/user?username=ashok.chockalingam",
                 name: "ashok.chockalingam",
                 key: "ashok.chockalingam",
                 emailAddress: "ashok.chockalingam@wipro.com",
                 avatarUrls:
                    {
                     a48x48: "https://secure.gravatar.com/avatar/ca496c8ecf18d8aa471b3353c4db250b?d=mm&s=48",
                     a24x24: "https://secure.gravatar.com/avatar/ca496c8ecf18d8aa471b3353c4db250b?d=mm&s=24",
                     a16x16: "https://secure.gravatar.com/avatar/ca496c8ecf18d8aa471b3353c4db250b?d=mm&s=16",
                     a32x32: "https://secure.gravatar.com/avatar/ca496c8ecf18d8aa471b3353c4db250b?d=mm&s=32"
                    },
                 displayName: "Ashok Bharathi Chockalingam",
                 active: false,
                 timeZone: "America/Denver"
                },
             created: "2016-03-22T23:27:04.360-0600",
             items:
                [
                    {
                     field: "status",
                     fieldtype: "jira",
                     from: "10700",
                     fromString: "UX Review",
                     to: "10501",
                     'toString': "In Progress"
                    }
                ]
            },
            {
             id: "32530",
             author:
                {
                 self: "https://digitalrig.atlassian.net/rest/api/2/user?username=darpan.36",
                 name: "darpan.36",
                 key: "darpan.36",
                 emailAddress: "darpan.36@wipro.com",
                 avatarUrls:
                    {
                     a48x48: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=48",
                     a24x24: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=24",
                     a16x16: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=16",
                     a32x32: "https://secure.gravatar.com/avatar/885cc62992c29993fa7389fb7c00ea70?d=mm&s=32"
                    },
                 displayName: "Darpan",
                 active: false,
                 timeZone: "America/Denver"
                },
             created: "2016-03-24T03:39:03.178-0600",
             items:
                [
                    {
                     field: "status",
                     fieldtype: "jira",
                     from: "10501",
                     fromString: "In Progress",
                     to: "10700",
                     'toString': "UX Review"
                    }
                ]
            }
        ]
    },
 fields:
    {
     summary: "Select Meeting Screen Changes..",
     issuetype:
        {
         self: "https://digitalrig.atlassian.net/rest/api/2/issuetype/10001",
         id: "10001",
         description: "A user story. Created by JIRA Software - do not edit or delete.",
         iconUrl: "https://digitalrig.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10315&avatarType=issuetype",
         name: "Story",
         subtask: false,
         avatarId: 10315
        },
     created: "2016-03-22T02:46:19.000-0600",
     reporter:
        {
         self: "https://digitalrig.atlassian.net/rest/api/2/user?username=murugaraj.arjunamurthy",
         name: "murugaraj.arjunamurthy",
         key: "murugaraj.arjunamurthy",
         emailAddress: "murugaraj.arjunamurthy@wipro.com",
         avatarUrls:
            {
             a48x48: "https://secure.gravatar.com/avatar/253d32d0af4451e7c56a0914b0ca38eb?d=mm&s=48",
             a24x24: "https://secure.gravatar.com/avatar/253d32d0af4451e7c56a0914b0ca38eb?d=mm&s=24",
             a16x16: "https://secure.gravatar.com/avatar/253d32d0af4451e7c56a0914b0ca38eb?d=mm&s=16",
             a32x32: "https://secure.gravatar.com/avatar/253d32d0af4451e7c56a0914b0ca38eb?d=mm&s=32"
            },
         displayName: "Murugaraj Arjunamurthy",
         active: true,
         timeZone: "America/Denver"
        },
     priority:
        {
         self: "https://digitalrig.atlassian.net/rest/api/2/priority/3",
         iconUrl: "https://digitalrig.atlassian.net/images/icons/priorities/medium.svg",
         name: "Medium",
         id: "3"
        },
     updated: "2016-03-24T03:39:03.000-0600",
     status:
        {
         self: "https://digitalrig.atlassian.net/rest/api/2/status/10700",
         description: "",
         iconUrl: "https://digitalrig.atlassian.net/images/icons/statuses/generic.png",
         name: "UX Review",
         id: "10700",
         statusCategory:
            {
             self: "https://digitalrig.atlassian.net/rest/api/2/statuscategory/4",
             id: 4,
             key: "indeterminate",
             colorName: "yellow",
             name: "In Progress"
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

const DEMANDINFO = {
  source: 'JIRA',
  url: "https://digitalrig.atlassian.net/rest/api/latest/",
  project: 'CIT',
  authPolicy: 'Basic',
  userData: 'ZGlnaXRhbHJpZzpEMWchdGFsUmln',
  flow: [{name: 'Backlog'}]};

const EXPECTEDCOMMON = [
  { _id: '16204',
      history:[
        {statusValue: 'Backlog', startDate: '2016-03-22', changeDate: '2016-03-22'},
        {statusValue: 'UX Review', startDate: '2016-03-22', changeDate: '2016-03-23'},
        {statusValue: 'In Progress', startDate: '2016-03-23', changeDate: '2016-03-24'},
        {statusValue: 'UX Review', startDate: '2016-03-24', changeDate: null} ]
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

    return jira.loadJiraDemand(DEMANDINFO, [])
      .then(function(response) {
        Should(response.length).equal(0);
      });
  });
});

describe('Test getting all of the stories in a single request. ', function() {
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
      on:Sinon.stub().yields(SINGLEJIRARESPOSE, jiraResponse)
    });

    return jira.loadJiraDemand(DEMANDINFO, [])
      .then(function(response) {
        Should(response.length).equal(1);
      });
  });
});


describe('Test creating common demand format from Jira issues ', function() {

  it('Convert Jira Object', function(done) {
    var commonDataFormat = jira.transformRawToCommon([RAWJIRASTORY], DEMANDINFO.flow[0].name);

    Should(commonDataFormat).match(EXPECTEDCOMMON);
    done();
  });
});

describe('Jira GetRawData - fail getting stories', function() {
  var aSetOfInfo = {};

  beforeEach(function() {
    this.loadJiraDemand = Sinon.stub(jira, 'loadJiraDemand').rejects(ERRORRESULT);
  });

  afterEach(function() {
    jira.loadJiraDemand.restore();
  })

  it('Make sure the error is returned', function() {

    return jira.loadRawData(DEMANDINFO, aSetOfInfo, SINCETIME)
      .then(function() {
        Should.ok(false);
      }).catch ( function(error) {
        logger.debug(error);
        Should(error).deepEqual(ERRORRESULT);
      });
  });
});
