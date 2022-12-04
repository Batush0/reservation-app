module.exports = class Database {
  constructor() {
    require("dotenv").config();
    this.connection = undefined;
  }

  connect() {}

  getConnection() {}

  verifyAuthentication(mailAddress) {
    return new Promise();
  }
  login(userData) {
    return new Promise();
  }
  keepRefreshtoken(mailAddress, refresh_token) {
    return new Promise();
  }

  signup(userData) {
    return new Promise();
  }

  authenticateToken(userId) {
    return new Promise();
  }

  token(userId, refresh_token) {
    return new Promise();
  }

  logout(userId, refresh_token) {
    return new Promise();
  }

  iWantToOwn(businessData, userId) {
    return new Promise();
  }
};
