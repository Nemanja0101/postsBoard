const express = require("express");
const path = require("node:path");
const passport = require("./config/passport");
const sessionMiddleware = require("./config/session");
const authMiddleware = require("./middleware/auth");

//routes
const indexRouter = require("./routes/indexRouter");
const topicRouter = require("./routes/topicRouter");

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentuser = req.user;
  next();
});

app.use("/", indexRouter);
app.use("/topic", authMiddleware.authenticatedGuard, topicRouter);

app.listen(3000, (error) => {
  if (error) {
    throw error;
  }
  console.log("app listening on port 3000!");
});
