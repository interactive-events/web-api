// TODO: connect this with an actual db... 

var dummyUser = { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' };
var dummyClient = { id: 1, secret: 'derp', publicSecret: true, trustedClient: true };
var dummyTokens =  {
	"a": {clientId: 1, userId: 1, scope:"*", expirationDate: "Wed Nov 12 2015 11:09:59 GMT+0100 (CET)"}
};
var dummyRefreshTokens =  {
	"b": {clientId: 1, userId: 1}
};

function findUserById(id, callback) {
    if(id == dummyUser.id) {
        return callback(null, dummyUser);
    }
    return callback(new Error('User ' + id + ' does not exist'), null);
}
function findByUsername(username, callback) {
    if(username == dummyUser.username) {
        return callback(null, dummyUser);
    }
    return callback(new Error('User ' + username + ' does not exist'), null);
}
function findByToken(token, callback) {
    return callback(null, dummyTokens[token]);
}

function findByClientId(clientId, callback) {
    if(clientId == dummyClient.id) {
        return callback(null, dummyClient);
    }
    return callback(new Error('Client ' + clientId + ' does not exist'), null);
}

function saveToken(token, expirationDate, clientId, userId, scope, callback) {
	dummyTokens[token] = {expirationDate: expirationDate, clientId: clientId, userId: userId, scope: scope};
	return callback(null);
}

function saveRefreshToekn(refreshTokenHash, clientId, userId, callback) {
	dummyTokens[refreshTokenHash] = {clientId: clientId, userId: userId};
	return callback(null);
}

function findRefreshToken(refreshTokenHash, callback) {
	return callback(dummyRefreshTokens[refreshTokenHash]);
}
function removeToken(token) {
	dummyTokens[token] = null;
}

exports.findUserById = findUserById;
exports.findByUsername = findByUsername;
exports.findByToken = findByToken;
exports.findByClientId = findByClientId;
exports.saveToken = saveToken;
exports.saveRefreshToekn = saveRefreshToekn;
exports.removeToken = removeToken;

