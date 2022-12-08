const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; //access token
  if (token == null) return res.sendStatus(401);
  if (!req.body.userId) return res.sendStatus(400);

  try {
    require("../DataBase/databases")
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
};
