const HikingsService = require('../services/Hikings');
const models = require('../models');

class Hikings {
  constructor(config, elevation) {
    this.elevation = elevation;
    this.config = config;
  }

  refreshAll(req, res) {
    models.Hiking.find().select(['name', 'coordinates', 'bounds', 'elevation']).exec((err, hikings) => {
      hikings.forEach((hiking) => {
        HikingsService.computeHikingValues(hiking.name, hiking.coordinates, hiking.bounds, this.elevation, (refreshed) => {
          models.Hiking.update({ _id: hiking['_id'] }, refreshed);
        });
      });
      res.send('ok');
    });
  }

  create(req, res) {
    const body = JSON.parse(req.body);
    HikingsService.computeHikingValues(body.name, [], body.bounds, this.elevation, (hiking) => {
      new models.Hiking(hiking).save((err) => {
        if (err) throw err;
        res.send('');
      });
    });
  }


  update(req, res) {
    const body = JSON.parse(req.body);
    HikingsService.computeHikingValues(body.name, body.coordinates, body.bounds, this.elevation, (hiking) => {
      models.Hiking.update(
        { slug: req.params.slug },
        hiking,
        { },
        (err, count) => {
          if (err) throw err;
          res.send(count);
        }
      );
    });
  }

  getAll(req, res) {
    models.Hiking
      .find(req.query.slugs ? { slug: { $in: req.query.slugs.split(',') } } : {})
      .select(req.query.fields ? req.query.fields.split(',') : null)
      .exec((err, hikings) => {
        if (err) throw err;
        res.send(hikings);
      });
  }

  // not used
  // getInBounds(req, res) {
  //   const lat1 = parseFloat(req.params.lat1);
  //   const lon1 = parseFloat(req.params.lng1);
  //   const lat2 = parseFloat(req.params.lat2);
  //   const lon2 = parseFloat(req.params.lng2);

  //   models.Hiking.find((err, hikings) => {
  //     if (err) throw err;
  //     res.send(hikings.filter(d =>
  //       d.bounds && d.bounds[0][0] >= lat2 &&
  //       d.bounds[0][1] >= lon2 && d.bounds[1][0] <= lat1 && d.bounds[1][1] <= lon1)
  //       .map(d => Object.assign(d, { points: [], altitudes: [] })));
  //   });
  // }
}

module.exports = Hikings;
