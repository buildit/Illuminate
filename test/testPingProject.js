const R = require('ramda');
const Should = require('should');
const CO = require('co');
const constants = require('../util/constants');
const pingProject = require('../services/v1/pingProject');
const demand = require('../services/demandSystem/index');
const defect = require('../services/defectSystem/index');
const effort = require('../services/effortSystem/index');

const Sinon = require('sinon');
require('sinon-as-promised')

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

describe('pingProject', () => {
  const sandbox = Sinon.sandbox.create();
  
  before(() => {
    sandbox.stub(demand.jira, 'testDemand').resolves({ status: constants.STATUSOK });
    sandbox.stub(demand.trello, 'testDemand').resolves({ status: constants.STATUSOK });
    sandbox.stub(defect.jira, 'testDefect').resolves({ status: constants.STATUSOK });
    sandbox.stub(effort.harvest, 'testEffort').resolves({ status: constants.STATUSOK });
  });

  describe('check', () => {
    const baseProject = {
      name: 'A Test Project',
      demand: {
        source: 'Jira',
      },
      defect: {
        source: 'Jira',
      },
      effort: {
        source: 'Harvest',
      }
    }
    
    describe('demand', () => {
      it('passes when there is demand and Jira as a source', () =>
        CO(function* () {
          const result = yield pingProject.check(baseProject);
          Should(result.demand.status).equal(constants.STATUSOK);
        })
      );

      it('passes when there is demand and Trello as a source', () =>
        CO(function* () {
          const project = R.merge(baseProject, { demand: { source: 'Trello' } });
          const result = yield pingProject.check(project);
          Should(result.demand.status).equal(constants.STATUSOK);
        })
      );

      it('fails if there is no demand', () =>
        CO(function* () {
          const project = R.omit(['demand'], baseProject);
          const result = yield pingProject.check(project);
          Should(result.demand.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if there is no demand source', () =>
        CO(function* () {
          const project = R.merge(baseProject, { demand: { } });
          const result = yield pingProject.check(project);
          Should(result.demand.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if the demand source is anything other than "Jira" or "Trello"', () =>
        CO(function* () {
          const project = R.merge(baseProject, { demand: { source: 'bad!' } });
          const result = yield pingProject.check(project);
          Should(result.demand.status).equal(constants.STATUSERROR);
        })
      );
    });

    describe('defect', () => {
      it('passes when there is defect and Jira as a source', () =>
        CO(function* () {
          const result = yield pingProject.check(baseProject);
          Should(result.defect.status).equal(constants.STATUSOK);
        })
      );

      it('fails if there is no defect', () =>
        CO(function* () {
          const project = R.omit(['defect'], baseProject);
          const result = yield pingProject.check(project);
          Should(result.defect.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if there is no defect source', () =>
        CO(function* () {
          const project = R.merge(baseProject, { defect: { } });
          const result = yield pingProject.check(project);
          Should(result.defect.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if the defect source is anything other than "Jira" or "Trello"', () =>
        CO(function* () {
          const project = R.merge(baseProject, { defect: { source: 'bad!' } });
          const result = yield pingProject.check(project);
          Should(result.defect.status).equal(constants.STATUSERROR);
        })
      );
    });

    describe('effort', () => {
      it('passes when there is effort and Harvest as a source', () =>
        CO(function* () {
          const result = yield pingProject.check(baseProject);
          Should(result.effort.status).equal(constants.STATUSOK);
        })
      );

      it('fails if there is no effort', () =>
        CO(function* () {
          const project = R.omit(['effort'], baseProject);
          const result = yield pingProject.check(project);
          Should(result.effort.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if there is no effort source', () =>
        CO(function* () {
          const project = R.merge(baseProject, { effort: { } });
          const result = yield pingProject.check(project);
          Should(result.effort.status).equal(constants.STATUSERROR);
        })
      );

      it('fails if the effort source is anything other than "Jira" or "Trello"', () =>
        CO(function* () {
          const project = R.merge(baseProject, { effort: { source: 'bad!' } });
          const result = yield pingProject.check(project);
          Should(result.effort.status).equal(constants.STATUSERROR);
        })
      );
    });
  });

  after(() => {
    sandbox.restore();
  });
})
