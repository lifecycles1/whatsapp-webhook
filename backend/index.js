const express = require("express");
const router = require("express").Router();
const body_parser = require("body-parser");
const app = express().use(body_parser.json());
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { gravityCreds, bearings, getBearing, convertTextMsgToCoordinates, getauthenticatedclient } = require("./utils");
const storage = new Storage();
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
const API_KEY = process.env.GOOGLE_API_KEY;
const spreadsheetId = process.env.SPREADSHEET;
const authenticate = getauthenticatedclient();
var publicUrl;

const test = async () => {};

test();

router.get("/messages", (req, res) => {
  try {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token && mode === "subscribe" && process.env.MYTOKEN === token) {
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error({ error });
    return res.sendStatus(500);
  }
});

router.post("/messages", async (req, res) => {
  const user = req.body?.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name;
  const telephone = req.body?.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id;
  const DateTime = new Date(req.body?.entry?.[0].changes?.[0].value?.messages?.[0].timestamp * 1000).toString();
  const type = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].type;
  const message_id = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].id;

  try {
    if (req.body?.entry?.[0].changes?.[0].value?.statuses?.[0].status) {
      if (req.body.entry[0].changes[0].value.statuses[0].status === "sent") {
        console.log(`STATUS === SENT \n 
        for recipient phone number ${req.body?.entry[0].changes[0].value?.statuses[0].recipient_id} \n
        with reply message id ${req.body?.entry[0].changes[0].value?.statuses[0].id} \n
        and conversation id ${req.body?.entry[0].changes[0].value?.statuses[0].conversation.id} 
        of type ${req.body?.entry[0].changes[0].value?.statuses[0].conversation.origin.type} \n
        expiring on ${req.body?.entry[0].changes[0].value?.statuses[0].conversation.expiration_timestamp}`);
        return res.sendStatus(200);
      }

      if (req.body?.entry[0].changes[0].value?.statuses[0].status === "delivered") {
        console.log(`STATUS === DELIVERED \n 
        for recipient phone number ${req.body?.entry[0].changes[0].value?.statuses[0].recipient_id} \n
        with reply message id ${req.body?.entry[0].changes[0].value?.statuses[0].id} \n
        and conversation id ${req.body?.entry[0].changes[0].value?.statuses[0].conversation.id} 
        of type ${req.body?.entry[0].changes[0].value?.statuses[0].conversation.origin.type}`);
        return res.sendStatus(200);
      }

      if (req.body?.entry[0].changes[0].value?.statuses[0].status === "read") {
        console.log(`STATUS === READ \n 
        for recipient phone number ${req.body?.entry[0].changes[0].value?.statuses[0].recipient_id} \n
        with reply message id ${req.body?.entry[0].changes[0].value?.statuses[0].id}`);
        return res.sendStatus(200);
      }
    } else if (type === "text") {
      console.log("logging incoming text message", JSON.stringify(req.body));
      const uniqueID = Date.now();
      const event = type;
      const text = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].text?.body;

      if (text.substring(0, 5) !== "Robot") {
        //use case if text message contains any numbers
        // /////////////////////////////////////////////////
        // /////////////////////////////////////////////////
        // /////////////////////////////////////////////////
        if (/\d/.test(text)) {
          //retrieve original coordinates from the latest message sent by the same number
          var originalLat;
          var originalLng;
          authenticate.then((client) => {
            client.spreadsheets.values
              .get({ spreadsheetId, range: `webhook!A:J`, majorDimension: "rows" })
              .then((res) => {
                const arr = res.data.values;
                var r;
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (arr[i][1].toString() === telephone && arr[i][4].toString() !== "") {
                    r = i + 1;
                    break;
                  }
                }
                originalLat = parseFloat(arr?.[r]?.[4]);
                originalLng = parseFloat(arr?.[r]?.[5]);
              })
              .catch((err) => {
                console.log("Error while updating the webhook-sheet with an image url", err);
              });
          });

          //extract numbers from message to use as distance
          const currentDistance = parseInt(text?.match(/\d+/g).join(""));
          //extract bearing from message to use as bearing
          const messageDirections = text
            .match(/\p{Lu}/gu)
            ?.join("")
            .substring(1);
          //use bearing to get its degrees from local object
          const currentBearing = getBearing(messageDirections);

          //calculate new coordinates
          const [sightLat, sightLng] = convertTextMsgToCoordinates(currentDistance, currentBearing, originalLat, originalLng);

          // call the weather api and insert along with the sight coordinates into MAP DB
          // //////////////////////////////////////////////////
          const startdate = new Date(DateTime).toISOString();
          // const setter = new Date();
          // const enddate = new Date(setter.setDate(setter.getDate() + n)).toISOString()
          await axios
            .get(`https://nonlinearsystems_raychev:KK11r6h8dK@api.meteomatics.com/${startdate}/wind_dir_10m:d,wind_speed_10m:ms,t_2m:C,precip_1h:mm,weather_symbol_1h:idx/${originalLat},${originalLng}/json`)
            .then((res) => {
              //in degrees
              const winddir = res.data?.data?.[0].coordinates?.[0].dates?.[0].value;
              //in meters/per second
              const windspeed = res.data?.data?.[1].coordinates?.[0].dates?.[0].value;
              //in celsius
              const temperature = res.data?.data?.[2].coordinates?.[0].dates?.[0].value;
              //in millimeter (equivalent to litres per square meter)
              const precipitation = res.data?.data?.[3].coordinates?.[0].dates?.[0].value;
              //clouds need further processing
              const impression = res.data?.data?.[4].coordinates?.[0].dates?.[0].value;
              authenticate.then((client) => {
                //append map db
                client.spreadsheets.values
                  .append({
                    spreadsheetId,
                    range: "MAP DB!A:AE",
                    valueInputOption: "RAW",
                    resource: { values: [[user, telephone, DateTime, originalLat, originalLng, text, sightLat, sightLng, null, null, null, null, null, winddir, windspeed, temperature, precipitation, impression]] },
                  })
                  .then((res) => {
                    console.log("appended MAP DB with a loc-sight-weather message", res.data);
                  })
                  .catch((err) => {
                    console.log("Error while appending the MAP DB with a loc-sight-weather message", err);
                  });
                // append webhook sheet
                client.spreadsheets.values
                  .append({
                    spreadsheetId,
                    range: "webhook!A:G",
                    valueInputOption: "RAW",
                    resource: { values: [[user, telephone, DateTime, event, null, null, text]] },
                  })
                  .then((res) => {
                    console.log("appended webhook sheet with a bearing message", res.data);
                  })
                  .catch((err) => {
                    console.log("Error while appending the webhook sheet with a bearing message", err);
                  });
              });
            })
            .catch((err) => {
              console.log("something went wrong while fetching the weather", err);
            });

          // if text message contains no numbers just append to all board(webhook sheet)
        } else if (!/\d/.test(text)) {
          //append random/normal/any text message to webhook sheet
          authenticate.then((client) => {
            client.spreadsheets.values
              .append({
                spreadsheetId,
                range: "webhook!A:G",
                valueInputOption: "RAW",
                resource: { values: [[user, telephone, DateTime, event, null, null, text]] },
              })
              .then((res) => {
                console.log("appended webhook sheet with a bearing message", res.data);
              })
              .catch((err) => {
                console.log("Error while appending the webhook sheet with a bearing message", err);
              });
          });
        }
      }

      return res.sendStatus(200);
      // } else if (type === "text" && req.body?.entry?.[0].changes?.[0].value?.messages?.[0].text?.body.startsWith("Robot")) {
      //   console.log("logging incoming robot message", JSON.stringify(req.body));
      //   const uniqueID = Date.now();

      //   const event = type;
      //   const text = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].text?.body;

      //   return res.sendStatus(200);
    } else if (type === "location") {
      console.log("logging incoming location message", JSON.stringify(req.body));

      const event = type;
      const latitude = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].location.latitude.toString();
      const longitude = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].location.longitude.toString();

      authenticate.then((client) => {
        client.spreadsheets.values
          .append({
            spreadsheetId,
            range: "webhook!A:G",
            valueInputOption: "RAW",
            resource: {
              values: [[user, telephone, DateTime, event, latitude, longitude]],
            },
          })
          .then((res) => {
            console.log("appended webhook-sheet with a location message", res.data);
          })
          .catch((err) => {
            console.log("Error while appending the webhook-sheet from a location message", err);
          });
      });

      return res.sendStatus(200);
      // if image
      // //////////////////////////////////////////////////
      // //////////////////////////////////////////////////
    } else if (type === "image") {
      const uniqueID = Date.now();
      const image_id = req.body?.entry[0].changes[0].value?.messages[0].image?.id;

      const event = type;
      const ImageText = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].image?.caption ? req.body?.entry?.[0].changes?.[0].value?.messages?.[0].image?.caption : "no imagetext";

      await authenticate.then((client) => {
        client.spreadsheets.values
          .append({
            spreadsheetId,
            range: "webhook!A:I",
            valueInputOption: "RAW",
            resource: { values: [[user, telephone, DateTime, event, null, null, null, "loading image url...", ImageText]] },
          })
          .then((res) => {
            console.log("appended webhook-sheet with an image message", res.data);
          })
          .catch((err) => {
            console.log("Error while updating the sheet from an image message", err);
          });
      });

      const getlastind = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/webhook!D:D?key=${API_KEY}`);
      const last = getlastind.data.values.length + 1;
      console.log("last row index", last);

      await axios
        .get(`https://graph.facebook.com/v14.0/${image_id}`, {
          headers: { Authorization: `Bearer ${process.env.TOKEN}` },
        })
        .then((response) => {
          const tempUrl = response.data.url;
          axios
            .get(tempUrl, {
              headers: { Authorization: `Bearer ${process.env.TOKEN}` },
              responseType: "stream",
            })
            .then((response) => {
              const imageName = Date.now() + "_image.jpg";
              response.data.pipe(
                fs
                  .createWriteStream(`/tmp/${imageName}`)
                  .on("error", (err) => console.log("error while writing into tmp storage", err))
                  .on("finish", () => {
                    const readStream = fs.createReadStream(`/tmp/${imageName}`);
                    const writeToGCP = bucket.file(imageName).createWriteStream();
                    readStream
                      .pipe(writeToGCP)
                      .on("error", (err) => console.log("error uploading to cloud storage", err))
                      .on("finish", async () => {
                        console.log("SAVED IN CLOUD STORAGE");
                        publicUrl = format(`https://storage.cloud.google.com/${bucket.name}/${imageName}`);

                        authenticate.then((client) => {
                          client.spreadsheets.values
                            .update({
                              spreadsheetId,
                              range: `webhook!H${last}`,
                              valueInputOption: "RAW",
                              resource: { values: [[publicUrl]] },
                            })
                            .then((res) => {
                              console.log("Updated webhook-sheet with an image url", res.data);
                            })
                            .catch((err) => {
                              console.log("Error while updating the webhook-sheet with an image url", err);
                            });
                        });
                      });
                  })
              );
            })
            .catch((err) => console.log("error while downloading binary data from download image url given by graph.facebook: ", err));
        })
        .catch((err) => console.log("error while getting download image url from graph.facebook: ", err));
      return res.sendStatus(200);
    }
    return res.sendStatus(200);
  } catch (error) {
    console.error({ error });
    return res.sendStatus(500);
  }
});

router.post("/saveuser", async (req, res) => {
  console.log("/saveuser", req.body);
  const firstname = req.body?.firstname;
  const lastname = req.body?.lastname;
  const fullname = firstname.concat(" ", lastname);
  const telephone = req.body?.telephone;
  const username = req.body?.username;
  const site_list = req.body?.site_list;
  const password = req.body?.password;
  const passwordnormal = req.body?.passwordnormal;
  try {
    authenticate.then((client) => {
      client.spreadsheets.values
        .append({
          spreadsheetId,
          range: "USER DB!A:H",
          valueInputOption: "RAW",
          resource: { values: [[firstname, lastname, fullname, telephone, username, site_list, password, passwordnormal]] },
        })
        .then((res) => {
          console.log("appended USER DB with a new user", res.data);
        })
        .catch((err) => {
          console.log("Error while appending USER DB with a new user", err);
        });
    });
    return res.sendStatus(200);
  } catch (error) {
    return res.sendStatus(500);
  }
});

app.use("/", router);

app.listen(process.env.PORT, () => console.log(`Server started on port ${process.env.PORT}`));
