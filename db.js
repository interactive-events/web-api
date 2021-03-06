var mongoose = require('mongoose');
var uriUtil = require('mongodb-uri');
 
/* 
 * Mongoose by default sets the auto_reconnect option to true.
 * We recommend setting socket options at both the server and replica set level.
 * We recommend a 30 second connection timeout because it allows for 
 * plenty of time in most operating environments.
 */
var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 1, connectTimeoutMS : 30000 } } };
 
/*
 * Mongoose uses a different connection string format than MongoDB's standard.
 * Use the mongodb-uri library to help you convert from the standard format to
 * Mongoose's format.
 */
 var mongodbUri; //mongodb://user:pass@host:port/db';
if(process.env.dbUri) {
    mongodbUri = process.env.dbUri;
} else {
    mongodbUri = require('./secret').dbUri; //mongodb://user:pass@host:port/db';
}

var mongooseUri = uriUtil.formatMongoose(mongodbUri);
 
mongoose.connect(mongooseUri, options);
var conn = mongoose.connection;             
 
conn.on('error', function(err) {
	console.log("database connection error: ", err);
	//console.error.bind(console, 'connection error:'));  
});
 
conn.once('open', function() {
	// Wait for the database connection to establish, then start the app. 
	console.log("database connected!");
});


exports.mongoose = mongoose;

var ObjectId = mongoose.Schema.Types.ObjectId;
var Schema = mongoose.Schema;

// FILTERS FOR VALIDATION //
function toLower (v) {
	return v.toLowerCase();
}


// USER //
var UserSchema = Schema({
    username: {type: String, index: {unique: true, dropDups: true, required: true} },
    password: String,
    name: String,
    gcmToken: String,
    created: { type: Date, default: Date.now }
});
mongoose.model('User', UserSchema);
var User = mongoose.model('User');
exports.User = User;
/*
var dummyUser = new User({
    email: 'bob@example.com',
    username: 'bob',
    password: 'secret'
  });
dummyUser.save();
*/

// POLL VOTER //
var PollVoterSchema = Schema({
    activity: { type: ObjectId, ref: "Activity", index: {required: true} },
    userId: { type: String, index: {required: true} },
    created: { type: Date, default: Date.now }
});
mongoose.model('PollVoter', PollVoterSchema);
var PollVoter = mongoose.model('PollVoter');
exports.PollVoter = PollVoter;

// TOKENS //
var TokenSchema = Schema({
    //id: is automatic on _id 
    token: String, 
    client: {type: ObjectId, ref: "Client"},
    user: {type: ObjectId, ref: "User"},
    scope: String,
    expirationDate: Date,
    created: { type: Date, expires: 3600, default: Date.now } // delete from db after 1h. 
});
mongoose.model('Token', TokenSchema);
var Token = mongoose.model('Token');
exports.Token = Token;


// CLIENT //
var ClientSchema = Schema({
    //id: String, user _id!
    secret: String,
    isPublic: Boolean,
    isTrusted: Boolean,
    scope: String
});
mongoose.model('Client', ClientSchema);
var Client = mongoose.model('Client');
exports.Client = Client;
/*
var dummy = new Client({
    secret: "derp",
    isPublic: true,
    isTrusted: true,
    scope: "js"
  });
dummy.save(function(err) {
    if(err) console.log(err);
});*/


// REFRESH TOKEN //
var RefreshTokenSchema = Schema({
    token: String,
    client: {type: ObjectId, ref: "Client"},
    user: {type: ObjectId, ref: "User"}
});
mongoose.model('RefreshToken', RefreshTokenSchema);
var RefreshToken = mongoose.model('RefreshToken');
exports.RefreshToken = RefreshToken;


// EVENT //
var EventSchema = Schema({
    //id: is automatic on _id 
    title: { type: String, index: {required: true} },
    description: { type: String, index: {required: true} }, 
    beacon: { type: ObjectId, ref: "Beacon", index: {required: true} },  
    creator: { type: ObjectId, ref: "User", index: {required: true} },  
    admins: [ { type: ObjectId, ref: "User", index: {required: true} } ],
    time: {
        start: { type: Date, index: {required: true} },
        end: { type: Date, index: {required: true} }       
    },
    isPrivate: { type: Boolean, default: true},
    invitedUsers: [ { type: ObjectId, ref: "User" } ],
//    invited_user_groups: [ {type: ObjectId, ref: "UserGroupSchema"} ],
    activities: [ {type: ObjectId, ref: "Activity"} ],
    currentParticipants: [ {type: ObjectId, ref: "User"} ],
    created: { type: Date, default: Date.now },
    
    location: {
        coordinates: {
            longitude: Number,
            latitude: Number
        },
        name: String
    }
});
mongoose.model('Event', EventSchema);
var Event = mongoose.model('Event');
exports.Event = Event;
/*
var dummy = new Event({
    title: "First event!",
    description: "This was the first event ever (in this database)!", 
    beacon: mongoose.Types.ObjectId("546da619aebf240000d8a1fd"),  
    creator: mongoose.Types.ObjectId("546ca7b62238760000517704"),  
    admins: [ mongoose.Types.ObjectId("546ca7b62238760000517704") ],
    time: {
        start: "2014-11-21 08:15:00.327Z",
        end: "2014-11-21 08:30:00.327Z"
    },
    isPrivate: true,
    invitedUsers: [],
//    invited_user_groups: [ {type: ObjectId, ref: "UserGroupSchema"} ],
    activities: [ mongoose.Types.ObjectId("546da92147a9c1000078bb84") ],
    currentParticipants: [],
    
    location: {
        coordinates: {
            longitude: 64.485012,
            latitude: 20.937500
        },
        name: "Skogen"
    }
  });
dummy.save(function(err) {
    if(err) console.log(err);
});*/


// BEACON //
var BeaconSchema = Schema({
    description: String,
    id: String,
    uuid: String,
    minor: Number,
    major: Number
});
mongoose.model('Beacon', BeaconSchema);
var Beacon = mongoose.model('Beacon');
exports.Beacon = Beacon;
/*
var dummy = new Beacon({
    description: "Fredriks iPhone",
    name: "B9407F30-F5F8-466E-AFF9-25556B57fE6D",
    minor: 1,
    major: 2
  });
dummy.save(function(err) {
    if(err) console.log(err);
});
*/


// MODULE //
var ModuleSchema = Schema({
    name: String,
    description: String,
    hasOverview: Boolean,
    hasPushview: Boolean
});
mongoose.model('Module', ModuleSchema);
var Module = mongoose.model('Module');
exports.Module = Module;
/*
var dummy = new Module({
    name: "poll",
    description: "Vote and see results in real time. ",
    hasOverview: false,
    hasPushview: true
  });
dummy.save(function(err) {
    if(err) console.log(err);
});*/


// ACTIVITY //
var ActivitySchema = Schema({
    name: { type: String, index: {required:  true} },
    state: { type: String },
    customData: Schema.Types.Mixed,
    //customData: String,
    module: {type: ObjectId, ref: "Module", index: {required: true}}
});
mongoose.model('Activity', ActivitySchema);
var Activity = mongoose.model('Activity');
exports.Activity = Activity;
/*
var dummy = new Activity({
    name: "Har morgonstund guld i mun?",
    customData: "base64 kanske?",
    module: mongoose.Types.ObjectId("546da619aebf240000d8a1fe")
  });
dummy.save(function(err) {
    if(err) console.log(err);
});*/
/*
Activity.findById("547302104ded6f1322dc28f2").exec(function(err, act) {
    Event.findById("547302104ded6f1322dc28f1").exec(function(err, ev) {
        ev.activities.push(act);
        ev.save();
    });
});*/


/*
// USER GROUP //
var UserGroupchema = Schema({
    title: String,
    creator: {type: ObjectId, ref: "UserSchema"},
    users: [ {type: ObjectId, ref: "UserSchema"} ]
});
mongoose.model('UserGroup', UserGroupSchema);
var UserGroup = mongoose.model('UserGroup');
exports.UserGroup = UserGroup;

*/




