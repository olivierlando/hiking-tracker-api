const deg2rad = deg => (deg * Math.PI) / 180;

const getDistanceFromLatLon = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1); // deg2rad below
  const dLon = deg2rad(lon2 - lon1);
  const a =
    (Math.sin(dLat / 2) * Math.sin(dLat / 2)) +
    (Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000;
};

const getBounds = (coordinates) => {
  const bounds = [[-360, 360], [360, -360]];
  coordinates.forEach((coord) => {
    if (coord[0] > bounds[0][0]) bounds[0][0] = coord[0];
    if (coord[1] < bounds[0][1]) bounds[0][1] = coord[1];
    if (coord[0] < bounds[1][0]) bounds[1][0] = coord[0];
    if (coord[1] > bounds[1][1]) bounds[1][1] = coord[1];
  });
  return bounds;
};

const getDistanceFromLatLonArray = (coordinates) => {
  if (coordinates.length === 0) return 0;
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    totalDistance += getDistanceFromLatLon(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
  }
  return totalDistance;
};

const isLoop = (coordinates) => {
  if (coordinates.length === 0) return 0;
  return getDistanceFromLatLon(
    coordinates[0][0],
    coordinates[0][1],
    coordinates[coordinates.length - 1][0],
    coordinates[coordinates.length - 1][1]
  ) < 400;
};

module.exports = {
  getDistanceFromLatLon,
  getBounds,
  getDistanceFromLatLonArray,
  isLoop,
  deg2rad,
};
