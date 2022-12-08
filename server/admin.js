var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const crypto = require("crypto");
// var usersRouter = require('./routes/users');
const port = "8182";
const database = require("./DataBase/databases");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const argon2 = require("argon2");
const { match } = require("assert");
const countries = require("./Country/countries");
const device = require("express-device");
const geoip = require("geoip-lite");
const { query } = require("express");

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

function authenticateAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //access token
  if (token == null) return res.sendStatus(401);
  if (!req.body.adminId) return res.sendStatus(400);
  try {
    database
      .authenticateToken(req.body.adminId)
      .then(({ secret_access_token }) => {
        //verification user
        jwt.verify(token, secret_access_token, async (err, user) => {
          if (err) return res.sendStatus(403);
          req.user = user;

          await database
            .authenticateAdmin(user.id, secret_access_token)
            .then((admin) => {
              if (admin.state == 0) return res.sendStatus(401);
              next();
            });
        });
      });
  } catch (error) {
    res.send(error);
  }
}

//TODO: adimn log tutma
app
  .route("/iwanttoown")
  .all(authenticateAdmin)
  //isteği kabul etme
  .post((req, res) => {
    if (query.userId == null) res.sendStatus(400); //eksik bilgi
    database.acceptIwantToOwn(req.query.id);
    res.sendStatus(200);
  })
  //isteği silme
  //TODO: isteği silinen kişi tekrar istek atarken kısıtlama yiyecek ?
  .delete((req, res) => {
    if (req.query.userId == null) res.sendStatus(400);
    database.denyIWantToOwn(req.query.userId).catch((error) => {
      res.send({ cause: error });
    });
    res.sendStatus(200);
  })
  //istekleri çağırma
  //TODO : iwanttoown fotoğrafları ve site urllerini de kapsayacak
  .get((req, res) => {
    database.getIWantToOwn((list) => {
      res.json({ requests: list });
    });
  });

app
  .route("/report")
  .all(authenticateAdmin)
  .get((req, res) => {})
  .delete((req, res) => {});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () =>
  console.log(`Admin hanging , ${port} on obedience 💂💂🎖️`)
);

module.exports = app;
