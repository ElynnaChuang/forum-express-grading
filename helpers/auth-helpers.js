module.exports = {
  getUser: req => req.user || null,
  ensureAuthenticated: req => {
    return req.isAuthenticated()
  }
}
