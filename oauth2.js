var oauth2orize = require('oauth2orize')
    , passport = require('passport')
    , db = require('./dbAdapter')
    , crypto = require('crypto')
    , utils = require("./utils")
    , bcrypt = require('bcrypt');

// create OAuth 2.0 server
var server = oauth2orize.createServer();

// Resource owner password
server.exchange(oauth2orize.exchange.password(function (client, username, password, scope, done) {
  db.findByUsername(username, function (err, user) {
        if (err) return done(err);
        if (!user) return done(null, false);
        bcrypt.compare(password, user.password, function (err, res) {
            if(err) return done(err);
            if(res !== true) return done(null, false);
            //if (password != user.password) return done(null, false);
            var token = utils.uid(256);
            var refreshToken = utils.uid(256);
            var tokenHash = crypto.createHash('sha1').update(token).digest('hex');
            var refreshTokenHash = crypto.createHash('sha1').update(refreshToken).digest('hex');
            
            var expirationDate = new Date(new Date().getTime() + (3600 * 1000));
            
            db.saveToken(tokenHash, expirationDate, client._id, user._id, scope, function (err) {
                if (err) return done(err);
                db.saveRefreshToekn(refreshTokenHash, client._id, user._id, function (err) {
                    if (err) return done(err);
                    done(null, token, refreshToken, {expires_in: expirationDate.getTime(), user_id: user._id});
                });
            });
        });
    });
}));

// Refresh Token
server.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
    console.log("If yo see this: TELL ME OMG!");
    var refreshTokenHash = crypto.createHash('sha1').update(refreshToken).digest('hex');

    db.findRefreshToken(refreshTokenHash, function (err, token) {
        if (err) return done(err);
        if (!token) return done(null, false);
        if (client.clientId !== token.clientId) return done(null, false);
        
        var newAccessToken = utils.uid(256);
        var accessTokenHash = crypto.createHash('sha1').update(newAccessToken).digest('hex');
        
        var expirationDate = new Date(new Date().getTime() + (3600 * 1));
    
        db.saveToken(token, expirationDate, clientId, userId, scope, function (err) {
            if (err) return done(err);
            done(null, newAccessToken, refreshToken, {expiresIn: expirationDate});
        });
    });
}));

// token endpoint
exports.token = [
    passport.authenticate(['clientBasic', 'clientPassword'], { session: false }),
    server.token(),
    server.errorHandler()
];
