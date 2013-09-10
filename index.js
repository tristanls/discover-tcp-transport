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
    var self = this;
    options = options || {};

    self.id = options.id;
    self.host = options.host || 'localhost';
    self.port = options.port || 6742;

    self.server = null;
};

util.inherits(TcpTransport, events.EventEmitter);

TcpTransport.listen = function listen (options, callback) {
    var tcpTransport = new TcpTransport(options);
    tcpTransport.listen(callback);
    return tcpTransport;
};

// callback: Function *optional* callback to call once server is stopped
TcpTransport.prototype.close = function close (callback) {
    var self = this;
    if (self.server) self.server.close(callback);
};

// contact: Object *required* the contact to connect to
//   id: String (base64) *required* Base64 encoded contact node id
//   host: String *required* Host to connect to
//   port: Integer *required* port to connect to
// nodeId: String (base64) *required* Base64 encoded string representation of 
//   the node id to find
// sender: Object *required* the contact sending the request
//   id: String (base64) *required* Base64 encoded contact node id
//   data: Any Sender contact data
//   host: String *required* Host of the sender
//   port: Integer *required* Port of the sender
TcpTransport.prototype.findNode = function findNode (contact, nodeId, sender) {
    var self = this;
    var client = net.connect({host: contact.host, port: contact.port}, function () {
        var request = {request: {findNode: nodeId}, sender: sender};
        client.write(JSON.stringify(request) + '\r\n');
    });
    var receivedData = false;
    client.on('data', function (data) {
        receivedData = true;
        try {
            data = JSON.parse(data.toString());
            return self.emit('node', null, contact, nodeId, data);
        } catch (exception) {
            console.dir(exception);
        }
    });  
    client.on('end', function () {
        if (!receivedData) self.emit('node', new Error('error'), contact, nodeId);
        self.emit('reached', contact);
    });
    client.on('error', function (error) {
        self.emit('node', new Error('unreachable'), contact, nodeId);
        self.emit('unreachable', contact);
        return;
    });
};

// callback: Function *optional* callback to call once server is running
TcpTransport.prototype.listen = function listen (callback) {
    var self = this;
    self.server = net.createServer(function (connection) {
        var responseCallback = function (response) {
            connection.write(JSON.stringify(response) + '\r\n');
            connection.end();
        };
        connection.on('data', function (data) {
            try {
                data = JSON.parse(data.toString("utf8"));
            } catch (exception) {
                return connection.end(); // kill connection
            }
            if (data.request && data.request.findNode) {
                self.emit('findNode', data.request.findNode, data.sender, function (error, response) {
                    if (error) return connection.end();
                    if (responseCallback) responseCallback(response);
                });
            } else {
                return connection.end(); // kill connection
            }
        });
        connection.on('end', function () {
            responseCallback = undefined;
        });
        connection.on('error', function (error) {
            responseCallback = undefined;
        });
    });
    self.server.listen(self.port, self.host, callback);
};

// contact: Object *required* the contact to connect to
//   id: String (base64) *required* Base64 encoded contact node id
//   host: String *required* IP address to connect to
//   port: Integer *required* port to connect to
TcpTransport.prototype.ping = function ping (contact) {
    var self = this;
    var client = net.connect({host: contact.host, port: contact.port}, function () {
        client.end();
    });
    client.on('end', function () {
        self.emit('reached', contact);
    });
    client.on('error', function (error) {
        self.emit('unreachable', contact);
    });
};