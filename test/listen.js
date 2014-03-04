/*

listen.js - listen() test

The MIT License (MIT)

Copyright (c) 2013-2014 Tristan Slominski

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
    test.expect(6);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            var request = {
                request: {
                    findNode: fooBase64
                },
                sender: {
                    id: barBase64,
                    data: 'bar',
                    transport: {
                        host: '127.0.0.1',
                        port: 11111
                    }
                }
            };
            client.write(JSON.stringify(request) + '\r\n'); // FIND-NODE request
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('findNode', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.equal(sender.id, barBase64);
        test.equal(sender.transport.host, "127.0.0.1");
        test.equal(sender.transport.port, 11111);
        test.equal(sender.data, "bar");
        test.ok(callback instanceof Function);
        // call the callback for quick test termination
        callback();
        tcpTransport.close(function () {
            test.done();
        });
    });
};

test['listening transport emits `findNode` event when it receives a really large FIND-NODE request'] = function (test) {
    test.expect(6);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var tcpTransport = new TcpTransport();
    var data = "";
    for (var i = 0; i < 1e6; i++) {
        data += "abcdefghijklmnopqrstuvwxyz";
    }
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            var request = {
                request: {
                    findNode: fooBase64
                },
                sender: {
                    id: barBase64,
                    data: data,
                    transport: {
                        host: '127.0.0.1',
                        port: 11111
                    }
                }
            };
            client.write(JSON.stringify(request) + '\r\n'); // FIND-NODE request
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('findNode', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.equal(sender.id, barBase64);
        test.equal(sender.transport.host, "127.0.0.1");
        test.equal(sender.transport.port, 11111);
        test.equal(sender.data, data);
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
    var barBase64 = new Buffer("bar").toString("base64");
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            var request = {
                request: {
                    findNode: fooBase64
                },
                sender: {
                    id: barBase64,
                    data: 'bar',
                    transport: {
                        host: '127.0.0.1',
                        port: 11111
                    }
                }
            };
            client.write(JSON.stringify(request) + '\r\n'); // FIND-NODE request
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
    tcpTransport.on('findNode', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(null, {foo: "bar"});
    });
};

test['listening transport closes connection if `findNode` event callback has error set'] = function (test) {
    test.expect(3);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect({host: 'localhost', port: 6742}, function () {
            var request = {
                request: {
                    findNode: fooBase64
                },
                sender: barContact
            };
            client.write(JSON.stringify(request) + '\r\n'); // FIND-NODE request
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
    tcpTransport.on('findNode', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(new Error("oops"));
    });
};

test['listening transport emits `ping` event when it receives PING request'] = function (test) {
    test.expect(6);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 6742}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect(fooContact.transport, function () {
            var request = {
                request: {
                    ping: fooBase64
                },
                sender: barContact
            };
            client.write(JSON.stringify(request) + '\r\n'); // PING request
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('ping', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.equal(sender.id, barContact.id);
        test.equal(sender.transport.host, barContact.transport.host);
        test.equal(sender.transport.port, barContact.transport.port);
        test.equal(sender.data, barContact.data);
        test.ok(callback instanceof Function);
        // call the callback for quick test termination
        callback();
        tcpTransport.close(function () {
            test.done();
        });
    });
};


test['listening transport sends `ping` event callback as response'] = function (test) {
    test.expect(3);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 6742}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect(fooContact.transport, function () {
            var request = {
                request: {
                    ping: fooBase64
                },
                sender: barContact
            };
            client.write(JSON.stringify(request) + '\r\n'); // PING request
        });
        client.on('data', function (data) {
            data = JSON.parse(data);
            test.deepEqual(fooContact, data);
            tcpTransport.close(function () {
                test.done();
            });
        });
        client.on('error', function (error) {
            // catch test connection cut
        });
    });
    tcpTransport.on('ping', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(null, fooContact);
    });
};

test['listening transport closes connection if `ping` event callback has error set'] = function (test) {
    test.expect(3);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 6742}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var tcpTransport = new TcpTransport();
    tcpTransport.listen(function () {
        var client = net.connect(fooContact.transport, function () {
            var request = {
                request: {
                    ping: fooBase64
                },
                sender: barContact
            };
            client.write(JSON.stringify(request) + '\r\n'); // PING request
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
    tcpTransport.on('ping', function (nodeId, sender, callback) {
        test.equal(nodeId, fooBase64);
        test.ok(callback instanceof Function);
        callback(new Error("oops"));
    });
};
