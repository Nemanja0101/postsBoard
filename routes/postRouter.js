const { Router } = require("express");
const postController = require("../controller/postController");

const postRouter = Router();

postRouter.get("/new/:topicId/:topicType", postController.renderCreatePost);
postRouter.post("/create", postController.createPost);
postRouter.post("/adminDeletePost", postController.deletePostAdmin);

module.exports = postRouter;
