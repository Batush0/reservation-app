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
          `select password_hash from user where e_mail = '${mailAddress}'`,
          (error, result) => {
            if (error) throw error;
            if (!result.length)
              return reject("böyle bir kullanıcı olduğuna emin misin ?");
            resolve({ passwordHashes: result });
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

        const location = userData.country
          ? `${userData.country} , ${userData.city}`
          : "covered location";
        this.connection.query(
          `insert into log(
          user_id,
          device,
          location,
          ip_address
          ) values(
            (select user_id from user where e_mail = '${userData.mailAddress}' limit 1),
            '${userData._device}',
            '${location}',
            '${userData.ip}'
            );
            select user_name , user_id ,secret_access_token,secret_refresh_token from user where e_mail = '${userData.mailAddress}'
            `,
          (error, result) => {
            if (error) reject(error);
            resolve({
              userName: result[1][0].user_name,
              userId: result[1][0].user_id,
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
        `update user set refresh_token = '${refresh_token}' where e_mail = '${mailAddress}'`,
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

        await new Promise((res) => {
          this.connection.query(
            `select * from user where phone_no = ${userData.phoneNo} and nation = ${userData.nation}`,
            (error, result) => {
              if (error) throw error;
              if (result.length)
                return reject("telefon numarası mevcut. Kullanılamaz !");
              return res();
            }
          );
        });

        this.connection.query(
          `insert into user(
            user_name, 
            password_hash,
            phone_no,
            nation,
            e_mail,
            secret_access_token,
            secret_refresh_token,
            refresh_token
            ) values(
              '${userData.userName}',
              '${userData.passwordHash}',
              ${userData.phoneNo},
              ${userData.nation},
              '${userData.eMail}',
              '${userData.secret_access_token}',
              '${userData.secret_refresh_token}',
              '${userData.refresh_token}'
            );`,
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
          `select secret_access_token from user where user_id = ${userId}`,
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
          `select secret_refresh_token ,secret_access_token, user_name from user where refresh_token = '${refreshToken}'`,
          (error, result) => {
            if (error) throw error;
            if (!result.length) return reject(401);
            resolve({
              userName: result[0].user_name,
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
    return new Promise((resolve, reject) => {
      try {
        this.connection.query(
          `select * from user where user_id=${userId} and refresh_token = '${refresh_token}'`,
          (error, result) => {
            if (error) throw error;
            if (!result.length) return reject(403);
            this.connection.query(
              `update user set refresh_token = null where user_id = ${userId}`
            );
            resolve();
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  iWantToOwn(businessData, userId) {
    return new Promise(async (resolve, reject) => {
      try {
        //  eğer daha önce bir iwanttotown isteği varsa veya
        //zaten işletme tanımlıysa isteği kabul edilemez
        this.connection.query(
          `select if(
        (select count(*) from business where id = ${userId}) < 1 
        , (select if(
          (select count(*) from i_want_to_own where id = ${userId}) < 1 , 1,0)
          ) ,0)as 'anyRequest';`,
          (error, result) => {
            if (error) throw error;
            if (result[0].anyRequest == 0) throw "Istek kabul edilemez";
            this.connection.query(
              `insert into i_want_to_own(
                id,
                name,
                country,
                city,
                district,
                neighborhood,
                street,
                no,
                phone_no,
                mail,
                web_site_url,
                nation
          ) values(
            ${userId},
            '${businessData.name}',
            '${businessData.country}',
            '${businessData.city}',
            '${businessData.district}',
            '${businessData.neighborhood}',
            '${businessData.street}',
            '${businessData.no}',
            '${businessData.phoneNo}',
            '${businessData.mail}',
            '${businessData.webSiteUrl ? businessData.webSiteUrl : "null"}',
            ${businessData.nation}
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
