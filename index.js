/*

index.js - discover-tcp-transport: TCP transport for Discover node discovery

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

var events = require('events'),
    net = require('net'),
    util = require('util');

var TcpTransport = module.exports = function TcpTransport (options) {

};

util.inherits(TcpTransport, events.EventEmitter);

TcpTransport.prototype.findNode = function findNode (contact, nodeId) {
    var self = this;
    var client = net.connect({host: contact.ip, port: contact.port}, function () {
        client.write(nodeId + '\r\n');
    });
    client.on('data', function (data) {
        try {
            data = JSON.parse(data.toString());
            return self.emit('node', null, contact, nodeId, data);
        } catch (exception) {
            console.dir(exception);
        }
    });  
    client.on('end', function () {
        self.emit('reached', contact);
    });
    client.on('error', function (error) {
        self.emit('node', new Error('unreachable'), contact, nodeId);
        self.emit('unreachable', contact);
        return;
    });
};

TcpTransport.prototype.ping = function ping (contact) {
    var self = this;
    var client = net.connect({host: contact.ip, port: contact.port}, function () {
        client.end();
    });
    client.on('end', function () {
        self.emit('reached', contact);
    });
    client.on('error', function () {
        self.emit('unreachable', contact);
    });
};