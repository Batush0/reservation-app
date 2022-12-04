const Mysql = require("./MySql");

const dbs = {
  mysql: new Mysql(),
};

module.exports = { dbs };
