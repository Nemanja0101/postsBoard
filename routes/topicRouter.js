const { Router } = require("express");
const topicController = require("../controller/topicController");

const topicsRouter = Router();

topicsRouter.get("/create", topicController.renderCreateTopicForm);
topicsRouter.post("/create", topicController.createTopic);
// topicsRouter.get("/main", topicController.renderMainTopicsPage);

topicsRouter.get("/all{/:private}", topicController.renderTopicsSearchPage);
topicsRouter.get("/search", topicController.searchTopics);
topicsRouter.get("/:topicId/:topicType", topicController.renderSingleTopic);

module.exports = topicsRouter;
