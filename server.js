function startServer(port) {
    var restify = require('restify');
    var passport = require('passport');
    var socketio = require('socket.io');
    var db = require('./db');
    //var login = require('connect-ensure-login')

    require('./auth');
    var oauth = require("./oauth2");

    var server = restify.createServer({
        name: 'Interactive Events API',
        version: '1.0.0'
    });
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());
    server.use(passport.initialize());
    
    var io = socketio.listen(server); 
    var allowedHeaders =  "X-Requested-With, Authorization, content-type, accept"; 
    exports.io = io;

    // Set cross origin headers for Ajax calls
    // TODO Maybe add specific Origin, such as the Web app URL
    server.use(function crossOrigin(req,res,next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", allowedHeaders);
        return next();
    });

    // Handles OPTIONS requests that are sent by browsers before
    // Ajax requests.
    function unknownMethodHandler(req, res) {
    if (req.method.toLowerCase() === 'options') {
        if (res.methods.indexOf('OPTIONS') === -1) {res.methods.push('OPTIONS');}
            res.header('Access-Control-Allow-Origin', "*");
            res.header("Access-Control-Allow-Headers", allowedHeaders);
            return res.send(204);
    }
    else
        return res.send(new restify.MethodNotAllowedError());
    }

    server.on('MethodNotAllowed', unknownMethodHandler);

    server.pre(function (request, response, next) {
        request.log.info({ req: request }, 'REQUEST');
        next();
    });

    server.get('/', function(req, res, next) {
        res.send(listAllRoutes(server));
        return next();
    });

    server.get('/echo/:name', function(req, res, next) {
        res.send(req.params);
        return next();
    });

    /* oAuth */
    // curl -v -H "Content-Type: application/json" -X POST localhost:8000/oauth/token -d '{"username": "<username>", "password": "<password>", "client_id": "<client_id>", "client_secret": "<client_secret>", grant_type": "password"}'
    // curl -X POST localhost:8000/oauth/token -v -H "Content-Type: application/json" -d '{"grant_type": "refresh_token", "refresh_token": "<refreshToken>"}'
    server.post('/oauth/token', oauth.token);
    server.post('/logout', function(req, res, next) {
        req.logout();
        return res.send(202);
    });

    var authenticate = passport.authenticate('accessToken', { session: false });
    exports.authenticate = authenticate;

    // curl -v http://.../secret/?access_token=123456789
    server.get('/secret', authenticate, function(req, res){
        res.send("You are logged in! with username "+req.user.username+". id("+req.user._id+")");
    });


    /* Module custom routes */
    require('./event_modules')(server);
    

    /* Database */

    server.post('/events/:eventId/checkins', authenticate, function(req, res, next) {
        db.Event.findById(req.params.eventId, function(err, event) {
            if(err) return res.send(500, err);
            if(!event) return res.send(404, "event ("+req.params.eventId+") not found");
            var now = new Date().getTime();
            if(new Date(event.time.start).getTime() < now && now < new Date(event.time.end).getTime()) {
                event.currentParticipants.push(db.mongoose.Types.ObjectId(req.user._id));
                event.save();
                return res.send(200);
            }
            return res.send(403, "event not started");
        }); /*
        db.Event.update({ _id: req.params.eventId }, 
        { $push: { currentParticipants: db.mongoose.Types.ObjectId(req.user._id) } }, 
        { upsert: false }, 
        function(err, accessToken) {
            if(err) {
                return res.send(410, err); //401: gone
            }
            return res.send(200);
        });*/
    });
    server.get('/events/:eventId', authenticate, function(req, res, next) {
        db.Event.findById(req.params.eventId).lean().exec(function (err, events) {
            if(err) return res.send(404);
            events["id"] = events["_id"];
            delete events["_id"];
            delete events["__v"];
            res.send(events);
        });
    });
    server.get('/events', authenticate, function(req, res, next) {
        var limit = req.params.limit || 10;
        var offset = req.params.offset || 0;
        // TODO: add beacons stuff
        db.Event.find().skip(offset).limit(limit).lean().exec(function (err, events) {
            if(err) return res.send(404);
            var tmpJson = [];
            for(var key in events) {
                events[key]["id"] = events[key]["_id"];
                delete events[key]["_id"];
                delete events[key]["__v"];
                tmpJson.push({
                    "event": events[key]
                });
            }
            var resJson = {
                "events": tmpJson,
                "_metadata": [{totalCount: events.length, limit: limit, offset: offset}]
            }
            res.send(resJson);
        });
    });
    server.post('/events', authenticate, function(req, res, next) {
        if(typeof req.params.title === 'undefined') {
            return res.send(400, "title undefined");
        }
        if(typeof req.params.description === 'undefined') {
            return res.send(400, "description undefined");
        }
        if(typeof req.params.beacon === 'undefined') {
            return res.send(400, "beacon undefined");
        }
        if(typeof req.params.time === 'undefined') {
            return res.send(400, "time undefined");
        }
        if(typeof req.params.time.end === 'undefined') {
            return res.send(400, "time.end undefined");
        }
        if(typeof req.params.time.start === 'undefined') {
            return res.send(400, "time.start undefined");
        }

        var activities = [];
        if(req.params.activities instanceof Array) {
            for (var i=0; i < req.params.activities.length; i++) {
                
                if(typeof req.params.activities[i].name === 'undefined') {
                    return res.send(400, "activity["+i+"].name undefined");
                }
                if(typeof req.params.activities[i].customData === 'undefined') {
                    return res.send(400, "activity["+i+"].customData undefined");
                }
                if(typeof req.params.activities[i].module === 'undefined') {
                    return res.send(400, "activity["+i+"].module undefined");
                }
                var newActivity = new db.Activity({
                    name: req.params.activities[i].name,
                    customData: req.params.activities[i].customData,
                    module: db.mongoose.Types.ObjectId(req.params.activities[i].module)
                  });
                newActivity.save(function(err) {
                    if(err) console.log(err);
                });
                activities[i] = newActivity;
            }
        }

        var newEvent = new db.Event({
            title: req.params.title,
            description: req.params.description, 
            beacon: db.mongoose.Types.ObjectId(req.params.beacon),
            creator: db.mongoose.Types.ObjectId(req.user._id),  
            admins: [ db.mongoose.Types.ObjectId(req.user._id) ],
            time: req.params.time /*{
                start: req.params.time.start,
                end: req.params.time.end
            }*/,
            isPrivate: req.params.isPrivate,
            invitedUsers: req.params.invitedUsers,
            location: req.params.location /*{
                coordinates: {
                    longitude: req.params.location.coordinates.longitude,
                    latitude: req.params.location.coordinates.latitude
                },
                name: req.params.location.name
            }*/
        });

        // for populate query
        for (var i=0; i < req.params.activities.length; i++) {
            newEvent.activities.push(activities[i]);
        }

        newEvent.save(function(err) {
            if(err) {
                return res.send(500, err);
            }
            return res.send(201, newEvent._id);
        });
    });

    server.get('/events/:eventId/activities', authenticate, function(req, res, next) {
        var limit = req.params.limit || 10;
        var offset = req.params.offset || 0;
        db.Event.findById(req.params.eventId).populate('activities').lean().exec(function (err, events) {
            if(err) return res.send(404, "event.id="+req.params.eventId+" not found");
            var tmpJson = [];
            for(var i=0; events.activities.length > i; i++) {
                events.activities[i].id = events.activities[i]._id;
                delete events.activities[i]._id;
                delete events.activities[i].__v;
                tmpJson.push(events.activities[i]);
            }
            var resJson = {
                "activities": tmpJson,
                "_metadata": [{totalCount: events.activities.length, limit: limit, offset: offset}]
            }
            res.send(resJson);
        });
    });


    server.get('/beacons', authenticate, function(req, res, next) {
        var limit = req.params.limit || 10;
        var offset = req.params.offset || 0;
        db.Beacon.find().skip(offset).limit(limit).lean().exec(function (err, beacons) {
            if(err) return res.send(404);
            var tmpJson = [];
            for(var key in beacons) {
                beacons[key]["id"] = beacons[key]["_id"];
                delete beacons[key]["_id"];
                delete beacons[key]["__v"];
                tmpJson.push({
                    "beacon": beacons[key]
                });
            }
            var resJson = {
                "beacons": tmpJson,
                "_metadata": [{totalCount: beacons.length, limit: limit, offset: offset}]
            }
            res.send(resJson);
        });
    });
    server.get('/users', authenticate, function(req, res, next) {
        var limit = req.params.limit || 10;
        var offset = req.params.offset || 0;
        db.User.find().skip(offset).limit(limit).lean().exec(function (err, ret) {
            if(err) return res.send(404);
            var tmpJson = [];
            for(var key in ret) {
                ret[key]["id"] = ret[key]["_id"];
                delete ret[key]["_id"];
                delete ret[key]["__v"];
                delete ret[key]["password"];
                tmpJson.push({
                    "user": ret[key]
                });
            }
            var resJson = {
                "users": tmpJson,
                "_metadata": [{totalCount: ret.length, limit: limit, offset: offset}]
            }
            res.send(resJson);
        });
    });
    server.get('/activities/:activityId', authenticate, function(req, res, next) {
        db.Activity.findById(req.params.activityId).lean().exec(function (err, beacons) {
            if(err) return res.send(404);
            if(!beacons) return res.send(404);
            console.log(beacons);
            beacons["id"] = beacons["_id"];
            delete beacons["_id"];
            delete beacons["__v"];
            return res.send(beacons);
        });
    });

    server.put("/users/:userId/", authenticate, function(req, res, next) {
        if(req.user._id != req.params.userId) return res.send(403, "You can only change your own user. ");

        // TODO: fill in with more update fields. 
        update = {};
        if(req.params.hasOwnProperty("gcmToken")) update["gcmToken"] = req.params.gcmToken;

        db.User.update({_id: req.params.userId}, update, {}, function(err, numAffected) {
            if(err) return res.send(500, err);
            if(numAffected == 0) res.send(404, "user with id "+req.params.userId+" not found");
            return res.send(200);
        });
    });

    server.listen(process.env.PORT || port, function() {
        console.log('%s: now listening at %s', server.name, server.url);
    });

    function listAllRoutes(server) {
        var response = {};

        // GET routes
        server.router.routes.GET.forEach(
            function(value) {
                response.GET = value.spec.path;
            }
        );
        return response;
    }
}

exports.startServer = startServer;
startServer(8000);

