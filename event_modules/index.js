
var modules = {
	poll: require("./poll")
};
var db = require('../db');
var authenticate = require('../server').authenticate;

var dbModules = {
	"546da619aebf240000d8a1fe": "poll"
};

module.exports = function(server) {
	// add custom rutes
	//modules.poll(server);

	// add start
	server.put('/events/:eventId/activities/:activityId/start', authenticate, function(req, res, next) {
		
		// TODO: migrate this 
		db.Event.findById(req.params.eventId).populate({
			path: 'activities', 
			match: { _id: req.params.activityId }, 
			model: 'Activity'
		}).exec(function(err, event) {
			if(err) return res.send(500, err)
			if(!event) return res.send(404, "event not found");
			for(var i=0; event.activities.length > i; i++) {
				for(key in dbModules) {
					if(event.activities[i].module == key && modules.hasOwnProperty(dbModules[key])) {
						return modules[dbModules[key]].start(req, res, next, "/events/"+req.params.eventId+"/modules/"+req.params.activityId+"");
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


