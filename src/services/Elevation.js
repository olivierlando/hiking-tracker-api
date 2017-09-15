const { TileSet } = require('node-hgt');

class Elevation {
  constructor(dataPath) {
    this.tileSet = new TileSet(dataPath);
  }

  getElevationPromise(coords) {
    return new Promise((resolve, reject) => {
      this.tileSet.getElevation(coords, (err, elevation) => {
        if (err) {
          reject(err);
        } else {
          resolve(elevation);
        }
      });
    });
  }
}

module.exports = Elevation;
