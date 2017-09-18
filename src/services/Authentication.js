const UserModel = require('../models/User');
const errors = require('restify-errors');

const getUserFromRequestToken = () =>
  (req, res, next) => {
    if (req.oauth2.accessToken) {
      UserModel
        .findOne({ token: req.oauth2.accessToken }).exec((err, user) => {
          if (user) {
            if (new Date().getTime() > user.expires) {
              user.token = null;
              user.expires = null;
              user.save();
            } else {
              req.user = user;
            }
          }
          next();
        });
    } else {
      next();
    }
  };

const isAuthenticated = (req, res, next) => {
  if (req.user) return next();
  return next(new errors.ForbiddenError('You\'re not allowed to access this resource'));
};

module.exports = { getUserFromRequestToken, isAuthenticated };
