var { SerialPort } = require('serialport');
//var port = new SerialPort('/dev/ttyS1', { autoOpen: false, baudRate: 115200, encoding: 'utf8'});
var port = new SerialPort({ path: '/dev/ttyS1', baudRate: 115200,  encoding: 'utf8', autoOpen: false });
var { ReadlineParser } = require('@serialport/parser-readline');
var parser = new ReadlineParser();


port.open(function (err) {
    if (err) {
        return console.log('Error opening port: ', err.message);
    } else {
        console.log('Serial port opened successfully');
        //self.probeSerial();
        port.pipe(parser);
        getVolume();
        send('TRUE');
        setTimeout(()=>{
            send('FALSE');
        }, 1000);
        setTimeout(()=>{
            send('TRUE');
        }, 2000);
        setTimeout(()=>{
            send('FALSE');
        }, 3000);
        setTimeout(()=>{
            send('TRUE');
        }, 4000);
    }

});

parser.on('data', function (data) {
    // We need to parse this as with MVOL there is a \x00\x00 push
    var parsedData = data.toString().replace(/\x00\x00/g,'')
    console.log('Serial Data: ' + parsedData);
})

port.on('error', function(err) {
   console.error('Generic error in serial: '+err);
})
parser.on('error', function(err) {
    console.error('Generic error in serial: '+err);
})

function send(muteCmd){
    var message = '\rSET MUTE ' +muteCmd + '\r';
    port.write(message);
}

function getVolume() {
    var message = '\rGET MVOL\r';

    return port.write(message);
}

