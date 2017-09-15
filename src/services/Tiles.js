/* eslint no-bitwise: ["error", { "allow": ["<<"] }] */
const fs = require('fs');
const request = require('request');
const jpeg = require('jpeg-js');
const path = require('path');
const Utils = require('./Utils');

/**
 * Get jpg data of a tile
 * Returns a Promise of the jpg data of a tile, retrieve either from
 * the tile provider or from local cache.
 * @param {String} provider name of the provider
 * @param {Object} providerConfig provider config
 * @param {Integer} x tile x coordinate
 * @param {Integer} y tile y coordinate
 * @param {Integer} zoom tile zoom
 */
const getTileJpg = (provider, providerConfig, x, y, zoom) => new Promise((resolve, reject) => {
  const fileName = providerConfig.cache ? path.join(providerConfig.cache, `${zoom}-${x}-${y}.jpg`) : null;

  if (fileName && fs.existsSync(fileName)) {
    fs.readFile(fileName, (err, data) => { if (err) reject(err); else resolve(data); });
  } else {
    const options = {
      url: providerConfig.url.replace('{x}', x).replace('{y}', y).replace('{z}', zoom),
      auth: providerConfig.auth,
      encoding: null,
    };
    request.get(options, (error, remoteRes, body) => {
      if (error) {
        reject(error);
      } else {
        if (fileName != null) {
          fs.stat(providerConfig.cache, (err) => {
            if (err) {
              fs.mkdirSync(providerConfig.cache);
            }
            fs.writeFile(fileName, body);
          });
        }
        resolve(body);
      }
    });
  }
});

/**
 * Get x and y coordinates of the tile containing the location matching the
 * given latitude and longitude, for the given zoom value
 *
 * @param {Float} lat the latitude
 * @param {Float} lon the longitude
 * @param {Integer} zoom zoom value
 */
const getTileIdFromCoordinates = (lat, lon, zoom) => ({
  x: parseInt(Math.floor(((lon + 180) / 360) * (1 << zoom)), 10),
  y: parseInt(Math.floor(((1 - (Math.log(Math.tan(Utils.deg2rad(lat)) + (1 / Math.cos(Utils.deg2rad(lat)))) / Math.PI)) / 2) * (1 << zoom)), 10),
});


const getTilesBounds = (margin, tile0, tile1) => {
  let tilesMinYIndex = tile0.y < tile1.y ? tile0.y : tile1.y;
  let tilesMaxYIndex = tile0.y > tile1.y ? tile0.y : tile1.y;
  let tilesMinXIndex = tile0.x < tile1.x ? tile0.x : tile1.x;
  let tilesMaxXIndex = tile0.x > tile1.x ? tile0.x : tile1.x;

  // extends tiles bounds
  tilesMinXIndex -= margin;
  tilesMinYIndex -= margin;
  tilesMaxXIndex += margin;
  tilesMaxYIndex += margin;

  return [
    { x: tilesMinXIndex, y: tilesMinYIndex },
    { x: tilesMaxXIndex, y: tilesMaxYIndex },
  ];
};


const generateGlobalBitmap = (provider, providerConfig, topLeftTileId, bottomRightTileId) => {
  const promises = [];
  for (let y = topLeftTileId.y ; y <= bottomRightTileId.y; y += 1) {
    for (let x = topLeftTileId.x ; x <= bottomRightTileId.x; x += 1) {
      promises.push(getTileJpg(provider, providerConfig, x, y, 15));
    }
  }
  return Promise.all(promises).then((results) => {
    const decodedJpegs = results.map(raw => jpeg.decode(raw, true).data);

    const width = 256 * ((bottomRightTileId.x - topLeftTileId.x) + 1);
    const height = 256 * ((bottomRightTileId.y - topLeftTileId.y) + 1);

    const result = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tileX = parseInt(x / 256, 10);
        const tileY = parseInt(y / 256, 10);
        const tileIndex = tileX + (tileY * ((bottomRightTileId.x - topLeftTileId.x) + 1));
        const xOnTile = x % 256;
        const yOnTile = y % 256;

        result[((x + (y * width)) * 4)] =
          decodedJpegs[tileIndex][(xOnTile + (yOnTile * 256)) * 4];

        result[((x + (y * width)) * 4) + 1] =
          decodedJpegs[tileIndex][((xOnTile + (yOnTile * 256)) * 4) + 1];

        result[((x + (y * width)) * 4) + 2] =
          decodedJpegs[tileIndex][((xOnTile + (yOnTile * 256)) * 4) + 2];

        result[((x + (y * width)) * 4) + 3] =
          decodedJpegs[tileIndex][((xOnTile + (yOnTile * 256)) * 4) + 3];
      }
    }
    return { data: result, width, height };
  }, (err) => { throw err; });
};


const getLatLonFromXY = (topLeftTileId, x, y, zoom) => {
  const globalX = topLeftTileId.x + (x / 256);
  const globalY = topLeftTileId.y + (y / 256);

  return {
    lon: ((globalX * 360) / (1 << zoom)) - 180,
    lat: (Math.atan(Math.sinh(Math.PI * (1 - ((2 * globalY) / Math.pow(2, zoom))))) * 180.0) / Math.PI,
  };
};

const getXyFromLatLon = (topLeftTileId, lat, lon, zoom) => {
  const xtile = parseInt(Math.floor(((lon + 180) / 360) * (1 << zoom)), 10);
  const ytile = parseInt(Math.floor( (1 - Math.log(Math.tan(Utils.deg2rad(lat)) + 1 / Math.cos(Utils.deg2rad(lat))) / Math.PI) / 2 * (1<<zoom) ));
  const xOnTile = ((lon + 180) / 360 * (1<<zoom) - xtile) * 256;
  const yOnTile = ((1 - Math.log(Math.tan(Utils.deg2rad(lat)) + 1 / Math.cos(Utils.deg2rad(lat))) / Math.PI) / 2 * (1<<zoom) - ytile) * 256;

  return {
    x: ((xtile - topLeftTileId.x) * 256) + parseInt(xOnTile, 10),
    y: ((ytile - topLeftTileId.y) * 256) + parseInt(yOnTile, 10),
  };
};


module.exports = {
  getTilesBounds,
  getTileJpg,
  getTileIdFromCoordinates,
  getXyFromLatLon,
  getLatLonFromXY,
  generateGlobalBitmap,
};
