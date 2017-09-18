const mongoose = require('mongoose');

const User = mongoose.model('users', mongoose.Schema({
  username: String,
  password: String,
  token: String,
  expires: Number,
}));


module.exports = User;
