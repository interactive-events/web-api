/*global describe,it,before*/
'use strict';

var assert = require('assert');
var restify = require('restify');

// init the test client
var client = restify.createJsonClient({
	url: 'http://127.0.0.1:8081',
	version: '*'
});

// Container for all tests
describe('API tests', function() {
	before(function(done) {
		require('../app').startServer(8081);
		done();
	});

	// Container for GET tests 
	describe('GET: /echo/test', function() {
		// Test #1
		describe('200 response check', function() {
			it('should get a 200 response', function(done) {
				client.get('/echo/test', function(err, req, res, data) {
					assert.ifError(err);
					if (res.statusCode !== 200) {
						throw new Error('invalid response from /echo/test');
					}
					done();
				});
			});
		});

		// Test #2
		describe('response fields', function() {
			it('should get contain name field with a value of test', function(done) {
				client.get('/echo/test', function(err, req, res, data) {
					if (data.name !== "test") {
						throw new Error('invalid response, expected test as name parameter in response');
					}
					done();
				});
			});
		});
	});
});