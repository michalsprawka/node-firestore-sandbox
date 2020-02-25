const  SerialPort = require('serialport');
const  xbee_api = require('xbee-api');


let xbeeAPI;
let serialport


//console.log("inside xbee: ",serialport);
if(!xbeeAPI){
xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 2
});
}
if(!serialport){
serialport = new SerialPort('/dev/ttyUSB0', {
  baudRate: 9600,
  parser: xbeeAPI.rawParser()
});
}
//serialport.pipe(xbeeAPI.parser);
//xbeeAPI.builder.pipe(serialport);
//console.log("inside xbee2: ",serialport);
module.exports = {
	serPort : serialport,
        xbeeModule : xbeeAPI
}
