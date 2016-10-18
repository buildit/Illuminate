'use strict'

const constants = require('../util/constants');
const mongoDB = require('../services/datastore/mongodb');
const Should = require('Should');
const utils = require('../util/utils');

const Config = require('config');
const Log4js = require('log4js');

Log4js.configure('config/log4js_config.json', {});
const logger = Log4js.getLogger();
logger.setLevel(Config.get('log-level'));

const PROJECTNAME = 'UNITESTEFFORT';
const VALIDID = 'f9d6e2df-ca15-4ebb-ac1d-1a6bf1129af9';
const INVALIDID = 99999999;
const VALIDNAME = "UncleBob";
const INVALIDNAME = "UncleRobert";

const GETTESTDATA = [
  {
    _id: VALIDID,
    name: VALIDNAME,
    otherStuff: "2015-10-21"
  }
];

const EFFORTDATAFIRST = [
  {
    _id: 439722386,
    day_entry:
    {
      id: 439722386,
      name: "UncleBob",
      spent_at: "2015-10-21",
      hours: 8
    }
  },
  {
    _id: 439722390,
    day_entry:
    {
      id: 439722390,
      spent_at: "2015-10-22",
      hours: 8
    }
  }
];

const EFFORTDATASECOND = [
  {
    _id: 439722386,
    day_entry:
    {
      id: 439722386,
      spent_at: "2015-10-21",
      hours: 4
    }
  },
  {
    _id: 12345678,
    day_entry:
    {
      id: 12345678,
      spent_at: "2015-10-23",
      hours: 8
    }
  }
];

const EXPECTEDAFTERUPDATE = [
  {
    _id: 439722386,
    day_entry:
    {
      id: 439722386,
      spent_at: "2015-10-21",
      hours: 4
    }
  },
  {
    _id: 439722390,
    day_entry:
    {
      id: 439722390,
      spent_at: "2015-10-22",
      hours: 8
    }
  },
  {
    _id: 12345678,
    day_entry:
    {
      id: 12345678,
      spent_at: "2015-10-23",
      hours: 8
    }
  }
];

describe('Test of Insert and Update function. (well and the getall and clear too)', function() {
  var url = '';

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
  });

  it('Insert 2 things', function() {
    return mongoDB.upsertData(url, constants.RAWEFFORT, EFFORTDATAFIRST)
    .then ( function() {
      process.nextTick(function() {
        return mongoDB.getAllData(url, constants.RAWEFFORT)
        .then ( function(readData) {
          Should(EFFORTDATAFIRST).deepEqual(readData);
        })
      });
    }).catch ( function() {
      Should.ok(false);
    });
  });

  it('Now provide data that updates 1, inserts another, and does not contain the third', function() {
    return mongoDB.upsertData(url, constants.RAWEFFORT, EFFORTDATASECOND)
    .then ( function() {
      process.nextTick(function() {
        return mongoDB.getAllData(url, constants.RAWEFFORT)
        .then ( function(readData) {
          Should(EXPECTEDAFTERUPDATE).deepEqual(readData);
        })
      });
    }).catch ( function() {
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.RAWEFFORT);
  });

});

describe('Test of Wipe and Insert', function() {
  var url = '';

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
  });

  it('Insert 2 things', function() {
    return mongoDB.insertData(url, constants.RAWEFFORT, EFFORTDATAFIRST)
    .then ( function() {
      return mongoDB.getAllData(url, constants.RAWEFFORT)
      .then ( function(readData) {
        Should(EFFORTDATAFIRST).deepEqual(readData);
      })
    }).catch ( function() {
      Should.ok(false);
    });
  });

  it('Now provide differnt data, should wipe the first data out', function() {
    return mongoDB.wipeAndStoreData(url, constants.RAWEFFORT, EFFORTDATASECOND)
    .then ( function() {
      return mongoDB.getAllData(url, constants.RAWEFFORT)
      .then ( function(readData) {
        Should(EFFORTDATASECOND).deepEqual(readData);
      })
    }).catch ( function() {
      Should.ok(false);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.RAWEFFORT);
  });
});

describe('Test of Get by ID and by Name', function() {
  var url = '';

  before('setup', function () {
      url = utils.dbProjectPath(PROJECTNAME);
  });

  it('Insert a thing', function() {
    return mongoDB.insertData(url, constants.RAWEFFORT, GETTESTDATA)
    .then ( function() {
      return mongoDB.getAllData(url, constants.RAWEFFORT)
      .then ( function(readData) {
        Should(GETTESTDATA).deepEqual(readData);
      })
    }).catch ( function() {
      Should.ok(false);
    });
  });

  it('Get by name', function() {
    return mongoDB.getDocumentByName(url, constants.RAWEFFORT, VALIDNAME)
      .then ( function(readData) {
        Should(GETTESTDATA[0]).deepEqual(readData);
      }).catch ( function() {
        Should.ok(false);
      });
  });

  it('Get by name - Not Found', function() {
    return mongoDB.getDocumentByName(url, constants.RAWEFFORT, INVALIDNAME)
      .then ( function() {
        Should.ok(false);
      }).catch ( function() {
        Should.ok(true);
      });
  });

  it('Get by _ID', function() {
    return mongoDB.getDocumentByID(url, constants.RAWEFFORT, VALIDID)
      .then ( function(readData) {
        Should(GETTESTDATA[0]).deepEqual(readData);
      }).catch ( function() {
        Should.ok(false);
      });
  });

  it('Get by _ID - Not Found', function() {
    return mongoDB.getDocumentByID(url, constants.RAWEFFORT, INVALIDID)
    .then ( function() {
      Should.ok(false);
    }).catch ( function() {
      Should.ok(true);
    });
  });

  after('Delete the stuff you created', function() {
    return mongoDB.clearData(url, constants.RAWEFFORT);
  });

});
