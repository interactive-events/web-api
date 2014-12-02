
var io = require("../server").io;


function isNamespaceActive(socketNameSpace) {
	return false;
	if(socketNameSpace in namespaces) {
		if(namespaces[socketNameSpace].isActive == true) {
			return true;
		}
		return false;
	}
	return false;
}

module.exports = function(server) {
	

}

module.exports.start = function start(req, res, next, socketNameSpace, activityId) {
	if(isNamespaceActive(socketNameSpace) == true) {
		return res.send(410); // 410: Gone
	}

	var nsp = io.of(socketNameSpace); // hopefully atatch to a existing nsp

	nsp.on('joinActivity'+activityId, function(socket) {
		socket.join(activityId);
	});

	// TODO: periodic read from db and push that untill all have voted. 

	// hardcoded example for now:
	
/*
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
	*/
	return res.send(201);
}


