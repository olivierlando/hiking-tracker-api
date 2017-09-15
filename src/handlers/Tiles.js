const Tiles = require('../services/Tiles');

class TilesHandlers {
  constructor(config) {
    this.config = config;
  }

  get(req, res) {
    if (!this.config.tilesProviders[req.params.provider]) {
      res.send(500, `Unknown provider: ${req.params.provider}`);
    } else {
      Tiles.getTileJpg(
        req.params.provider,
        this.config.tilesProviders[req.params.provider],
        req.params.x,
        req.params.y,
        req.params.zoom
      ).then(
        (data) => {
          res.sendRaw(200, data, { 'Access-Control-Allow-Origin': '*' });
        },
        (err) => {
          res.send(500, err.message);
        }
      );
    }
  }
}


module.exports = TilesHandlers;
