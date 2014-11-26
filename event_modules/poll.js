
var io = require("../server").io;

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
	

}

module.exports.start = function start(req, res, next, socketNameSpace) {
	if(isNamespaceActive(socketNameSpace) == true) {
		return res.send(410); // 410: Gone
	}

	var nsp = io.of(socketNameSpace);
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


