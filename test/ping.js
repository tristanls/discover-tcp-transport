/*

ping.js - ping() test

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

test['ping() connects to contact.ip:contact.port'] = function (test) {
    test.expect(1);
    var server = net.createServer(function (connection) {
        test.equal(connection.remoteAddress, connection.localAddress);
        connection.end();
        server.close(function () {
            test.done();
        });
    });
    server.listen(11234, function () {
        var tcpTransport = new TcpTransport();
        tcpTransport.ping({ip: '127.0.0.1', port: 11234});
    });
};

test['ping() causes `reached` event to be emitted on successful connection'] = function (test) {
    test.expect(3);
    var testContact = {ip: '127.0.0.1', port: 11234};
    var server = net.createServer(function (connection) {
        test.ok(true); // assert that connection happened
        connection.end();
    });
    server.listen(11234, function () {
        var tcpTransport = new TcpTransport();
        tcpTransport.on('reached', function (contact) {
            test.equal(contact.ip, testContact.ip);
            test.equal(contact.port, testContact.port);
            server.close(function () {
                test.done();
            });
        });
        tcpTransport.ping(testContact);
    });
};

test['ping() causes `unreachable` event to be emitted on failed connection'] = function (test) {
    test.expect(2);
    var testContact = {ip: '127.0.0.1', port: 11000};
    var tcpTransport = new TcpTransport();
    tcpTransport.on('unreachable', function (contact) {
        test.equal(contact.ip, testContact.ip);
        test.equal(contact.port, testContact.port);
        test.done();
    });
    tcpTransport.ping(testContact);
};