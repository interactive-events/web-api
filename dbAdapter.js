var db = require("./db");
/*
var dummyUser = { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' };
var dummyClient = { id: 1, secret: 'derp', publicSecret: true, trustedClient: true };
var dummyTokens =  {
	"a": {clientId: 1, userId: 1, scope:"*", expirationDate: "Wed Nov 12 2015 11:09:59 GMT+0100 (CET)"}
};
var dummyRefreshTokens =  {
	"b": {clientId: 1, userId: 1}
};
*/
var debug = false;

function findUserById(id, callback) {
    db.User.findById(id).exec(function(err, ret) {
        if(debug) console.log("findUserById", err, ret);
        callback(err, ret);
    });
}
function findByUsername(username, callback) {
    db.User.findOne({username: username}).exec(function(err, ret) {
        if(debug) console.log("findByUsername", err, ret);
        callback(err, ret);
    });
}
function findByToken(accessToken, callback) {
    db.Token.findOne({token: accessToken}).exec(function(err, ret) {
        if(debug) console.log("findByToken", err, ret);
        callback(err, ret);
    });
}

function findByClientId(clientId, callback) {
    db.Client.findById(clientId).exec(function(err, ret) {
        if(debug) console.log("findByClientId", err, ret);
        callback(err, ret);
    });
}

function saveToken(token, expirationDate, clientId, userId, scope, callback) {
    if(typeof scope === 'undefined'){
        scope = "*"; // TODO: change this when we use scope...?
    };
    db.Token.findOneAndUpdate({
        user: db.mongoose.Types.ObjectId(userId), 
        clientId: db.mongoose.Types.ObjectId(clientId)
    }, {
        token: token, 
        expirationDate: expirationDate,
        scope: scope
    }, {
        upsert: true // creates the object if it doesn't exist. defaults to false.
    }, function(err, accessToken) {
        if(debug) console.log("saveToken", err);
        callback(err);
    });
}

function saveRefreshToekn(refreshTokenHash, clientId, userId, callback) {
    db.RefreshToken.findOneAndUpdate({
        user: db.mongoose.Types.ObjectId(userId), 
        clientId: db.mongoose.Types.ObjectId(clientId)
    }, {
        token: refreshTokenHash
    }, {
        upsert: true // creates the object if it doesn't exist. defaults to false.
    }, function(err, accessToken) {
        if(debug) console.log("saveToken", err);
        callback(err);
    });
}

function findRefreshToken(refreshTokenHash, callback) {
    db.RefreshToken.findOne({token: refreshTokenHash}).exec(function(err, ret) {
        if(debug) console.log("findRefreshToken", err, ret);
        callback(err, ret);
    });
}
function removeToken(token) {
    db.Token.findOne({token: token}).remove().exec(function(err) {
        if(err) {
            if(debug) console.log("removeToken", err);
        }
    });
}

exports.findUserById = findUserById;
exports.findByUsername = findByUsername;
exports.findByToken = findByToken;
exports.findByClientId = findByClientId;
exports.saveToken = saveToken;
exports.saveRefreshToekn = saveRefreshToekn;
exports.removeToken = removeToken;

