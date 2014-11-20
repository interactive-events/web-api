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
    exports.io = io;
    var modules = require('./event_modules')

    // Set cross origin headers for Ajax calls
    // TODO Maybe add specific Origin, such as the Web app URL
    server.use(
    function crossOrigin(req,res,next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        return next();
    });

    // Handles OPTIONS requests that are sent by browsers before
    // Ajax requests.
    function unknownMethodHandler(req, res) {
    if (req.method.toLowerCase() === 'options') {
        if (res.methods.indexOf('OPTIONS') === -1) {res.methods.push('OPTIONS');}
            res.header('Access-Control-Allow-Origin', "*");
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

    // curl -v http://.../secret/?access_token=123456789
    server.get('/secret', passport.authenticate('accessToken', { session: false }), //passport.authenticate('bearer', { session: false }), 
            function(req, res){
        res.send("You are logged in! with username "+req.user.username+". id("+req.user._id+")");
    });
    
    /* Socket.io */

    server.get('/events/:eventId/modules/:moduleId/start', function(req, res, next) {
        if(req.params.eventId == 1 && req.params.moduleId == 1) {
            return modules.poll.start(req, res, next, "/events/"+req.params.eventId+"/modules/"+req.params.moduleId+"");
        }
        return next();
    });

    /* Database */

    server.post('/events/:eventId/checkins', passport.authenticate('accessToken', { session: false }), function(req, res, next) {
        db.Event.update({ _id: req.params.eventId }, 
        { $push: { currentParticipants: db.mongoose.Types.ObjectId(req.user._id) } }, 
        { upsert: false }, 
        function(err, accessToken) {
            if(err) {
                return res.send(410, err); //401: gone
            }
            return res.send(200);
        });
    });
    server.put('/events', passport.authenticate('accessToken', { session: false }), function(req, res, next) {
        if(typeof req.params.title === 'undefined') {
            return res.send(403, "title undefined");
        }
        if(typeof req.params.description === 'undefined') {
            return res.send(403, "description undefined");
        }
        if(typeof req.params.beacon === 'undefined') {
            return res.send(403, "beacon undefined");
        }
        if(typeof req.params.time === 'undefined') {
            return res.send(403, "time undefined");
        }
        if(typeof req.params.time.end === 'undefined') {
            return res.send(403, "time.end undefined");
        }
        if(typeof req.params.time.start === 'undefined') {
            return res.send(403, "time.start undefined");
        }

        var activitieIds = [];
        if(req.params.activities instanceof Array) {
            for (var i=0; i < req.params.activities.length; i++) {
                
                if(typeof req.params.activities[i].name === 'undefined') {
                    return res.send(403, "activity["+i+"].name undefined");
                }
                if(typeof req.params.activities[i].customData === 'undefined') {
                    return res.send(403, "activity["+i+"].customData undefined");
                }
                if(typeof req.params.activities[i].module === 'undefined') {
                    return res.send(403, "activity["+i+"].module undefined");
                }
                var newActivity = new db.Activity({
                    name: req.params.activities[i].name,
                    customData: req.params.activities[i].customData,
                    module: db.mongoose.Types.ObjectId(req.params.activities[i].module)
                  });
                newActivity.save(function(err) {
                    if(err) console.log(err);
                });
                activitieIds[i] = db.mongoose.Types.ObjectId(newActivity._id);
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
            activities: activitieIds,
            location: req.params.location /*{
                coordinates: {
                    longitude: req.params.location.coordinates.longitude,
                    latitude: req.params.location.coordinates.latitude
                },
                name: req.params.location.name
            }*/
        });

        newEvent.save(function(err) {
            if(err) {
                return res.send(500, err);
            }
            return res.send(201, newEvent._id);
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

