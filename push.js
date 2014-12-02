/* push.js */
// Used to push to mobiles with Google gsm

var gcm = require('node-gcm');

var gcmKey;
if(process.env.gcmKey) {
    gcmKey = process.env.gcmKey;
} else {
    gcmKey = require('./secret').gcmKey;
}



var sender = new gcm.Sender(gcmKey);


exports.android = function(registrationIds, data, callback) {
    var message = new gcm.Message({
        collapseKey: 'demo',
        delayWhileIdle: true,
        timeToLive: 3,
        data: data
    });
    sender.send(message, registrationIds, 2, function (err, result) {
        callback(err, result);
    });
}