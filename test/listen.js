/*

listen.js - listen() test

The MIT License (MIT)

Copyright (c) 2013 Tristan Slominski

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/

"use strict";

var net = require('net'),
    TcpTransport = require('../index.js');

var test = module.exports = {};

test['listen() starts a TCP server on localhost:6742 by default'] = function (test) {
    test.expect(1);
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            test.ok(true); // assert connection
            tcpTransport.close(function () {
                test.done();
            });
        });
        client.on('error', function () {
            // catch test connection cut
        });
    });
};

test['listen() starts a TCP server on host:port from options'] = function (test) {
    test.expect(1);
    var tcpTransport = new TcpTransport({host: '127.0.0.1', port: 6744});
    tcpTransport.listen(function () {
        var client = net.connect({host: '127.0.0.1', port: 6744}, function () {
            test.ok(true); // assert connection
            tcpTransport.close(function () {
                test.done();
            });
        });
        client.on('error', function () {
            // catch test connection cut
        });
    });
};

test['listening transport emits `findNode` event when it receives FIND-NODE request'] = function (test) {
    test.expect(2);
    var fooBase64 = new Buffer("foo").toString("base64");
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            client.write(fooBase64 + '\r\n'); // FIND-NODE request
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('findNode', function (nodeId, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        // call the callback for quick test termination
        callback();
        tcpTransport.close(function () {
            test.done();
        });
    });
};

test['listening transport sends `findNode` event callback as response'] = function (test) {
    test.expect(3);
    var fooBase64 = new Buffer("foo").toString("base64");
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            client.write(fooBase64 + '\r\n'); // FIND-NODE request
        });
        client.on('data', function (data) {
            data = JSON.parse(data);
            test.deepEqual({foo: "bar"}, data);
            tcpTransport.close(function () {
                test.done();
            });
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('findNode', function (nodeId, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(null, {foo: "bar"});
    });
};

test['listening transport closes connection if `findNode` event callback has error set'] = function (test) {
    test.expect(3);
    var fooBase64 = new Buffer("foo").toString("base64");
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            client.write(fooBase64 + '\r\n'); // FIND-NODE request
        });
        client.on('data', function (data) {
            test.fail("Should not receive data");
        });
        client.on('end', function() {
            test.ok(true); // assert closed connection
            tcpTransport.close(function () {
                test.done();
            });            
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('findNode', function (nodeId, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(new Error("oops"));
    });
};