function startServer(port) {
    var restify = require('restify');
    var passport = require('passport');
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

    server.use(function crossOrigin(req,res,next){
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        return next();
        }
    );

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