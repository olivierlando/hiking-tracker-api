const process = require('process');
const fs = require('fs');
const path = require('path');
const restify = require('restify');
const mongoose = require('mongoose');
const bunyan = require('bunyan');
const HikingsHandlers = require('./handlers/Hikings');
const TilesHandlers = require('./handlers/Tiles');
const RoadsHandlers = require('./handlers/Roads');
const UsersHandlers = require('./handlers/Users');
const Authentication = require('./services/Authentication');
const packagejson = require('../package.json');

if (!process.env.ENV || ['dev', 'prod'].indexOf(process.env.ENV) === -1) {
  throw new Error('Missing or invalid ENV variable');
}

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../config/${process.env.ENV}.json`), 'UTF-8'));

const log = bunyan.createLogger({
  name: packagejson.name,
  level: config.log.level,
  serializers: bunyan.stdSerializers,
});

try {
  mongoose.Promise = global.Promise;
  mongoose.connect(`mongodb://${config.database.host}/${config.database.name}`, {
    useMongoClient: true,
  }).catch((err) => {
    log.fatal({ err }, "Can't connect to database");
    process.exit(-1);
  });
} catch (err) {
  log.fatal({ err }, "Can't connect to database");
  process.exit(-1);
}

const server = restify.createServer({
  name: packagejson.name,
  version: packagejson.version,
  log,
});

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.oauth2TokenParser());
server.use(restify.plugins.bodyParser({ mapParams: false }));
server.use(restify.plugins.gzipResponse());
server.use(restify.plugins.requestLogger());
server.use(Authentication.getUserFromRequestToken());
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', config.allowedOrigins);
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,Authorization');
  return next();
});

server.on('after', (req, res, next, err) => {
  if (err) {
    log.error({ user: req.user, err, body: req.body }, `${req.method} ${req.url}`);
  } else {
    log.info({ user: (req.user ? req.user.username : null) }, `${req.method} ${req.url}`);
  }
});

server.opts('/(.*)/', (req, res) => {
  res.send(204);
});

new HikingsHandlers(server, config).init();
new UsersHandlers(server, config).init();
new RoadsHandlers(server, config).init();
new TilesHandlers(server, config).init();


server.listen(config.port, () => {
  log.info(`${server.name} listening at ${server.url}`);
});
