
var modules = {
	poll: require("./poll")
};
var db = require('../db');
var authenticate = require('../server').authenticate;
var push = require('../push');
var webAppBaseUrl = require("../server").webAppBaseUrl;

var dbModules = {
	"546da619aebf240000d8a1fe": "poll"
};

module.exports = function(server) {
	// add custom rutes
	modules.poll(server);

	server.get('/events/:eventId/activities/:activityId', authenticate, function(req, res, next) {
		db.Event.findById(req.params.eventId).populate({
			path: 'activities', 
			match: { _id: req.params.activityId }, 
			model: 'Activity'
		}).lean().exec(function(err, event) {
			if(err) return res.send(500, err)
			if(!event) return res.send(404, "event not found");
			for(var i=0; event.activities.length > i; i++) { // (is only one activity..)
				var activity = event.activities[i];
				for(key in dbModules) {
					if(activity.module == key && modules.hasOwnProperty(dbModules[key])) {
			            event["id"] = event["_id"];
			            delete event["_id"];
			            delete event["__v"];
			            activity["id"] = activity["_id"];
			            delete activity["_id"];
			            delete activity["__v"];
						return modules["poll"].get(req, res, next, event, activity);
					}
				}
    			return res.send(500, "no module found in activity "+req.params.activityId+" not found in");
			}
			return res.send(404, "activity "+req.params.activityId+" not found in event "+req.params.eventId);
		});
    	
	});

	// yes, put on activity needs to go under events/eventId. Push needs access to event and activity collection dont have connection to event. 
	server.put('/events/:eventId/activities/:activityId', authenticate, function(req, res, next) {
		

		// TODO: migrate this 
		db.Event.findById(req.params.eventId).populate({
			path: 'activities', 
			match: { _id: req.params.activityId }, 
			model: 'Activity'
		}).exec(function(err, event) {
			if(err) return res.send(500, err)
			if(!event) return res.send(404, "event not found");
			if(event.admins.indexOf(req.user._id) < 0) return res.send(403, "You are not an admin of this event. ");
			for(var i=0; event.activities.length > i; i++) { // (is only one activity..)
				var activity = event.activities[i];
				for(key in dbModules) {
					if(activity.module == key && modules.hasOwnProperty(dbModules[key])) {

						var updates = 0;
						if(req.params.hasOwnProperty("state")) {
							activity.state = req.params.state;
							updates++;
						}
						if(req.params.hasOwnProperty("name")) {
							activity.name = req.params.name;
							updates++;
						}
						if(req.params.hasOwnProperty("customData")) {
							activity.customData = req.params.customData;
							activity.markModified("customData");
							updates++;
						}
						if(req.params.hasOwnProperty("module")) {
							activity.module = req.params.module;
							updates++;
						}

						// callback hell
						var continuePut = function() {
							// START ACTIVITY //
							if(req.params.hasOwnProperty("state") && req.params.state === "start") {
								// send push to mobiles
								db.User.find({
								    '_id': {
								        $in: event.currentParticipants
								    }
								}).exec(function(err, users) {
									var gcmTokens = [];
									for(var j=0; j<users.length; j++) {
										if(users[j].gcmToken && users[j].gcmToken.length > 0) {
											gcmTokens.push(users[j].gcmToken);
										}
									}

									if(gcmTokens.length > 0) {
										push.android(gcmTokens, {
											eventId: event._id,
											eventTitle: event.title,
											name: activity.name, 
											module: dbModules[key],
											activityId: activity._id,
											url: webAppBaseUrl+"/events/"+event._id+"/activities/"+activity._id+"/vote"
										}, function(err, results) {
											console.log("PUSH!", err, results);
										});
									} else {
										message = "Not pushing since no of the currentParticipants have a gcmToken";
										console.log("Not pushing since no of the currentParticipants have a gcmToken");
									}
								});
								
								// starts 
								return modules[dbModules[key]].start(req, res, next, "/events/"+req.params.eventId, req.params.activityId);
							}

							// END ACTIVITY //
							else if(req.params.hasOwnProperty("state") && req.params.state === "finish") {

							}

							return res.send(200);
						};

						
        				if(updates > 0) {
        					activity.save(function(err) {
								if(err) return res.send(500, err);
								continuePut();
							});
						} else {
							continuePut();
						}
						return;
						
					}
				}
	    		return res.send(500, "no module found in activity "+req.params.activityId+" not found in");
            }
	    	return res.send(404, "activity "+req.params.activityId+" not found in event "+req.params.eventId);
	    });
	    /*
	    if(req.params.eventId == 1 && req.params.moduleId == 1) {
	        return modules.poll.start(req, res, next, "/events/"+req.params.eventId+"/modules/"+req.params.moduleId+"");
	    }
	    return next();*/



		
	});
}
/*
module.exports.addOnSocketIo = function(socket, eventId) {

	socket.on("joinActivity", function(data) {
		if(data.activityId) socket.emit("data.activityId missing");
		db.Event.findById(req.params.eventId).populate({
			path: 'activities', 
			match: { _id: req.params.activityId }, 
			model: 'Activity'
		}).lean().exec(function(err, event) {
			if(err) return socket.emit("db error ", err)
			if(!event) return socket.emit("event not found");
			for(var i=0; event.activities.length > i; i++) { // (is only one activity..)
				var activity = event.activities[i];
				for(key in dbModules) {
					if(activity.module == key && modules.hasOwnProperty(dbModules[key])) {
						console.log("someone joined!");
						socket.join(activityId);
						socket.emit("joined "+activityId);
						socket.broadcast.to(activityId).send('someone joined room');
						return;
					}
				}
			}
		});
	});
};
*/
module.exports.poll = modules.poll;


