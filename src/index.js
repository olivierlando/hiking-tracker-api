const process = require('process');
const fs = require('fs');
const path = require('path');
const restify = require('restify');
const Elevation = require('./services/Elevation');
const HikingsHandlers = require('./handlers/Hikings');
const TilesHandlers = require('./handlers/Tiles');
const RoadsHandlers = require('./handlers/Roads');
const mongoose = require('mongoose');

if (!process.env.ENV || ['dev', 'prod'].indexOf(process.env.ENV) === -1) {
  throw new Error('Missing or invalid ENV variable');
}

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../config/${process.env.ENV}.json`), 'UTF-8'));
const elevation = new Elevation(config.paths.elevationData);
const handlers = {
  hikings: new HikingsHandlers(config, elevation),
  roads: new RoadsHandlers(config),
  tiles: new TilesHandlers(config),
};

mongoose.connect(`mongodb://${config.database.host}/${config.database.name}`, {
  useMongoClient: true,
}).catch((err) => {
  throw err;
});

const server = restify.createServer({
  name: 'hiking-tracker-server',
  version: '1.0.0',
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.gzipResponse());
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.allowedOrigins);
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  return next();
});

server.get('/hikings/refresh', (req, res) => handlers.hikings.refreshAll(req, res));
// server.get('/hikings/:bounds/:lat1/:lng1/:lat2/:lng2', (req, res) => handlers.hikings.getInBounds(req, res));
server.get('/hikings', (req, res) => handlers.hikings.getAll(req, res));
server.post('/hikings/:slug', (req, res) => handlers.hikings.update(req, res));
server.post('/hikings', (req, res) => handlers.hikings.create(req, res));
server.get('/tile/:provider/:zoom/:x/:y', (req, res) => handlers.tiles.get(req, res));
server.get('/follow-road/:lat1/:lon1/:lat2/:lon2', (req, res) => handlers.roads.follow('ign', req, res));


server.listen(config.port, () => {
  console.log('%s listening at %s', server.name, server.url);
});
