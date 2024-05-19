const express = require("express");
const router = require("express").Router();
const body_parser = require("body-parser");
const app = express().use(body_parser.json());
const fs = require("fs");
require("dotenv").config();
const axios = require("axios");
const { format } = require("util");
const { Storage } = require("@google-cloud/storage");
const { getBearing, convertTextMsgToCoordinates, getauthenticatedclient } = require("./utils");
const storage = new Storage();
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);
const spreadsheetId = process.env.SPREADSHEET;
const authenticate = getauthenticatedclient();
const trelloAPIKey = process.env.TRELLO_API_KEY;
const trelloToken = process.env.TRELLO_TOKEN;
var publicUrl;

const test = async () => {};

test();

router.get("/messages", (req, res) => {
  try {
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];
    console.log("MYTOKEN", process.env.MYTOKEN);
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
  console.log("POST");
  const user = req.body?.entry?.[0].changes?.[0].value?.contacts?.[0].profile.name;
  const telephone = req.body?.entry?.[0].changes?.[0].value?.contacts?.[0].wa_id;
  const dateTime = new Date(req.body?.entry?.[0].changes?.[0].value?.messages?.[0].timestamp * 1000).toString();
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

      // TRELLO card creation
      // cards will be added to this idList called "tickets", and the webhook will be listening on the other
      // idList called "Completed"
      const idList = "63bc4433fcb9e800d6c5d567";
      // green whatsapp label appended to every ticket
      const idLabels = ["63bc4419fd1f4ecff3495eb2"];
      const timeOfTicket = new Date().toLocaleString();
      // title of ticket consists of whatsapp username and the dateTime of the ticket
      const title = `${user} ${timeOfTicket}`;
      // encoding the body of the ticket in case we receive emojis or other unescaped characters
      // so that we can send them as path params in the below url
      const description = encodeURIComponent(text);
      const headers = { Accept: "application/json" };
      // posting card to trello idList
      const response = await axios.post(`https://api.trello.com/1/cards?idList=${idList}&name=${title}&desc=${description}&idLabels=${idLabels}&key=${trelloAPIKey}&token=${trelloToken}`, headers);
      const cardPostResponse = response.data;
      console.log("cardPostResponse", cardPostResponse);
      // card also gets posted to google sheets
      authenticate.then((client) => {
        client.spreadsheets.values
          .append({ spreadsheetId, range: "support!A:E", valueInputOption: "RAW", resource: { values: [[user, timeOfTicket, cardPostResponse.desc, "???", telephone, title]] } })
          .then((res) => {
            console.log(`Successfully added the ticket to the support spreadsheet ${res}`);
          })
          .catch((err) => {
            console.log(`Error while adding the ticket to spreadsheet ${err}`);
          });
      });

      //use case if text message contains any numbers
      // /////////////////////////////////////////////////
      // /////////////////////////////////////////////////
      // /////////////////////////////////////////////////
      if (/\d/.test(text)) {
        //retrieve original coordinates from the latest message sent by the same number
        authenticate.then((client) => {
          client.spreadsheets.values
            .get({ spreadsheetId, range: `MAP DB!A:E`, majorDimension: "rows" })
            .then((res) => {
              const arr = res.data.values;
              var r;
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i][1].toString() === telephone && arr[i][3].toString() !== "") {
                  r = i;
                  break;
                }
              }
              const originalLat = parseFloat(arr[r][3]);
              const originalLng = parseFloat(arr[r][4]);

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
              const startdate = new Date(dateTime).toISOString();
              // const setter = new Date();
              // const enddate = new Date(setter.setDate(setter.getDate() + n)).toISOString()
              console.log("lat lng", originalLat, originalLng);
              axios
                .get(`https://student_raychev_todor:KqD3c5TEx4@api.meteomatics.com/${startdate}/wind_dir_10m:d,wind_speed_10m:ms,t_2m:C,precip_1h:mm,weather_symbol_1h:idx/${originalLat},${originalLng}/json`)
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
                  //append map db
                  client.spreadsheets.values
                    .append({ spreadsheetId, range: "MAP DB!A:AG", valueInputOption: "RAW", resource: { values: [[user, telephone, dateTime, originalLat, originalLng, text, sightLat, sightLng, null, null, null, null, null, winddir, windspeed, temperature, precipitation, impression]] } })
                    .then((res) => {
                      console.log("appended MAP DB with a loc-sight-weather message", res.data);
                    })
                    .catch((err) => {
                      console.log("Error while appending the MAP DB with a loc-sight-weather message", err);
                    });
                })
                .catch((err) => {
                  console.log("something went wrong while fetching the weather", err);
                });
            })
            .catch((err) => {
              console.log("Error while fetching original coordinates", err);
            });
        });

        // if text message contains no numbers just append to MAP DB sheet
      } else if (!/\d/.test(text)) {
        //append random/normal/any text message to MAP DB sheet
        authenticate.then((client) => {
          client.spreadsheets.values
            .append({ spreadsheetId, range: "MAP DB!A:F", valueInputOption: "RAW", resource: { values: [[user, telephone, dateTime, null, null, text]] } })
            .then((res) => {
              console.log("appended MAP DB sheet with a bearing message", res.data);
            })
            .catch((err) => {
              console.log("Error while appending the MAP DB sheet with a bearing message", err);
            });
        });
      }

      return res.sendStatus(200);
    } else if (type === "location") {
      console.log("logging incoming location message", JSON.stringify(req.body));

      const event = type;
      const latitude = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].location.latitude.toString();
      const longitude = req.body?.entry?.[0].changes?.[0].value?.messages?.[0].location.longitude.toString();

      authenticate.then((client) => {
        client.spreadsheets.values
          .append({ spreadsheetId, range: "MAP DB!A:E", valueInputOption: "RAW", resource: { values: [[user, telephone, dateTime, latitude, longitude]] } })
          .then((res) => {
            console.log("appended MAP DB-sheet with a location message", res.data);
          })
          .catch((err) => {
            console.log("Error while appending the MAP DB-sheet from a location message", err);
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

      //post image message to sheets with the cell for the image still "..loading"
      await authenticate.then((client) => {
        client.spreadsheets.values
          .append({ spreadsheetId, range: "MAP DB!A:J", valueInputOption: "RAW", resource: { values: [[user, telephone, dateTime, null, null, "loading image url...", null, null, null, ImageText]] } })
          .then((res) => {
            console.log("appended MAP DB-sheet with an image message", res.data);
            //this line extracts the row number from where it just inserted the message so we can
            //append image url when we download it from facebook(whatsapp) and store it in our cloud bucket
            const r = res.data.updates.updatedRange.split("!").pop().split(":")[0].match(/\d+/g)[0];

            // retrieving media download url
            axios
              .get(`https://graph.facebook.com/v15.0/${image_id}`, {
                headers: { Authorization: `Bearer ${process.env.TOKEN}` },
              })
              .then((response) => {
                const tempUrl = response.data.url;
                // downloading in binary mode (as stream)
                axios
                  .get(tempUrl, {
                    headers: { Authorization: `Bearer ${process.env.TOKEN}` },
                    responseType: "stream",
                  })
                  .then((response) => {
                    const imageName = Date.now() + "_image.jpg";
                    //processing the stream into cloud's tmp folder
                    response.data.pipe(
                      fs
                        .createWriteStream(`/tmp/${imageName}`)
                        .on("error", (err) => console.log("error while writing into tmp storage", err))
                        .on("finish", () => {
                          //reading the stream and writing it into google cloud storage bucket
                          const readStream = fs.createReadStream(`/tmp/${imageName}`);
                          const writeToGCP = bucket.file(imageName).createWriteStream();
                          readStream
                            .pipe(writeToGCP)
                            .on("error", (err) => console.log("error uploading to cloud storage", err))
                            .on("finish", async () => {
                              //creating a publicly accessible url for the image from our bucket
                              console.log("SAVED IN CLOUD STORAGE");
                              publicUrl = format(`https://storage.cloud.google.com/${bucket.name}/${imageName}`);

                              //posting the public url into the same row in google sheets where we inserted the message
                              client.spreadsheets.values
                                .update({ spreadsheetId, range: `MAP DB!I${r}`, valueInputOption: "RAW", resource: { values: [[publicUrl]] } })
                                .then((res) => {
                                  console.log("Updated MAP DB-sheet with an image url", res.data);
                                })
                                .catch((err) => {
                                  console.log("Error while updating the MAP DB-sheet with an image url", err);
                                });
                            });
                        })
                    );
                  })
                  .catch((err) => console.log("error while downloading binary data from download image url given by graph.facebook: ", err));
              })
              .catch((err) => console.log("error while getting download image url from graph.facebook: ", err));
          })
          .catch((err) => {
            console.log("Error while updating the sheet from an image message", err);
          });
      });

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

// webhook endpoint for trello
// the webhook registered on this endpoint has the following id "63bdddb40b1bbc00c222019a"
router
  .route("/trellowebhook")
  .head((req, res) => {
    res.sendStatus(200);
  })
  .post(async (req, res) => {
    if (req.body.action.display.translationKey === "action_move_card_from_list_to_list") {
      console.log("req.body", req.body.action);
      try {
        const title = req.body.action.data.card.name;
        authenticate.then((client) => {
          client.spreadsheets.values
            .get({ spreadsheetId, range: `support!A:F`, majorDimension: "rows" })
            .then((response) => {
              const arr = response.data.values;
              var r;
              for (let i = arr.length - 1; i >= 0; i--) {
                if (arr[i][5].toString() === title) {
                  r = i;
                  break;
                }
              }
              const user = arr[r][0];
              const ticket = arr[r][2];
              console.log(
                `We are emailing ${user} to confirm the completion of support ticket: '${ticket}'. ##########(valid emails will be dispatched instead of this console.log after we agree on how we will get the users emails into the system, since this is the only information that we don't have (whatsapp doesn't give us this information))`
              );
            })
            .catch((err) => {
              console.log(`Error while retrieving support ticket from sheet ${err}`);
            });
        });
        res.sendStatus(200);
      } catch (error) {
        res.sendStatus(500);
      }
      // some other actions occur sometimes on the "completed" list. We don't want to send every time emails
      // so we return an empty 200 status in case it is not the above use case
    } else {
      console.log("some action, other than the actual completion movement. Typically sorting, archiving, or deleting");
      return res.sendStatus(200);
    }
  });

app.use("/", router);

app.listen(8081, () => console.log(`Server started on port 8081`));
