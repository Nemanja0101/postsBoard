const { Router } = require("express");
const indexController = require("../controller/indexController");
const topicController = require("../controller/topicController");

const indexRouter = Router();

indexRouter.get("/", indexController.renderHomePage);
indexRouter.get("/signup", indexController.renderSignUpForm);
indexRouter.get("/login", indexController.renderLogin);
indexRouter.post("/signup", indexController.createNewUser);
indexRouter.post("/login", indexController.loginUser);
indexRouter.post("/logout", indexController.userLogout);
indexRouter.get("/topics", topicController.renderMainTopicsPage);

module.exports = indexRouter;
