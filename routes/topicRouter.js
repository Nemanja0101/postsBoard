const { Router } = require("express");
const topicController = require("../controller/topicController");

const topicsRouter = Router();

topicsRouter.get("/create", topicController.renderCreateTopicForm);
topicsRouter.post("/create", topicController.createTopic);

module.exports = topicsRouter;
