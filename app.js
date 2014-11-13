function startServer(port) {
    var restify = require('restify');
    var passport = require('passport');
    var socketio = require('socket.io');
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
        res.send("You are logged in!");
    });
    
    /* Socket.io */

    server.get('/events/:eventId/modules/:moduleId/start', function(req, res, next) {
        if(req.params.eventId == 1 && req.params.moduleId == 1) {
            return modules.poll.start(req, res, next, "/events/"+req.params.eventId+"/modules/"+req.params.moduleId+"/");
        }
        return next();
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

