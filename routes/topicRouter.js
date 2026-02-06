const { Router } = require("express");
const topicController = require("../controller/topicController");

const topicsRouter = Router();

topicsRouter.get("/create", topicController.renderCreateTopicForm);
topicsRouter.post("/create", topicController.createTopic);
// topicsRouter.get("/main", topicController.renderMainTopicsPage);

topicsRouter.get("/all{/:private}", topicController.renderTopicsSearchPage);
topicsRouter.get("/search", topicController.searchTopics);

topicsRouter.get("/admin/:topicId", topicController.renderAdminPanel);
topicsRouter.post("/admin/approve", topicController.approveRequest);
topicsRouter.post("/admin/deny", topicController.denyRequest);

topicsRouter.post("/joinRequest/:topicId", topicController.requestJoin);

topicsRouter.get("/:topicId/:topicType", topicController.renderSingleTopic);

module.exports = topicsRouter;
