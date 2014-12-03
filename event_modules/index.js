
var modules = {
	poll: require("./poll")
};
var db = require('../db');
var authenticate = require('../server').authenticate;
var push = require('../push');

var dbModules = {
	"546da619aebf240000d8a1fe": "poll"
};

module.exports = function(server) {
	// add custom rutes
	modules.poll(server);

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
			for(var i=0; event.activities.length > i; i++) { // (is only one activity..)
				var activity = event.activities[i];
				for(key in dbModules) {
					if(activity.module == key && modules.hasOwnProperty(dbModules[key])) {

						if(req.params.hasOwnProperty("state")) activity.state = req.params.state;
						if(req.params.hasOwnProperty("name")) activity.name = req.params.name;
						if(req.params.hasOwnProperty("customData")) activity.customData = req.params.customData;
						if(req.params.hasOwnProperty("module")) activity.module = req.params.module;

						activity.save();


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
				                			url: "http://interactive-events-web-app.s3-website-eu-west-1.amazonaws.com/events/"+event._id+"/activities/"+activity._id
				                		}, function(err, results) {
				                			console.log("PUSH!", err, results);
				                		});
				                	} else {
				                		console.log("Not pushing since no of the currentParticipants have a gcmToken");
				                	}
				                });
							
							// starts 
							return modules[dbModules[key]].start(req, res, next, "/events/"+req.params.eventId, req.params.activityId);
						}

						// END ACTIVITY //
						else if(req.params.hasOwnProperty("state") && req.params.state === "finish") {

						}
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

exports.poll = modules.poll;


