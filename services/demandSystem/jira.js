'use strict';

const constants = require('../../util/constants');
const Config = require('config');
const errorHelper = require('../errors');
const HttpStatus = require('http-status-codes');
const Log4js = require('log4js');
const R = require('ramda');
const Rest = require('restler');
const utils = require('../../util/utils');
const ValidUrl = require('valid-url');
const moment = require('moment');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

//
//  SAMPLE JIRA DATA HEADER
//
// {
//     "expand": "schema,names",
//     "startAt": 0,
//     "maxResults": 50,
//     "total": 355,
//     "issues":
//     [
//
//
//  SAMPLE JIRA ITEM DATA
//
//    Of note here is the history item of resolution.  Workflows in Jira can be customized.
//    Some of those workflows define status values as resolutions.  (think bug tracking)
//    Others do not.  Thus the algoritm needs to support resolution as a status change.
//
//    Also a "released" issue has a history item of Fix Version.
//    Will figure out what to do about this.
//
// {
//   "_id": "16607",
//   "expand": "operations,versionedRepresentations,editmeta,changelog,renderedFields",
//   "id": "16607",
//   "self": "https://digitalrig.atlassian.net/rest/api/latest/issue/16607",
//   "key": "NETWRKDIAG-14",
//   "changelog": {
//     "startAt": 0,
//     "maxResults": 8,
//     "total": 8,
//     "histories": [
//       {
//         "id": "33115",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T03:55:07.314-0600",
//         "items": {
//           "field": "Rank",
//           "fieldtype": "custom",
//           "from": "",
//           "fromString": "",
//           "to": "",
//           "toString": "Ranked higher"
//         }
//       },
//       {
//         "id": "33123",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T04:16:38.749-0600",
//         "items": {
//           "field": "status",
//           "fieldtype": "jira",
//           "from": "10000",
//           "fromString": "Backlog",
//           "to": "10501",
//           "toString": "In Progress"
//         }
//       },
//       {
//         "id": "33124",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T04:16:40.482-0600",
//         "items": {
//           "field": "assignee",
//           "fieldtype": "jira",
//           "from": null,
//           "fromString": null,
//           "to": "david.moss",
//           "toString": "David Moss"
//         }
//       },
//       {
//         "id": "33144",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T06:49:15.171-0600",
//         "items": {
//           "field": "resolution",
//           "fieldtype": "jira",
//           "from": null,
//           "fromString": null,
//           "to": "10000",
//           "toString": "Done"
//         }
//       },
//       {
//         "id": "33147",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T06:49:37.405-0600",
//         "items": {
//           "field": "summary",
//           "fieldtype": "jira",
//           "from": null,
//           "fromString": "Auto size nodes",
//           "to": null,
//           "toString": "Relative sized nodes"
//         }
//       },
//       {
//         "id": "33165",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-06T10:02:44.412-0600",
//         "items": {
//           "field": "project",
//           "fieldtype": "jira",
//           "from": "12403",
//           "fromString": "Kaban With Cadence ",
//           "to": "12404",
//           "toString": "Organization Communication Network Digaram"
//         }
//       },
//       {
//         "id": "33213",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-04-08T08:10:01.227-0600",
//         "items": {
//           "field": "Rank",
//           "fieldtype": "custom",
//           "from": "",
//           "fromString": "",
//           "to": "",
//           "toString": "Ranked higher"
//         }
//       },
//       {
//         "id": "36187",
//         "author": {
//           "self": "https://digitalrig.atlassian.net/rest/api/2/user?username=david.moss",
//           "name": "david.moss",
//           "key": "david.moss",
//           "emailAddress": "david.moss@wipro.com",
//           "avatarUrls": {
//             "48x48": "https://digitalrig.atlassian.net/secure/useravatar?ownerId=david.moss&avatarId=11700",
//             "24x24": "https://digitalrig.atlassian.net/secure/useravatar?size=small&ownerId=david.moss&avatarId=11700",
//             "16x16": "https://digitalrig.atlassian.net/secure/useravatar?size=xsmall&ownerId=david.moss&avatarId=11700",
//             "32x32": "https://digitalrig.atlassian.net/secure/useravatar?size=medium&ownerId=david.moss&avatarId=11700"
//           },
//           "displayName": "David Moss",
//           "active": true,
//           "timeZone": "America/Denver"
//         },
//         "created": "2016-05-25T08:16:23.817-0600",
//         "items": {
//           "field": "Fix Version",
//           "fieldtype": "jira",
//           "from": null,
//           "fromString": null,
//           "to": "11500",
//           "toString": "0.1"
//         }
//       }
//     ]
//   },
//   "fields": {
//     "summary": "Relative sized nodes",
//     "issuetype": {
//       "self": "https://digitalrig.atlassian.net/rest/api/2/issuetype/10001",
//       "id": "10001",
//       "description": "A user story. Created by JIRA Software - do not edit or delete.",
//       "iconUrl": "https://digitalrig.atlassian.net/secure/viewavatar?size=xsmall&avatarId=10315&avatarType=issuetype",
//       "name": "Story",
//       "subtask": false,
//       "avatarId": 10315
//     },
//     "updated": "2016-05-25T08:16:23.000-0600",
//     "created": "2016-04-06T03:22:14.000-0600",
//     "status": {
//       "self": "https://digitalrig.atlassian.net/rest/api/2/status/10002",
//       "description": "Issues can only move to done after they've been tested",
//       "iconUrl": "https://digitalrig.atlassian.net/images/icons/subtask.gif",
//       "name": "Done",
//       "id": "10002",
//       "statusCategory": {
//         "self": "https://digitalrig.atlassian.net/rest/api/2/statuscategory/3",
//         "id": 3,
//         "key": "done",
//         "colorName": "green",
//         "name": "Done"
//       }
//     }
//   }
// }

exports.loadRawData = function(demandInfo, processingInfo, sinceTime) {
  logger.info(`loadStoryEntries for ${demandInfo.project} updated since [${sinceTime}]`);

  return new Promise(function (resolve, reject) {
    module.exports.loadJiraDemand(demandInfo, [], sinceTime)
    .then( function (stories) {
      logger.debug(`total stories read - ${stories.length}`);
      if (stories.length < 1) {
        resolve(stories);
      }

      var enhancedStories = module.exports.fixHistoryData(stories);
      processingInfo.storageFunction(processingInfo.dbUrl, processingInfo.rawLocation, enhancedStories)
      .then (function (allRawData) {
        resolve(allRawData);
      })
      .catch(function (reason) {
        reject(reason);
      });

    })
    .catch( function(reason) {
      reject(reason);
    });
  });
}

exports.transformRawToCommon = function(issueData, systemInformation) {
  logger.info('mapJiraDemand into a common format');

  var commonDataFormat = [];

  issueData.forEach(function (aStory) {
    var commonDemandEntry = new utils.CommonDemandEntry(aStory.id);
    commonDemandEntry.uri = aStory.self;
    var historyEntry = new utils.DemandHistoryEntry(systemInformation.flow[0].name, aStory.fields.created);

    aStory.changelog.histories.forEach(function (history) {
      if (history.items.field === 'status' || history.items.field === 'resolution') {
        historyEntry.changeDate = history.created;
        commonDemandEntry.history.push(historyEntry);

        // if this is a resolution status change where the item was moved from the resolved state
        // there is no indication of the new state.  So this just assumes the issue is in the most
        // recent previous state.  One hopes that there is never a case where an issue is created
        // in a resolved state, but I think the code will work anyway.
        if (R.isNil(history.items.toString)) {
          var index = (commonDemandEntry.history.length < 2) ? 0 : commonDemandEntry.history.length - 2
          historyEntry = new utils.DemandHistoryEntry(commonDemandEntry.history[index].statusValue, history.created);
        } else {
          historyEntry = new utils.DemandHistoryEntry(history.items.toString, history.created);
        }
      } else if (history.items.field === 'Fix Version') {
        // this really isn't a status change per se, but a release event.
        // this just gives the resolution status a valid end date.
        // this item will be dropped at this point in the summary data.
        historyEntry.changeDate = history.created;
        commonDemandEntry.history.push(historyEntry);
        historyEntry = new utils.DemandHistoryEntry(history.items.field + '-' + history.items.toString, history.created);
      }
    });
    commonDemandEntry.history.push(historyEntry);
    commonDataFormat.push(commonDemandEntry);
  });

  return commonDataFormat;
}

function buildJQL(project, startPosition, since) {
  const expand = ['changelog', 'history', 'items'];
  const fields = ['issuetype', 'created', 'updated', 'status', 'key', 'summary'];
  const jqlData = `search?jql=project=${project} AND issueType=${constants.JIRADEMANDTYPE} AND updated>=${since}`;
  const queryString = `${jqlData}&startAt=${startPosition}&expand=${expand.toString()}&fields=${fields.toString()}`;

  logger.debug(`queryString:[${queryString}]`);
  return queryString;
}

exports.loadJiraDemand = function(demandInfo, issuesSoFar, sinceTime) {
  logger.info(`loadJiraDemand() for JIRA project ${demandInfo.project}.  Start Pos ${issuesSoFar.length}`);

  return new Promise(function (resolve, reject) {
    if (!(ValidUrl.isUri(demandInfo.url))) {
      reject (errorHelper.errorBody(HttpStatus.BAD_REQUEST, `invalid demand URL [${demandInfo.url}]`));
    }

    Rest.get(demandInfo.url + buildJQL(demandInfo.project, issuesSoFar.length, sinceTime),
      {headers: utils.createBasicAuthHeader(demandInfo.userData)}
      ).on('complete', function (data, response) {
        if (response.statusCode === HttpStatus.OK) {
          logger.info(`Success reading demand from [${data.startAt}] count [${data.issues.length}] of [${data.total}]`);

          var issues = issuesSoFar.concat(data.issues);
          if ((data.issues.length > 0) && (issues.length < data.total)) {
            module.exports.loadJiraDemand(demandInfo, issues, sinceTime)
            .then( function(issues) {  // unwind the promise chain
              resolve(issues);
            })
          } else {
            resolve(issues);
          }
        } else {
          logger.error("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
          reject(errorHelper.errorBody(response.statusCode, 'Error retrieving stories from Jira'));
        }
      }).on('fail', function (data, response) {
        logger.error("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving stories from Jira'));
      }).on('error', function (data, response) {
        logger.error("ERROR: " + data.message + " / " + response);
        reject(errorHelper.errorBody(response.statusCode, 'Error retrieving stories from Jira'));
      });
  });
}

exports.testDemand = function(project) {
  logger.info(`testDemand() for JIRA Project ${project.name}`);
  return new Promise(function (resolve) {
    if (!ValidUrl.isUri(project.demand.url)) {
      logger.debug(`ERROR, invalid url: ${project.demand.url} on project ${project.name}`)
      resolve({ status: constants.STATUSERROR, data: `invalid demand URL [${project.demand.url}]` });
    }

    if (R.isNil(project.demand.project) || R.isEmpty(project.demand.project)) {
      resolve({ status: constants.STATUSERROR, data: `[Project] must be a valid Jira project name` });
    }

    if (R.isNil(project.demand.authPolicy) || R.isEmpty(project.demand.authPolicy)) {
      resolve({ status: constants.STATUSERROR, data: `[Auth Policy] must be filled out` });
    }

    if (R.isNil(project.demand.userData) || R.isEmpty(project.demand.userData)) {
      resolve({ status: constants.STATUSERROR, data: `[User Data] must be filled out` });
    }

    if (R.isNil(project.demand.flow) || R.isEmpty(project.demand.flow)) {
      resolve({ status: constants.STATUSERROR, data: `Missing [Flow] information` });
    }

    Rest.get(project.demand.url + buildJQL(project.demand.project, 0, moment().format(constants.DBDATEFORMAT)),
      {headers: utils.createBasicAuthHeader(project.demand.userData)}
    ).on('complete', function() {
      resolve({ status: constants.STATUSOK });
    }).on('fail', function (data, response) {
      logger.debug("FAIL: " + response.statusCode + " MESSAGE " + response.statusMessage);
      resolve({ status: constants.STATUSERROR, data});
    }).on('error', function (data, response) {
      logger.debug("ERROR: " + data.message + " / " + response);
      resolve({ status: constants.STATUSERROR, data });
    });
  })
}


// Just what the heck is going on here?
// For whatever reason, when I searialze a Jira Issue,
// the history item array turns into [Object] which isn't helpful at all
// given that the array is always contains 1 element this essentially
// turns the array of 1 element into an object so that it can be stored "correctly"
exports.fixHistoryData = function(stories) {
  logger.info(`fixHistoryData for ${stories.length} stories`);

  stories.forEach(function (aStory) {
    aStory['_id'] = aStory.id;
    aStory.changelog.histories.forEach(function (history) {
      history.items = R.clone(history.items[0]);
    });
  });

  return(stories);
}
