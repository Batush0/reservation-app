var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const crypto = require("crypto");
// var usersRouter = require('./routes/users');
const port = "8180";
const database = require("./DataBase/databases");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const argon2 = require("argon2");
const { match } = require("assert");
const countries = require("./Country/countries");
const device = require("express-device");
const geoip = require("geoip-lite");
const authenticateToken = require("./utils/authenticateToken");

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

//create business
//use mail to declare notifications
//user => request rezerv a filed , business confirm rezerv (has settings for this option : confirm stuff able to disable , so user could take a rezerv without business's permition)
//report system
//
process.on("uncaughtException", (err) => {
  console.log(err);
});

//own business request
app.post("/business/iwanttoown", authenticateToken, (req, res) => {
  //admin panelinde görülecek istek

  try {
    const {
      name,
      eMail,
      phoneNo,
      nation,
      workStart,
      workEnd,
      capacity,
      coordinates,
      workers,
      occupancy,
    } = req.body;

    if (
      !name ||
      !phoneNo ||
      !eMail ||
      !nation ||
      !workStart ||
      !workEnd ||
      !capacity ||
      !coordinates ||
      !workers ||
      !occupancy
    ) {
      throw "eksik bilgi";
    }
    if (!countries[nation]) throw "telefon ülke kodu hatalı";

    database
      .iWantToOwn(req.body, req.user.id)
      .then(() => res.sendStatus(200))
      .catch((error) => {
        throw error;
      });
  } catch (error) {
    res.json({ nause: error });
  }
});

//rezervasyon alma talebi
app
  .route("/reserve")
  .all(authenticateToken)
  .post((req, res) => {
    try {
      const { start, end, amount } = req.body;
      if (!start || !end || !amount || !req.query.business) throw "eksik bilgi";

      //ödeme alınacak
      //TODO: receipt tablesi kullanılacak

      database.reserve(req.user.id, req.query.business, start, end, amount);
      res.sendStatus(200);
    } catch (error) {
      res.send({ cause: error });
    }
  })
  .delete((req, res) => {
    database.cancelReservation(req.user.id);
    //TODO: receipt işlemleri
  });

app
  .route("/business/reservations")
  .all(() => {
    authenticateToken();
    database.authenticateBusinessUser(req.user.id);
    //TODO: owner veya işçi mi kontrolü
  })
  .get((req, res) => {});

//TODO: işletme sahibi kullanıcıya işletmede işçi olma davetinde bulunacak

//delete profile
app.delete("/profile/delete", authenticateToken, (req, res) => {
  //basit bir oyun çıkar ekrana , bölümü tamamlarsa hesabı sil
  database.deleteUser(req.user.id);
});

//manage profile
app.post("/profile/change/password", authenticateToken, (req, res) => {
  if (!req.body.value) return res.sendStatus(400);
  database.updateUserPassword(req.user.id, req.body.value);
});
app.post("/profile/change/mail", authenticateToken, (req, res) => {
  if (!req.body.value) return res.sendStatus(400);
  database.updateUserMail(req.user.id, req.body.value);
});

//TODO: düzenlenecek
//manage business
app.post(
  "/business/change",
  [authenticateToken, authenticateBusinessUser],
  (req, res) => {
    try {
      const { process, value } = req.query;
      if (process == null || value == null) return res.sendStatus(400);

      switch (req.query.process) {
        case "e_mail":
          break;
        case "phone_no":
          break;
        case "nation":
          if (!countries[value]) throw "telefon ülke kodu hatalı";
          break;
        case "coordinates":
          break;
        case "work_start":
          break;
        case "work_end":
          break;
        case "capacity":
          break;
        case "workers":
          break;
        case "occupancy":
          break;
        case "price":
          break;
      }
    } catch (error) {
      res.send({ cause: error });
    }
  }
);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.listen(port, () => console.log(`App runnig , ${port} on fire maaan 🔥🔥`));
module.exports = app;
