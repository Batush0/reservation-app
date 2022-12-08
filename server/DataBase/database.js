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
  login({ mailAddress, _device, country, city, ip }) {
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

  reserve(userId, businessId, start, end, amount) {}
  cancelReservation(id) {
    return new Promise();
  }

  authenticateAdmin(id, secret_access_token) {
    return new Promise();
  }

  acceptIwantToOwn(id) {}
  getIWantToOwn(callback) {}
  denyIWantToOwn(id) {}

  updateUserMail(id, newValue) {
    return new Promise();
  }
  updateUserPassword(id, newValue) {}

  deleteUser(id) {}

  authenticateBusinessUser(id) {
    return new Promise();
  }
};
