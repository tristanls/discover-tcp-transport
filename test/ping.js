/*

ping.js - ping() test

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

test['ping() connects to contact.transport.host:contact.transport.port'] = function (test) {
    test.expect(2);
    var server = net.createServer(function (connection) {
        test.equal(connection.localAddress, '127.0.0.1');
        test.equal(connection.localPort, 11234);
        connection.end();
        server.close(function () {
            test.done();
        });
    });
    server.listen(11234, function () {
        var tcpTransport = new TcpTransport();
        tcpTransport.ping({transport: {host: '127.0.0.1', port: 11234}}, {});
    });
};

test['ping() sends newline terminated base64 encoded ping request with originator contact info'] = function (test) {
    test.expect(6);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 11234}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var server = net.createServer(function (connection) {
        test.ok(true); // assert that connection happened
        connection.on('data', function (data) {
            // only expecting one chunk
            var data = JSON.parse(data.toString("utf8"));
            test.equal(data.request.ping, fooBase64);
            test.equal(data.sender.id, barContact.id);
            test.equal(data.sender.transport.host, barContact.transport.host);
            test.equal(data.sender.transport.port, barContact.transport.port);
            test.equal(data.sender.data, barContact.data);
            connection.end();
            server.close(function () {
                test.done();
            });
        });
    });
    server.listen(11234, function () {
        var tcpTransport = new TcpTransport();
        tcpTransport.ping(fooContact, barContact);
    });
};  

test['ping() causes `reached` event to be emitted on successful ping'] = function (test) {
    test.expect(5);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 11234}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11111}, id: barBase64, data: "bar"};
    var server = net.createServer(function (connection) {
        test.ok(true); // assert that connection happened
        // assume correct request with data and such
        connection.end(JSON.stringify(fooContact) + '\r\n');
    });
    server.listen(11234, function () {
        var tcpTransport = new TcpTransport();
        tcpTransport.on('reached', function (contact) {
            test.equal(contact.id, fooBase64);
            test.equal(contact.transport.host, fooContact.transport.host);
            test.equal(contact.transport.port, fooContact.transport.port);
            test.equal(contact.data, fooContact.data);
            server.close(function () {
                test.done();
            });
        });
        tcpTransport.ping(fooContact, barContact);
    });
};

test['ping() causes `unreachable` event to be emitted on failed connection'] = function (test) {
    test.expect(4);
    var fooBase64 = new Buffer("foo").toString("base64");
    var barBase64 = new Buffer("bar").toString("base64");
    var fooContact = {transport: {host: '127.0.0.1', port: 11999}, id: fooBase64, data: "foo"};
    var barContact = {transport: {host: '127.0.0.1', port: 11000}, id: barBase64, data: "bar"};
    var tcpTransport = new TcpTransport();
    tcpTransport.on('unreachable', function (contact) {
        test.equal(contact.id, fooBase64);
        test.equal(contact.transport.host, fooContact.transport.host);
        test.equal(contact.transport.port, fooContact.transport.port);
        test.equal(contact.data, fooContact.data);
        test.done();
    });
    tcpTransport.ping(fooContact, barContact);
};