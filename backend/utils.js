const { google } = require("googleapis");

const bearings = { N: 360, NNE: 22.5, NE: 45, ENE: 67.5, E: 90, ESE: 112.5, SE: 135, SSE: 157.5, S: 180, SSW: 202.5, SW: 225, WSW: 247.5, W: 270, WNW: 292.5, NW: 315, NNW: 337.5 };

const getBearing = (bearing) => {
  for (const [key, value] of Object.entries(bearings)) {
    if (key === bearing) {
      return value;
    }
  }
};

const convertTextMsgToCoordinates = (yards, bearing, lat1, lng1) => {
  const meters = yards * 0.9144;
  const calcDist = meters / 6371000;
  const bearingRadian = bearing * (Math.PI / 180);
  const latRadian = lat1 * (Math.PI / 180);
  const lngRadian = lng1 * (Math.PI / 180);

  const latResult = Math.asin(Math.sin(latRadian) * Math.cos(calcDist) + Math.cos(latRadian) * Math.sin(calcDist) * Math.cos(bearingRadian));
  const a = Math.atan2(Math.sin(bearingRadian) * Math.sin(calcDist) * Math.cos(latRadian), Math.cos(calcDist) - Math.sin(latRadian) * Math.sin(latResult));

  const lngResult = ((lngRadian + a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;

  const latDegrees = latResult * (180 / Math.PI);
  const lngDegrees = lngResult * (180 / Math.PI);
  return [latDegrees, lngDegrees];
};

const getauthenticatedclient = async () => {
  const authclient = new google.auth.GoogleAuth({
    keyFile: "ADC.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const auth = await authclient.getClient();
  const client = google.sheets({ version: "v4", auth });
  return client;
};

module.exports = { getBearing, convertTextMsgToCoordinates, getauthenticatedclient };
