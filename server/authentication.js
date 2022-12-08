var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const crypto = require("crypto");
// var usersRouter = require('./routes/users');
const port = "8181";
const database = require("./DataBase/databases");
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

app.route("/").get((req, res) => {
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

//sign things -sign in , sign up
app.patch("/login", async (req, res) => {
  try {
    //report the mail that someonse has logged in with this informations

    const { mailAddress, password } = req.body;

    //some conditions here
    if (!mailAddress) throw "giriş yapabilmek için mail adresini de vermelisin";
    if (!password) throw "parola nerede ?";

    mailAddress.toLocaleLowerCase();

    //kimlik doğrulama
    await database
      .verifyAuthentication(mailAddress)
      .then(async ({ passwordHash }) => {
        if (await verifyAuthentication(password, passwordHash)) return;
        throw "kimlik doğrulanamadı";
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
      .then(async ({ user_id, secret_access_token, secret_refresh_token }) => {
        const user = { user_id: user_id };
        const accessToken = generateAccessToken(user, secret_access_token);
        const refresh_token = jwt.sign(user, secret_refresh_token);

        //save refresh token in db
        await database.keepRefreshtoken(mailAddress, refresh_token);

        res.json({ accessToken: accessToken, refresh_token: refresh_token });
      });
  } catch (error) {
    res.send({ cause: error });
  }
});

app.put("/signup", async (req, res) => {
  try {
    //TODO :mail'e doğrulama kodu

    const { password, eMail } = req.body; //TODO daha fazla bilgi

    //some conditions here
    if (password.length <= 8)
      throw "şifre uzunluğu yeterli değil , en az 9 karakter uzunluğuna olmalı";
    if (eMail.length < 4) throw "dalga mı geçiyorsun ! bu mail ne ?";

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
    res.send({ cause: error });
  }
});

app.post("/token", (req, res) => {
  //takes refresh token
  const { refreshToken, userId } = req.body;
  if (refreshToken == null) return res.sendStatus(401);
  database
    .token(userId, refreshToken)
    .then(({ secret_refresh_token, secret_access_token }) => {
      jwt.verify(refreshToken, secret_refresh_token, (err, user) => {
        if (err) return res.sendStatus(403);
        const accessToken = generateAccessToken(
          {
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

app.delete("/logout", require("./utils/authenticateToken"), (req, res) => {
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

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () =>
  console.log(`Authentication : on ${port} dripin' maaan 🧊🧊`)
);
module.exports = app;
