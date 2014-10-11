function startServer() {
    var restify = require('restify');

    var server = restify.createServer({
        name: 'Interactive Events API',
        version: '1.0.0'
    });
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    server.get('/', function(req, res, next) {
        res.send(listAllRoutes(server));
        return next();
    });

    server.get('/echo/:name', function(req, res, next) {
        res.send(req.params);
        return next();
    });

    server.listen(process.env.PORT || 8081, function() {
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
startServer();