'use strict'

const Config = require('config');
const constants = require('./constants');
const UUID = require('uuid');

exports.dbProjectPath = function (projectName) {
  var dbUrl = `${Config.get('datastore.dbUrl')}/${Config.get('datastore.context')}-${projectName.replace(/\W/g, '')}`;
  return dbUrl;
};

exports.dbCorePath = function () {
  return this.dbProjectPath(Config.get('datastore.rootDB'));
};

function generateRootServiceUrl () {
  var url = `http://${Config.get('server.url')}:${Config.get('server.port')}/v1/project`;
  return url;
};

exports.generateServiceUrl = function (projectName) {
  var url = `${generateRootServiceUrl()}/${encodeURIComponent(projectName)}`;
  return url;
};

exports.generateServiceUrlWithQuery = function (queryString) {
  var url = `${generateRootServiceUrl()}?${queryString}`;
  return url;
};

exports.generatePortlessServiceUrl = function (projectName) {
  var url = `http://${Config.get('server.url')}/v1/project/${encodeURIComponent(projectName)}`;
  return url;
};

exports.createBasicAuthHeader = function(encodedUser) {
  var headers = {
  	'Authorization': 'Basic ' +  encodedUser,
  	'Accept':'application/json',
  	'Content-Type':'application/json'};
  return headers;
}

//
//  Which is YYYY-MM-DD because is is the only way I can keep helpful utilities time zone adjusting for me
//
exports.dateFormatIWant = function (incomming) {
  var tmpDate = new Date(incomming);
  var theDay = tmpDate.getFullYear() + "-" + ('0' + (tmpDate.getMonth() + 1)).slice(-2) + "-" + ('0' + tmpDate.getDate()).slice(-2);
  return theDay;
};

exports.createDayArray = function (start, end) {
  var daysArray = [];
  var startDate = new Date(start);
  var endDate = new Date(end);
  var daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));

  for (var i = 0; i < daysDiff; i++) {
    daysArray.push(this.dateFormatIWant(startDate));
    startDate.setUTCDate(startDate.getUTCDate() + 1);
  }

  return daysArray;
};

exports.ProcessingInfo = function (dbUrl) {
  this.dbUrl = dbUrl;
  this.rawLocation = null;
  this.commonLocation = null;
  this.summaryLocation = null;
  this.eventSection = null;
  this.storageFunction = null;
}

exports.SystemEvent = function (status, message) {
  this.completion = new Date();
  this.status = status;
  this.message;
}

exports.DataEvent = function (type) {
  this._id = UUID.v4();
  this.type = type;
  this.startTime = new Date();
  this.endTime = null;
  this.since = constants.DEFAULTSTARTDATE;
  this.status = constants.PENDINGEVENT;
  this.note = "";
  this.demand = null;
  this.defect = null;
  this.effort = null;
}

exports.DemandHistoryEntry = function (status, startDate) {
  this.statusValue = status;
  this.startDate = module.exports.dateFormatIWant(startDate);
  this.changeDate = null;
}

exports.CommonDemandEntry = function (id) {
  this._id = id;
  this.history = [];
}
