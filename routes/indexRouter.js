const { Router } = require("express");
const indexController = require("../controller/indexController");

const indexRouter = Router();

indexRouter.get("/", indexController.renderHomePage);
indexRouter.get("/signup", indexController.renderSignUpForm);
indexRouter.get("/login", indexController.renderLogin);
indexRouter.post("/signup", indexController.createNewUser);
indexRouter.post("/login", indexController.loginUser);

module.exports = indexRouter;
