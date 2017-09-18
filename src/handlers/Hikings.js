const errors = require('restify-errors');
const Elevation = require('../services/Elevation');
const HikingsService = require('../services/Hikings');
const HikingModel = require('../models/Hiking');
const Authentication = require('../services/Authentication');

class Hikings {
  constructor(server, config) {
    this.elevation = new Elevation(config.paths.elevationData);
    this.config = config;
    this.server = server;
  }

  init() {
    this.server.get('/hikings', this.getAll.bind(this));
    this.server.post('/hikings/refresh', Authentication.isAuthenticated, this.refreshAll.bind(this));
    this.server.post('/hikings/:slug', Authentication.isAuthenticated, this.update.bind(this));
    this.server.post('/hikings', Authentication.isAuthenticated, this.create.bind(this));
  }

  refreshAll(req, res, next) {
    HikingModel.find().select(['name', 'coordinates', 'bounds', 'elevation']).exec((err, hikings) => {
      hikings.forEach((hiking) => {
        HikingsService.computeHikingValues(hiking.name, hiking.coordinates, hiking.bounds, this.elevation, (err, refreshed) => {
          if (!err) {
            HikingModel.update({ _id: hiking['_id'] }, refreshed);
          }
        });
      });
      res.send('Hiking refreshed');
      next();
    });
  }

  create(req, res, next) {
    const body = JSON.parse(req.body);
    HikingsService.computeHikingValues(body.name, [], body.bounds, this.elevation, (err, hiking) => {
      if (err) {
        next(new errors.InternalServerError({ err }, 'Can\'t compute hiking data'));
      } else {
        new HikingModel(hiking).save((err) => {
          if (err) {
            next(new errors.InternalServerError({ err }, 'Can\'t create hiking'));
          } else {
            res.send('Hiking created');
            next();
          }
        });
      }
    });
  }

  update(req, res, next) {
    const body = JSON.parse(req.body);
    HikingsService.computeHikingValues(body.name, body.coordinates, body.bounds, this.elevation, (err, hiking) => {
      if (err) {
        next(new errors.InternalServerError({ err }, 'Can\'t compute hiking data'));
      } else {
        HikingModel.update(
          { slug: req.params.slug },
          hiking,
          { },
          (err, count) => {
            if (err || count === 0) {
              next(new errors.InternalServerError({ err }, 'Can\'t update hiking'));
            } else {
              res.send('Hiking updated');
              next();
            }
          }
        );
      }
    });
  }

  getAll(req, res, next) {
    HikingModel
      .find(req.query.slugs ? { slug: { $in: req.query.slugs.split(',') } } : {})
      .select(req.query.fields ? req.query.fields.split(',') : null)
      .exec((err, hikings) => {
        if (err) {
          next(new errors.InternalServerError('Can\'t retrieve hikings'));
        } else {
          res.send(hikings);
          next();
        }
      });
  }
}

module.exports = Hikings;
