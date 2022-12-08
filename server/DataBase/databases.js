const Mysql = require("./MySql");

const dbs = {
  mysql: new Mysql(),
};

const selectedDb = dbs.mysql;

module.exports = selectedDb;
