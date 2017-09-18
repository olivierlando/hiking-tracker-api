const crypto = require('crypto');
const errors = require('restify-errors');
const UserModel = require('../models/User');
const Authentication = require('../services/Authentication');

class Users {
  constructor(server, config) {
    this.config = config;
    this.server = server;
  }

  init() {
    this.server.post('/users/token', this.getToken.bind(this));
    this.server.get('/users/me', Authentication.isAuthenticated, this.me.bind(this));
  }

  static generateToken(data) {
    const random = Math.floor(Math.random() * 100001);
    const timestamp = (new Date()).getTime();
    const sha256 = crypto.createHmac('sha256', `${random}WOO${timestamp}`);
    return sha256.update(data).digest('base64');
  }

  getToken(req, res, next) {
    const missingParams = ['password', 'username', 'grant_type'].filter(p => !req.body[p]);
    if (missingParams.length > 0) {
      res.send(new errors.BadRequestError(`Invalid or missing parameter(s): ${missingParams.join(', ')}`));
    } else if (req.body.grant_type !== 'password') {
      res.send(new errors.BadRequestError('Invalid grant_type'));
    } else {
      UserModel
        .findOne({ username: req.body.username, password: req.body.password }).exec((err, user) => {
          if (!user) {
            next(new errors.InvalidCredentialsError('Invalid credentials'));
          } else {
            if (!user.token || user.expires <= new Date().getTime()) {
              user.token = Users.generateToken(req.body.username);
            }
            user.expires = new Date().getTime() + (this.config.tokenExpirationTime * 1000);
            user.save();
            res.send({
              access_token: user.token,
              token_type: 'Bearer',
              expires_in: this.config.tokenExpirationTime,
            });
            req.log.debug(`The following token has been generated for '${req.body.username}': ${user.token}`);
            next();
          }
        });
    }
  }

  me(req, res, next) {
    res.send(req.user);
    next();
  }
}

module.exports = Users;
