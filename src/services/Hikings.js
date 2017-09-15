const slug = require('slug');
const Utils = require('./Utils');

const getLinearPoints = (coordinates, pointsDistance) => {
  if (coordinates.length === 0) return [];

  const points = [];
  let lastSum = 0;
  let sum = 0;

  for (let i = 1; i < coordinates.length; i += 1) {
    const lastLat = coordinates[i - 1][0];
    const lastLon = coordinates[i - 1][1];
    const lat = coordinates[i][0];
    const lon = coordinates[i][1];

    points.push({
      coordinates: [lastLat, lastLon],
      isLinear: false,
      distance: sum,
    });

    let currentLinearPointsDistance = pointsDistance;
    if (lastLat != null && lastLon != null) {
      const distance = Utils.getDistanceFromLatLon(lastLat, lastLon, lat, lon);
      sum += Utils.getDistanceFromLatLon(lastLat, lastLon, lat, lon);
      if (distance > currentLinearPointsDistance) {
        while (currentLinearPointsDistance < distance) {
          const factor = (currentLinearPointsDistance) / (distance);
          points.push({
            coordinates: [
              lastLat + ((lat - lastLat) * factor),
              lastLon + ((lon - lastLon) * factor),
            ],
            isLinear: true,
            distance: lastSum + currentLinearPointsDistance,
          });

          currentLinearPointsDistance += pointsDistance;
        }
      }
    }
    lastSum = sum;
  }
  points.push({
    coordinates: coordinates[coordinates.length - 1],
    distance: Utils.getDistanceFromLatLonArray(coordinates),
    isLinear: false,
  });

  return points;
};


const computeHikingValues = (name, coordinates, bounds, elevation, callback) => {
  const points = getLinearPoints(coordinates, 50);

  Promise.all(points
    .map(p => p.coordinates)
    .map(c => elevation.getElevationPromise(c))
  ).then((altitudes) => {
    const pointsWithAlt = [];
    for (let i = 0; i < points.length; i += 1) {
      pointsWithAlt.push(Object.assign(points[i], { altitude: altitudes[i] }));
    }

    callback({
      name,
      coordinates,
      distance: Utils.getDistanceFromLatLonArray(coordinates),
      isLoop: Utils.isLoop(coordinates),
      altitudes: pointsWithAlt
        .filter(p => p.isLinear)
        .filter((p, i) => i % 10 === 0)
        .map(p => p.altitude),
      bounds: coordinates.length > 0 ? Utils.getBounds(coordinates) : bounds,
      points: pointsWithAlt.map(p => ({
        coordinates: [
          parseInt(p.coordinates[0] * 100000, 10) / 100000,
          parseInt(p.coordinates[1] * 100000, 10) / 100000,
        ],
        distance: p.distance,
        isLinear: p.isLinear,
        altitude: parseInt(p.altitude * 100000, 10) / 100000,
      })),
      slug: slug(name).toLowerCase(),
    });
  }).catch((e) => {
    console.log(e);
  });
};

module.exports = { computeHikingValues, getLinearPoints };
