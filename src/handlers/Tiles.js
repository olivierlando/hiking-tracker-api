const errors = require('restify-errors');
const Tiles = require('../services/Tiles');

class TilesHandlers {
  constructor(server, config) {
    this.config = config;
    this.server = server;
  }

  init() {
    this.server.get('/tiles/:provider/:zoom/:x/:y', this.get.bind(this));
  }

  get(req, res, next) {
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
          next();
        },
        (err) => {
          next(new errors.InternalServerError({ err }));
        }
      );
    }
  }
}


module.exports = TilesHandlers;
