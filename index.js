

require('dotenv').config()
// Photo module --------------
const PiCamera = require("pi-camera");
var AWS = require("aws-sdk");
const fs = require("fs");
const BUCKET = "cimarosa01";
const REGION = "eu-central-1";
const ACCESS_KEY = process.env.AA_KEY;
const SECRET_KEY = process.env.ASA_KEY;
//--------------

var firebase = require('firebase');
const xbee_api = require('./xbee');

//require('dotenv').config()

  const config = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_DATABASE_URL,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  };

  //Photo module ------------
  const localImage = "./test.jpg";
  const imageRemoteName = `RpiImage.jpg`;
  AWS.config.update({
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    region: REGION
  });
  var s3 = new AWS.S3();

  const myCamera = new PiCamera({
    mode: "photo",
    output: `${__dirname}/test.jpg`,
    width: 640,
    height: 480,
    nopreview: true
  });
  //--------------------------

  var app = firebase.initializeApp(config);
  var auth = app.auth()
  var db = app.firestore();
  var fieldValue = firebase.firestore.FieldValue;
//  const messages = () => db.ref('messages');
//  const comments = (uid) => db.ref(`messages/${uid}/comments`);
//  const sensorData = (uid, commentID) => db.ref(`messages/${uid}/comments/${commentID}`)

//   const user = uid => db.ref(`users/${uid}`);

//  const users = () => db.ref("users");

//  const sensors = uid => db.ref(`users/${uid}/sensors`);

  const sensor = (uid, sensorID) => db.doc(`users/${uid}/sensors/${sensorID}`);
  //REMOTE PROGRAMMING TEST --------
  //const sensorType = (uid) => db.doc(`sensorTypes/${uid}`);
  const writeStream = fs.createWriteStream('file.ino');
  const pathName = writeStream.path;
  let array=[]

  //REMOTE PROGRAMMING TEST --------
//  const actuators = uid => db.ref(`users/${uid}/actuators`);

  const actuator = (uid, sensorID) => db.doc(`users/${uid}/actuators/${sensorID}`);
  let counter = 0;
  let alarmCounter = 0;
  const frame_obj = {

    type: 0x10, // xbee_api.constants.FRAME_TYPE.ZIGBEE_TRANSMIT_REQUEST
    id: 0x01, // optional, nextFrameId() is called per default
    destination64: "000000000000FFFF",
    destination16: "fffe", // optional, "fffe" is default
    broadcastRadius: 0x00, // optional, 0x00 is default
    options: 0x00, // optional, 0x00 is default
    //data: "1" // Can either be string or byte array.
};

  xbee_api.serPort.pipe(xbee_api.xbeeModule.parser);
  xbee_api.xbeeModule.builder.pipe(xbee_api.serPort);

  auth.signInWithEmailAndPassword(process.env.NODE_APP_EMAIL,
    process.env.NODE_APP_PASSWORD)
  .catch(function(error){ console.log(error)})
  auth.onAuthStateChanged(authUser =>{
      if(authUser){
          console.log("Authuser: ",authUser.uid)
        //  sensor(authUser.uid, process.env.NODE_APP_SENSORID)
        //  .update({data: 101});
        //   messages().on('value', snapshot => {
        //     console.log("SNAPSHOT", snapshot.val())
        // })

        actuator(authUser.uid, process.env.NODE_APP_LAMP1ID).onSnapshot(snapshot => {
            console.log("SNAPSHOT: ",snapshot.data())
           //  if (snapshot.data().state === 1){
            //     console.log("SENDING 1");
            //     frame_obj.data="1";
            //     xbee_api.xbeeModule.builder.write(frame_obj);
           //  }
           //  if (snapshot.data().state === 0){
           //      console.log("SENDING 0");
           //      frame_obj.data="0";
           //      xbee_api.xbeeModule.builder.write(frame_obj);
           //  }
        })
        //REMOTE PROGRAMMING TEST --------
        sensor(authUser.uid, process.env.CODE_TEST_ID).onSnapshot(snapshot => {
          console.log("SensorType for remote program test: ", snapshot.data());
          let str = snapshot.data().code.toString();
          array = str.split("END");
          console.log("in array: ",array);
          array.forEach(value => writeStream.write(`${value}\n`));
          //writeStream.write(str);
          writeStream.on('finish', () => {
            console.log(`wrote all the array data to file ${pathName}`);
         });
         
         // handle the errors on the write process
         writeStream.on('error', (err) => {
             console.error(`There is an error writing the file ${pathName} => ${err}`)
         });
         
         // close the stream
         writeStream.end();
          
        })
        //REMOTE PROGRAMMING TEST --------
        sensor(authUser.uid, process.env.CAMERA_ID).onSnapshot(snapshot => {
          if (snapshot.data().cameraTrigger){
            console.log("Trigered !!!")
            myCamera
              .snap()
              .then(result => {
                console.log("Success !!!!");
                s3.putObject({
                  Bucket: BUCKET,
                  Body: fs.readFileSync(localImage),
                  Key: imageRemoteName
                })
                  .promise()
                  .then(response => {
                    console.log(`done! - `, response);
                    // console.log(
                    //   `The URL is ${s3.getSignedUrl("getObject", {
                    //     Bucket: BUCKET,
                    //     Key: imageRemoteName
                    //   })}`
                    // );
                    sensor(authUser.uid, process.env.CAMERA_ID)
                    .update({ 
                      readingDate: fieldValue.serverTimestamp(),
                      data: s3.getSignedUrl("getObject", {
                      Bucket: BUCKET,
                      Key: imageRemoteName,
                      Expires: 3600
                        }) 
                      });
                  })
                  .catch(err => {
                    console.log("failed:", err);
                  });
              })
              .catch(error => {
                console.log("ERROR", error);
              });
            sensor(authUser.uid, process.env.CAMERA_ID)
            .update({ cameraTrigger: false });

          }
        })

        xbee_api.xbeeModule.parser.on("data", function(frame) {
            console.log(">>", frame)
            console.log(">>", frame.remote64)
                if(frame.data){
                if(frame.remote64==='0013a2004106afaf'){
		var press = frame.data.readFloatLE(1);
		var temp = frame.data.readFloatLE(5);
                    console.log(temp);
		console.log(press);
                  //  console.log(frame.data.readFloatLE(5));
                  //  console.log("COUNTER: ", counter);
                      sensor(authUser.uid, process.env.NODE_APP_TERMOMETERID)
                     .update({data: temp,
                            readingDate: fieldValue.serverTimestamp()
                            });
			sensor(authUser.uid, process.env.NODE_APP_BAROMETERID)
			.update({
				data: press,
				readingDate: fieldValue.serverTimestamp()
			});
			
                    // comments("-LwnsU_BjlGG5_1tQ_VT").push({
                    //     body: "Sensor Data",
                    //     sensorData1: frame.data.readFloatLE(1),
                    //     sensorData2: frame.data.readFloatLE(5)
                    // })
                  //  sensorData("-LwnsU_BjlGG5_1tQ_VT","-LxMEPI-clzctUzlNTX3").update({
                  //      body: "Sensor Data",
                   //     sensorData1: frame.data.readFloatLE(1),
                    //    sensorData2: frame.data.readFloatLE(5),
                    //    cnt: counter
                  //  })
                    counter++;
                               
                }
                else if (frame.remote64==='0013a2004106afba'){
                    // console.log("ALARM:  ",frame.data.toString());
                    console.log("TEMPERATURE", frame.data.readFloatLE());
                    console.log("Alarm CNT: ", alarmCounter)
                    alarmCounter++;
                }
                };
        });

        
      }
  })

  
