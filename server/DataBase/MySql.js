const Database = require("./database.js");
var mysql = require("mysql");

module.exports = class Mysql extends Database {
  constructor() {
    console.log(Database);
    super();
    this.connection = mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
    });
    this.connect();
  }
  connect() {
    this.connection.connect(function (err) {
      if (err) throw err;
      console.log("⛓️  Mysql Connected ! ⛓️");
    });
  }

  verifyAuthentication(mailAddress) {
    return new Promise((resolve, reject) => {
      try {
        this.connection.query(
          `select password from user where e_mail = '${mailAddress}'`,
          (error, result) => {
            if (error) throw error;
            if (!result.length)
              return reject("böyle bir kullanıcı olduğuna emin misin ?");
            resolve({ passwordHash: result[0].password });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  login(userData) {
    //mailAddress,_device,country,city
    return new Promise(async (resolve, reject) => {
      try {
        //keeping log

        // `${userData.country} , ${userData.city}`
        this.connection.query(
          `insert into log(
          id,
          device,
          ${userData.country ? "area ," : ""}
          ip
          ) values(
            (select id from user where e_mail = '${
              userData.mailAddress
            }' limit 1),
            '${userData._device}',
            ${
              userData.country
                ? "'" + userData.country + "/" + userData.city + "',"
                : ""
            }
            '${userData.ip}'
            );
            select u.id , t.secret_access_token,t.secret_refresh_token from user u , token t where u.e_mail = '${
              userData.mailAddress
            }'
            `,
          (error, result) => {
            if (error) reject(error);
            resolve({
              user_id: result[1][0].user_id,
              secret_access_token: result[1][0].secret_access_token,
              secret_refresh_token: result[1][0].secret_refresh_token,
            });
          }
        );
      } catch (error) {
        reject();
      }
    });
  }
  keepRefreshtoken(mailAddress, refresh_token) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `update token set refresh_token = '${refresh_token}' where id = (select id from user where e_mail = '${mailAddress}' limit 1)`,
        (error) => {
          if (error) reject(error);
          resolve();
        }
      );
    });
  }

  signup(userData) {
    return new Promise(async (resolve, reject) => {
      try {
        await new Promise((res) => {
          this.connection.query(
            `select * from user where e_mail = '${userData.eMail}'`,
            (error, result) => {
              if (error) throw error;
              if (result.length)
                return reject("email adresi mevcut. Kullanılamaz !");
              return res();
            }
          );
        });

        this.connection.query(
          `insert into user(
            password,
            e_mail
            ) values(
              '${userData.passwordHash}',
              '${userData.eMail}'
            );
            insert into token(
              id,
              secret_access_token,
              secret_refresh_token
              ) values(
                (select id from user where e_mail = '${userData.eMail}' limit 1),
                '${userData.secret_access_token}',
                '${userData.secret_refresh_token}'
              )`,
          (error, result) => {
            if (error) throw error;
            resolve();
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
  authenticateToken(userId) {
    return new Promise((resolve, reject) => {
      try {
        this.connection.query(
          `select secret_access_token from token where id = ${userId}`,
          (error, result) => {
            if (error) throw error;
            resolve({ secret_access_token: result[0].secret_access_token });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  token(userId, refreshToken) {
    return new Promise((resolve, reject) => {
      try {
        this.connection.query(
          `select secret_refresh_token ,secret_access_token from token where refresh_token = '${refreshToken}' and id = ${userId}`,
          (error, result) => {
            if (error) throw error;
            if (!result.length) return reject(401);
            resolve({
              secret_refresh_token: result[0].secret_refresh_token,
              secret_access_token: result[0].secret_access_token,
            });
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
  logout(userId, refresh_token) {
    return new Promise((resolve) => {
      this.connection.query(
        `update token set refresh_token = null where id = ${userId}`
      );
      resolve();
    });
  }

  iWantToOwn(businessData, userId) {
    return new Promise(async (resolve, reject) => {
      try {
        //  eğer daha önce bir iwanttotown isteği varsa veya
        //zaten işletme tanımlıysa isteği kabul edilemez
        this.connection.query(
          `select if(
        (select count(*) from business where id = ${userId}) < 1,0,1 )as 'anyRequest';`,
          (error, result) => {
            if (error) throw error;
            if (result[0].anyRequest == 1) throw "Istek kabul edilemez";
            this.connection.query(
              `insert into business(
                name,
                phone_no,
                e_mail,
                nation,
                work_start,
                work_end,
                capacity,
                coordinates,
                workers,
                owner,
                occupancy
          ) values(
            '${businessData.name}',
            '${businessData.phoneNo}',
            '${businessData.eMail}',
            ${businessData.nation},
            ${businessData.workStart},
            ${businessData.workEnd},
            ${businessData.capacity},
            '${businessData.coordinates}',
            ${businessData.workers},
            ${userId},
            ${businessData.occupancy}
          )`,
              (error, insertResult) => {
                if (error) throw error;
                resolve();
              }
            );
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
  reserve(userId, businessId, start, end, amount) {
    this.connection.query(`insert into reservation(
        id,business,start,end,amount
      ) values(
        ${userId},${businessId},${start},${end},${amount}
      );`);
  }

  cancelReservation(id) {
    return new Promise((resolve, reject) => {
      this.connection.query(`delete from reservation where id=${id}`);
      resolve();
    });
  }

  authenticateAdmin(id, secret_access_token) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `select 
        if((select count(*) from token where secret_access_token = '${secret_access_token}' limit 1) > 0,
        (select count(*) from admin where id = ${id} > 0),
        0)as state`,
        (error, result) => {
          if (error) return reject(error);
          resolve(result[0]);
        }
      );
    });
  }

  authenticateBusinessUser(id) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `select business from worker where id = ${id}`,
        (e, result) => {
          if (!result.length) return reject("buna yetkin yok");
          this.connection.query(
            `select active from business where id=${result[0].business} `,
            (e, result) => {
              if ((result[0].active = 0)) return reject("işletme aktif değil");
              resolve();
            }
          );
        }
      );
    });
  }

  acceptIwantToOwn(id) {
    this.connection.query(`update business set active = 1 where id=${id}`);
  }

  denyIWantToOwn(id) {
    return new Promise(async (resolve, reject) => {
      await new Promise((res, rej) => {
        this.connection.query(
          `select active from business where id = ${id}`,
          (e, result) => {
            if (!result.length)
              return reject(`${id} id ile bağlantılı aktif istek bulunamadı`);
            if ((result.active = 1))
              return reject(`Hali hazırda aktif bir işletmeyi silemezsin !`);
            resolve();
          }
        );
      });
      this.connection.query(`delete from business where id=${id}`);
      resolve();
    });
  }

  getIWantToOwn(callback) {
    this.connection.query(
      "select * from business where active = 0",
      (e, result) => {
        callback(result);
      }
    );
  }

  updateUserMail(id, newValue) {
    return new Promise((resolve, reject) => {
      this.connection.query(
        `select * from user where e_mail = '${newValue}'`,
        (e, result) => {
          if (result.length) return reject();
          this.connection.query(
            `update user set e_mail = '${newValue}' where id=${id}`
          );
        }
      );
    });
  }
  updateUserPassword(id, newValue) {
    this.connection.query(
      `update user set password = '${newValue}' where id = ${id}`
    );
  }
  deleteUser(id) {
    this.connection.query(`delete from user where id = ${id}`);
  }
};
