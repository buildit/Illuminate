'use strict'

const constants = require('../util/constants');
const MongoDB = require('../services/datastore/mongodb');
const jira = require('../services/demandSystem/jira');
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
                     atoString: "Darpan"
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
                     atoString: "UX Review"
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
                     atoString: "In Progress"
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
                     atoString: "UX Review"
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


describe('Test Fixing of Jira History', function() {

    it('Convert Jira Object', function(done) {
      var fixedStory = jira.fixHistoryData([RAWJIRASTORY]);

      Should(fixedStory[0].changelog.histories[0].items).not.Array();
      done();
    });
});

describe('Empty result test', function() {

  beforeEach(function() {
    this.get = Sinon.stub(Rest, 'get');
  });

  afterEach(function() {
    Rest.get.restore();
  })

  it('Test Getting an empty set of Jira Issues', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(EMPTYJIRARESPONSE, null)
    });

    return jira.loadJiraDemand(DEMANDINFO, [])
      .then(function(response) {
        Should(response.length).equal(0);
      });
  });
});

describe('Single Pass through ', function() {

  beforeEach(function() {
    this.get = Sinon.stub(Rest, 'get');
  });

  afterEach(function() {
    Rest.get.restore();
  })

  it('Test Getting an empty set of Jira Issues', function() {
    Rest.get.returns({
      on:Sinon.stub().yields(SINGLEJIRARESPOSE, null)
    });

    return jira.loadJiraDemand(DEMANDINFO, [])
      .then(function(response) {
        Should(response.length).equal(1);
      });
  });
});


describe('Test creating common demand format from issue ', function() {

  it('Convert Jira Object', function(done) {
    var commonDataFormat = jira.mapJiraDemand([RAWJIRASTORY], DEMANDINFO);

    Should(commonDataFormat[0].history.length).equal(3);
    done();
  });
});

  // it('Test Error Getting Time Entries for a non-existant project', function() {
  //   Rest.get.returns({
  //     on:Sinon.stub().yields(null, ERRORRESULT)
  //   });
  //
  //   var badEffort = JSON.parse(JSON.stringify(EFFORTINFO));
  //   badEffort.project = BADPROJECT;
  //   return harvest.getTimeEntries(badEffort, SINCETIME)
  //     .then(function(response) {
  //       Should(response.length).be(0);
  //     })
  //     .catch(function (reason) {
  //       Should(reason).not.be.null;
  //       Should(reason.error.statusCode).equal(CODENOTFOUND);
  //       Should(reason.error.message).equal(TIMEERRORMESSAGE);
  //     });
  // });
  //
  // it('Test Get Task Entries', function() {
  //   Rest.get.returns({
  //     on:Sinon.stub().yields(TASKREPONSE, null)
  //   });
  //
  //   return harvest.getTaskEntries(EFFORTINFO)
  //     .then(function(response) {
  //       Should(response).deepEqual(EXPECTEDTASKLIST);
  //     });
  // });
  //
  // it('Test Getting a 404 response on Task Entries', function() {
  //   Rest.get.returns({
  //     on:Sinon.stub().yields(null, ERRORRESULT)
  //   });
  //
  //   var badEffort = JSON.parse(JSON.stringify(EFFORTINFO));
  //   badEffort.project = BADPROJECT;
  //   return harvest.getTaskEntries(badEffort)
  //     .then(function(response) {
  //       Should(response.length).be(0);
  //     })
  //     .catch(function (reason) {
  //       Should(reason).not.be.null;
  //       Should(reason.error.statusCode).equal(CODENOTFOUND);
  //       Should(reason.error.message).equal(TASKERRORMESSAGE);
  //     });
  // });
  //});

// describe('Harvest Utility Function Tests', function() {
//
//   it('Translate task_id into task_name', function(done) {
//     var time = JSON.parse(JSON.stringify(TIMERESPONSE));
//
//     Should(time[0].day_entry).not.have.property('task_name');
//     Should(time[0]).not.have.property('_id');
//     harvest.replaceTaskIdwithName(time, EXPECTEDTASKLIST);
//     Should(time[0]).have.property('_id');
//     Should(time[0].day_entry).have.property('task_name');
//
//     done();
//   });
//
//   it('Map Harvest to common format', function(done) {
//     var time = JSON.parse(JSON.stringify(TIMERESPONSE));
//
//     harvest.replaceTaskIdwithName(time, EXPECTEDTASKLIST);
//     var aDatedEffortArray = harvest.mapHarvestEffort(time);
//     Should(aDatedEffortArray.length).equal(time.length);
//     done();
//   });
// });
//
// describe('Harvest Real Service Tests', function() {
//   var aSetOfInfo = {};
//
//   before (function(){
//     aSetOfInfo = new utils.ProcessingInfo(utils.dbProjectPath(PROJECTNAME),
//       constants.RAWEFFORT,
//       constants.COMMONEFFORT,
//       MongoDB.upsertData);
//   });
//
//   it('Test That When I call Load Entries that I have mapped the task name instead of the task ID', function() {
//     this.timeout(5000);
//
//     return harvest.loadTimeEntries(EFFORTINFO, aSetOfInfo, SINCETIME)
//       .then(function(response) {
//         Should(response.length).be.above(0);
//       });
//   });
//
//   it('Test That Load Entries returns empty when no data', function() {
//     this.timeout(5000);
//
//     return harvest.loadTimeEntries(EFFORTINFO, aSetOfInfo, FUTURETIME)
//       .then(function(response) {
//         Should(response.length).equal(0);
//       });
//   });
// });
