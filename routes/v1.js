'use strict'

const Express = require('express');
const Router = Express.Router();
const about = require('../services/about');
const apiDocs = require('../services/swaggerDoc');
const loadEvent = require('../services/v1/loadEvent');
const pingProject = require('../services/v1/pingProject');

Router.get('/ping', about.ping);
Router.get('/ping/deep', about.deepPing);
Router.get('/doc', apiDocs.serveDoc);

Router.post('/project/:name/event', loadEvent.createNewEvent);
Router.get('/project/:name/event/', loadEvent.listEvents);
Router.get('/project/:name/event/:id', loadEvent.listAnEvent);

Router.get('/project/:name/ping', pingProject.ping)

module.exports = Router;
