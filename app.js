var restify = require('restify');

var server = restify.createServer({
    name: 'myapp',
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

server.listen(80, function() {
    console.log('%s listening at %s', server.name, server.url);
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