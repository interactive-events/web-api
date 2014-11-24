/**
 * Module dependencies.
 */
var passport = require('passport')
  //, LocalStrategy = require('passport-local').Strategy
  , BasicStrategy = require('passport-http').BasicStrategy
  , ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
  , BearerStrategy = require('passport-http-bearer').Strategy
  , db = require('./dbAdapter')
  , crypto = require('crypto');


/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
 /*
passport.use(new LocalStrategy(
  function(username, password, done) {
    db.findByUsername(username, function(err, user) {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (user.password != password) { return done(null, false); }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  db.findById(id, function (err, user) {
    done(err, user);
  });
});
*/

/**
 * BasicStrategy & ClientPasswordStrategy (FOR PROVIDING A OAUTH2 SERVER FOR OTHER APPS)
 *
 * These strategies are used to authenticate registered OAuth clients.  They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens.  The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate.  Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header).  While this approach is not recommended by
 * the specification, in practice it is quite common.
 */

passport.use("clientBasic", new ClientPasswordStrategy({
    usernameField: 'username',
    passwordField: 'password'
  },
  function(clientId, clientSecret, done) {
    return validateClient(clientId, clientSecret, done);
  }
));
passport.use("clientPassword", new ClientPasswordStrategy( // body[client_id], body[client_secret]
  function(clientId, clientSecret, done) {
    return validateClient(clientId, clientSecret, done);
  }
));
function validateClient(clientId, clientSecret, done) {
  return db.findByClientId(clientId, function(err, client) {
    if (err) { return done(err); }
    if (!client) { return done(null, false); }
    if (!client.isTrusted) { return done(null, false); }
    if (client.isPublic != true && client.secret != clientSecret) { return done(null, false); }
    return done(null, client);
  });
}

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate users based on an access token (aka a
 * bearer token).  The user must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 
passport.use("accessToken", new BearerStrategy(
  function(accessToken, done) {
    db.findByToken.find(accessToken, function(err, token) {
      if (err) { return done(err); }
      if (!token) { return done(null, false); }
      
      db.findUserById(token.userId, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        // to keep this example simple, restricted scopes are not implemented,
        // and this is just for illustrative purposes
        var info = { scope: '*' }
        done(null, user, info);
      });
    });
  }
));
*/
passport.use("accessToken", new BearerStrategy(
  function (accessToken, done) {
    var accessTokenHash = crypto.createHash('sha1').update(accessToken).digest('hex')
    db.findByToken(accessTokenHash, function (err, token) {
      if (err) return done(err)
      if (!token) return done(null, false);
      if (new Date() > token.expirationDate) {
        //db.removeToken(accessTokenHash, function (err) { done(err) }) // no need since it automaticly removes in db
        return done(new Error("expired"), false);
      } else {
        db.findUserById(token.user, function (err, user) {
        if (err) return done(err)
        if (!user) return done(null, false);
          // no use of scopes for now
          var info = { scope: '*' }
          done(null, user, info);
        })
      }
    })
  }
));
