
var modules = {
	poll: require("./poll")
};
var db = require('../db');
var authenticate = require('../server').authenticate;

module.exports = function(server) {
	// add custom rutes
	modules.poll(server);

	// add start
	server.get('/events/:eventId/modules/:moduleId/start',  function(req, res, next) {
		db.Event.findById(req.params.eventId).populate({ path: 'activities', model: 'Activity' }).exec(function(err, event) {
			if(!err && ! event) return res.send(404);
			console.log("start module", err, event)
	    	return res.send("asd");
	    });
	    return;
	    if(req.params.eventId == 1 && req.params.moduleId == 1) {
	        return modules.poll.start(req, res, next, "/events/"+req.params.eventId+"/modules/"+req.params.moduleId+"");
	    }
	    return next();
	});
}

exports.poll = modules.poll;


