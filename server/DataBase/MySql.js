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
};
