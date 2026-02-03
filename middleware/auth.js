function authenticatedGuard(req, res, next) {
  if (req.isAuthenticated()) {
    console.log("user is authenticated");
    next();
  } else {
    res.status(401).redirect("/login");
  }
}

module.exports = { authenticatedGuard };
