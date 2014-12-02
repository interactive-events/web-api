
var app = require("../server");
var db = require('../db');

var authenticate = app.authenticate;


// TODO: migrate to database. Needed if more than one node machine will ever run. 
var namespaces = {};

function isNamespaceActive(socketNameSpace) {
	if(socketNameSpace in namespaces) {
		if(namespaces[socketNameSpace].isActive == true) {
			return true;
		}
		return false;
	}
	return false;
}

module.exports = function(server) {

	server.get('/events/:eventId/activities/:activityId', authenticate, function(req, res, next) {
		// [] is user admin for this event - isAdmin = true

		// has user already voted in this poll?
		var hasVoted = null;
		db.PollVoter.findOne({ 'activity': req.params.activityId, 'userId': req.user._id }).exec(function (err, pollVoter) {
			if (err) return res.send(404);
			if (pollVoter != null) {
				console.log(pollVoter);
				hasVoted = true;
			} else {
				hasVoted = false;
			}
			console.log("hasVoted=", hasVoted);
		});

		// is the poll still active (eg. is the event still ongoing?)
		var eventFinished = null;
		db.Event.findById(req.params.eventId).lean().exec(function (err, events) {
			if(err) return res.send(404);
			var currentTime = new Date();
			var eventEndTime = new Date(events.time.end);
			if (currentTime.getTime() > eventEndTime.getTime()) {
				eventFinished = true;
			} else {
				eventFinished = false;
			}
			console.log("eventFinished=", eventFinished);
		});

		db.Activity.findById(req.params.activityId).lean().exec(function (err, activity) {
			if (err) return res.send(404);
			activity["id"] = activity["_id"];
			delete activity["_id"];
			delete activity["__v"];
			console.log("activity=",activity);
			pollDesc = JSON.parse(activity.customData);
			console.log("");
			console.log("pollDesc=",pollDesc);
			console.log("pollDesc['pollDescription']=",pollDesc['pollDescription']);
			tmpJson = {
				'pollDescription': pollDesc['pollDescription'],
				'hasVoted': hasVoted,
				'eventFinished': eventFinished
			}
			activity.customData = tmpJson;
			res.send(activity);
		});
	});
}

module.exports.start = function start(req, res, next, socketNameSpace) {
	if(isNamespaceActive(socketNameSpace) == true) {
		return res.send(410); // 410: Gone
	}

	var nsp = app.io.of(socketNameSpace);
	namespaces[socketNameSpace] = {
		isActive: true
	}

	nsp.on('connection', function(socket) {
		nsp.emit('join', { option: "0"});
	});

	// TODO: periodic read from db and push that untill all have voted. 

	// hardcoded example for now:
	

	setTimeout(function() {
		var i=0;
		function randomInt(low, high) {
		    return Math.floor(Math.random() * (high - low) + low);
		}
		function doVote() {
			if(i > 100) {
				namespaces[socketNameSpace] = null;
				delete namespaces[socketNameSpace];
				return;
			}

			var vote = randomInt(0,2);
			var sleep = randomInt(100,1000);
			i++;
			console.log("doVote("+i+"): "+vote+". sleep: ", sleep);

			nsp.emit('vote', { option: vote});
			setTimeout(doVote, sleep);
		}
		doVote();
	}, 0); // fork
	
	return res.send(201);
}


