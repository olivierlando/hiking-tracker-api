const PathFromImage = require('path-from-image');
const Tiles = require('../services/Tiles');
const Utils = require('../services/Utils');

class Roads {
  constructor(config) {
    this.config = config;
  }

  follow(provider, req, res) {
    const zoom = 15;
    const pathSimplification = 9;
    const maxDistanceKm = 10;

    const [lat1Float, lon1Float, lat2Float, lon2Float] =
      [req.params.lat1, req.params.lon1, req.params.lat2, req.params.lon2].map(c => parseFloat(c));

    if (Utils.getDistanceFromLatLon(lat1Float, lon1Float, lat2Float, lon2Float) > maxDistanceKm * 1000) {
      res.send(500, 'Given locations are too far away');
    } else if (!this.config.tilesProviders[provider]) {
      res.send(500, `Unknown provider: ${provider}`);
    } else {
      const [topLeftTileId, bottomRightTileId] = Tiles.getTilesBounds(
        1,
        Tiles.getTileIdFromCoordinates(lat1Float, lon1Float, zoom),
        Tiles.getTileIdFromCoordinates(lat2Float, lon2Float, zoom)
      );
      const startPixel = Tiles.getXyFromLatLon(topLeftTileId, lat1Float, lon1Float, zoom);
      const endPixel = Tiles.getXyFromLatLon(topLeftTileId, lat2Float, lon2Float, zoom);

      Tiles.generateGlobalBitmap(provider, this.config.tilesProviders[provider], topLeftTileId, bottomRightTileId)
        .then(({ data, width, height }) => {
          const pathFromImage = new PathFromImage({
            width,
            height,
            imageData: data,
            colorPatterns: [{ r: [60, 255], g: [0, 70], b: [60, 255] }],
          });
          const result = pathFromImage.path(
            [startPixel.x, startPixel.y],
            [endPixel.x, endPixel.y],
            pathSimplification
          );
          if (result) {
            res.send(result.map(([x, y]) => Tiles.getLatLonFromXY(topLeftTileId, x, y, zoom)));
          } else {
            res.send(404, 'No path found');
          }
        });
    }
  }
}


module.exports = Roads;
