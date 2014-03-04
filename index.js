/*

index.js - discover-tcp-transport: TCP transport for Discover node discovery

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

var events = require('events'),
    net = require('net'),
    util = require('util');

var TcpTransport = module.exports = function TcpTransport (options) {
    var self = this;
    events.EventEmitter.call(self);

    options = options || {};

    self.id = options.id;
    self.host = options.host || 'localhost';
    self.port = options.port || 6742;

    self.server = null;
};

util.inherits(TcpTransport, events.EventEmitter);

/*
  * `options`: See `new TcpTransport(options)` `options`.
  * `callback`: See `tcpTransport.listen(callback)` `callback`.
  Return: _Object_ An instance of TcpTransport with server running.
*/
TcpTransport.listen = function listen (options, callback) {
    var tcpTransport = new TcpTransport(options);
    tcpTransport.listen(callback);
    return tcpTransport;
};

/*
  * `callback`: _Function_ _(Default: undefined)_ Optional callback to call once
      the server is stopped.
*/
TcpTransport.prototype.close = function close (callback) {
    var self = this;
    if (self.server)
        self.server.close(callback);
};

/*
  * `contact`: _Object_ The node to contact with request to find `nodeId`.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ IP address to connect to.
      * `port`: _Integer_ Port to connect to.
  * `nodeId`: _String (base64)_ Base64 encoded string representation of the node id to find.
  * `sender`: _Object_ The node making the request
    * `id`: _String (base64)_ Base64 encoded sender node id.
    * `data`: _Any_ Sender node data.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
*/
TcpTransport.prototype.findNode = function findNode (contact, nodeId, sender) {
    var self = this;
    self.rpc(contact, {
        request: {
            findNode: nodeId
        },
        sender: sender
    }, function(error, data) {
        if (error) {
            self.emit('node', new Error('unreachable'), contact, nodeId);
            self.emit('unreachable', contact);
            return;
        }
        if (!data)
            return self.emit('node', new Error('no data received'), contact, nodeId);

        try {
            data = JSON.parse(data.toString());
            return self.emit('node', null, contact, nodeId, data);
        } catch (exception) {
            self.emit('node',
                new Error('JSON parse error: ' + exception.message + ' when parsing ' + data),
                contact, nodeId);
        }
    });
};

/*
  * `callback`: _Function_ _(Default: undefined)_ Optional callback to call once
      the server is up.
*/
TcpTransport.prototype.listen = function listen (callback) {
    var self = this;
    self.server = net.createServer(function (connection) {
        var responseCallback = function (response) {
            connection.write(JSON.stringify(response) + '\r\n');
            connection.end();
        };
        var data = "";
        connection.on('data', function (chunk) {
            data += chunk.toString("utf8");
            if (!~data.indexOf('\r\n')) {
                return; // wait for more data
            }

            try {
                data = JSON.parse(data.toString("utf8"));
            } catch (exception) {
                return connection.end(); // kill connection
            }
            if (data.request && data.request.findNode) {
                self.emit('findNode', data.request.findNode, data.sender, function (error, response) {
                    if (error)
                        return connection.end();
                    if (responseCallback)
                        responseCallback(response);
                });
            } else if (data.request && data.request.ping) {
                self.emit('ping', data.request.ping, data.sender, function (error, response) {
                    if (error)
                        return connection.end();
                    if (responseCallback)
                        responseCallback(response);
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

/*
  * `contact`: _Object_ Contact to ping.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `sender`: _Object_ The contact making the request.
    * `id`: _String (base64)_ Base64 encoded sender node id.
    * `data`: _Any_ Sender node data.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host of the sender.
      * `port`: _Integer_ Port of the sender.
*/
TcpTransport.prototype.ping = function ping (contact, sender) {
    var self = this;
    self.rpc(contact, {
        request: {
            ping: contact.id
        },
        sender: sender
    }, function(error, data) {
        if (error || !data)
            return self.emit('unreachable', contact);

        try {
            data = JSON.parse(data);
            if (data.id === undefined || data.transport === undefined
                || data.transport.host === undefined
                || data.transport.port === undefined) { // data.data is optional
                return self.emit('unreachable', contact);
            }
            return self.emit('reached', contact);
        } catch (exception) {
            // console.dir(exception);
            return self.emit('unreachable', contact);
        }
    });
};

/*
  * `contact`: _Object_ Contact to ping.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `payload`: _String_ or _Object_ Payload to send on the wire. If an _Object_
      is provided, it will be `JSON.stringify()`'ed.
  * `callback`: _Function_ Callback to call with an error or response.
*/
TcpTransport.prototype.rpc = function rpc (contact, payload, callback) {
    var self = this;
    var client = net.connect(
        {
            host: contact.transport.host,
            port: contact.transport.port
        },
        function () {
            if (typeof payload != "string")
                payload = JSON.stringify(payload);
            client.write(payload + '\r\n');
        });

    var hasError = false;
    var data = "";
    client.on('data', function (buf) {
        data += buf.toString("utf8");
    });
    client.on('end', function () {
        if (!hasError)
            callback(null, data);
    });
    client.on('error', function (error) {
        hasError = true;
        callback(error);
    });
};

/*
  * `contact`: _Object_ A contact.
  * Return: _Object_ `contact` with `contact.transport` populated.
*/
TcpTransport.prototype.setTransportInfo = function setTransportInfo(contact) {
    var self = this;

    contact.transport = {
        host: self.host,
        port: self.port
    };
    return contact;
};
