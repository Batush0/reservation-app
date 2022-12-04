var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const crypto = require("crypto");
// var usersRouter = require('./routes/users');
const port = "8180";
const { dbs } = require("./DataBase/databases");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const argon2 = require("argon2");
const { match } = require("assert");
const countries = require("./Country/countries");
const device = require("express-device");
const geoip = require("geoip-lite");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use(device.capture());
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const database = dbs.mysql;

app.route("/").get((req, res) => {
  console.log(database);
  res.send({ hi: "hi" });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

//create business
//use mail to declare notifications
//user => request rezerv a filed , business confirm rezerv (has settings for this option : confirm stuff able to disable , so user could take a rezerv without business's permition)
//report system
//
process.on("uncaughtException", (err) => {
  console.log(err);
});

const verifyAuthentication = async (pw, hash) => {
  return await argon2.verify(hash, pw, {
    parallelism: 1,
    memoryCost: 64000,
    timeCost: 3,
  });
};

//sign works -sign in , sign up
app.patch("/login", async (req, res) => {
  try {
    //report the mail that someonse has logged in with this informations

    const { mailAddress, password } = req.body;

    //some conditions here
    if (!mailAddress) throw "giriş yapabilmek için mail adresini de yazmalısın";
    if (!password) throw "parola nerede ?";

    mailAddress.toLocaleLowerCase();

    //kimlik doğrulama
    await database
      .verifyAuthentication(mailAddress)
      .then(async ({ passwordHashes }) => {
        var verified;
        for (var i = 0; i < passwordHashes.length; i++) {
          if (
            await verifyAuthentication(
              password,
              passwordHashes[i].password_hash
            )
          )
            break;
          if (i === passwordHashes.length - 1) throw "kimlik doğrulanamadı";
        }
      });

    //cihaza ait birkaç bilgi
    const { country, city } = geoip.lookup(req.socket.remoteAddress) || {
      country: undefined,
      city: undefined,
    };
    const _device = req.device.type;
    const ip = req.ip;

    //log tutma
    database
      .login({ mailAddress, _device, country, city, ip })
      .then(
        async ({
          userName,
          userId,
          secret_access_token,
          secret_refresh_token,
        }) => {
          const user = { userName: userName, userId: userId };
          const accessToken = generateAccessToken(user, secret_access_token);
          const refresh_token = jwt.sign(user, secret_refresh_token);

          //save refresh token in db
          await database.keepRefreshtoken(mailAddress, refresh_token);

          res.json({ accessToken: accessToken, refresh_token: refresh_token });
        }
      );
  } catch (error) {
    res.send({ cause: error });
  }
});

app.put("/signup", async (req, res) => {
  try {
    //TODO :mail'e doğrulama kodu

    const { password, userName, eMail, phoneNo, nation } = req.body; //TODO daha fazla bilgi

    //some conditions here
    if (!countries[nation]) throw "telefon ülke kodu hatalı"; //TODO: ???? status kodu bakılacak
    if (password.length <= 8)
      throw "şifre uzunluğu yeterli değil , en az 9 karakter uzunluğuna olmalı";
    if (phoneNo.length < 4) throw "bu bir telefon numarası olamaz . Çok kısa !";
    if (eMail.length < 4) throw "dalga mı geçiyorsun ! bu mail ne ?";
    if (userName.length <= 2)
      throw "senin adam akıllı bir isimin yok mu !? HE !";

    eMail.toLocaleLowerCase();

    //access ve refresh secret token larını üretme
    const secret_access_token = crypto.randomBytes(64).toString("hex");
    const secret_refresh_token = crypto.randomBytes(64).toString("hex");

    //şifreyi encode et
    const salt = crypto.randomBytes(16);
    const encoded_password = await argon2.hash(password, {
      parallelism: 1,
      memoryCost: 64000, // 64 mb
      timeCost: 3,
      salt,
    });

    //tüm verileri saklama
    database
      .signup({
        ...req.body,
        secret_access_token: secret_access_token,
        secret_refresh_token: secret_refresh_token,
        passwordHash: encoded_password,
      })
      .then((fb) => {
        res.sendStatus(200);
      })
      .catch((error) => res.send({ cause: error }));
  } catch (error) {
    console.log(error);
    res.send({ cause: error });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //access token
  if (token == null) return res.sendStatus(401);
  if (!req.body.userId) return res.sendStatus(400);

  try {
    database
      .authenticateToken(req.body.userId)
      .then(({ secret_access_token }) => {
        jwt.verify(token, secret_access_token, (err, user) => {
          if (err) return res.sendStatus(403);
          req.user = user;
          next();
        });
      });
  } catch (error) {
    res.send(error);
  }
}
app.get("/post", authenticateToken, (req, res) => {
  res.send("selamm");
});

app.post("/token", (req, res) => {
  //takes refresh token
  const { refreshToken, userId } = req.body;
  if (refreshToken == null) return res.sendStatus(401);
  database
    .token(userId, refreshToken)
    .then(({ secret_refresh_token, userName, secret_access_token }) => {
      jwt.verify(refreshToken, secret_refresh_token, (err, user) => {
        if (err) return res.sendStatus(403);
        const accessToken = generateAccessToken(
          {
            name: userName,
            id: userId,
          },
          secret_access_token
        );
        res.json({ accessToken: accessToken });
      });
    })
    .catch((errorCode) => {
      return res.sendStatus(errorCode);
    });
});

function generateAccessToken(user, secret_access_token) {
  return jwt.sign(user, secret_access_token, {
    expiresIn: "10m",
  });
}

app.delete("/logout", (req, res) => {
  if (req.body.userId === null || req.body.refreshToken === null)
    return res.sendStatus(401);
  database
    .logout(req.body.userId, req.body.refreshToken)
    .then(() => {
      res.sendStatus(200);
    })
    .catch((errorCode) => {
      return res.sendStatus(errorCode);
    });
});

//own business request
app.post("/business/iwanttoown", authenticateToken, (req, res) => {
  //admin panelinde görülecek istek

  try {
    const {
      name,
      country,
      city,
      district,
      neighborhood,
      street,
      no,
      phoneNo,
      mail,
    } = req.body;

    if (
      !name ||
      !country ||
      !city ||
      !district ||
      !neighborhood ||
      !street ||
      !no ||
      !phoneNo ||
      !mail ||
      !nation
    ) {
      throw "eksik bilgi";
    }
    if (!countries[nation]) throw "telefon ülke kodu hatalı";

    database
      .iWantToOwn({}, req.user.id)
      .then(() => res.sendStatus(200))
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    res.json({ nause: error });
  }
});

//delete profile
app.route("/profile/delete").delete((req, res) => {
  //basit bir oyun çıkar ekrana , bölümü tamamlarsa hesabı sil
});

//manage profile
app.route("/profile/change/name");
app.route("/profile/change/phone");
app.route("/profile/change/email");
app.route("/profile/change/password");

//manage business
app.route("/business/change/");

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () => console.log(`${port} on fire maaan 🔥🔥`));
module.exports = app;
