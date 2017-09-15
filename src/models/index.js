const mongoose = require('mongoose');

const Hiking = mongoose.model('hikings', mongoose.Schema({
  name: String,
  coordinates: [[Number, Number]],
  distance: Number,
  isLoop: Boolean,
  altitudes: [Number],
  bounds: [[Number, Number]],
  points: [{
    coordinates: [[Number, Number]],
    distance: Number,
    isLinear: Boolean,
    altitude: Number,
  }],
  slug: String,
}));


module.exports = { Hiking };
