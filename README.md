# discover-tcp-transport

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

[![NPM version](https://badge.fury.io/js/discover-tcp-transport.png)](http://npmjs.org/package/discover-tcp-transport)

TCP transport for [Discover](https://github.com/tristanls/discover), a distributed master-less node discovery mechanism that enables locating any entity (server, worker, drone, actor) based on node id.

## Contributors

[@tristanls](https://github.com/tristanls), [@mikedeboer](https://github.com/mikedeboer), [@skeggse](https://github.com/skeggse)

## Installation

    npm install discover-tcp-transport

## Tests

    npm test

## Overview

Discover TCP transport implements the Discover transport protocol consisting of a stripped down version of the Kademlia DHT protocol, PING and FIND-NODE. The TCP transport reports a node as unreachable if a connection cannot be established with it.

_NOTE: Unreachability of nodes depends on the transport. For example, other transports (like TLS transport) could use other criteria (like invalid certificate) for reporting unreachable nodes._

_**WARNING**: Using TCP transport is meant primarily for development in a development environment. TCP transport exists because it is a low hanging fruit. It is most likely that it should be replaced with DTLS transport in production (maybe TLS if DTLS is not viable). There may also be a use-case for using UDP transport if communicating nodes are on a VPN/VPC. Only if UDP on a VPN/VPC seems not viable, should TCP transport be considered._

## Documentation

### TcpTransport

**Public API**
  * [TcpTransport.listen(options, callback)](#tcptransportlistenoptions-callback)
  * [new TcpTransport(options)](#new-tcptransportoptions)
  * [tcpTransport.close(callback)](#tcptransportclosecallback)
  * [tcpTransport.findNode(contact, nodeId, sender)](#tcptransportfindnodecontact-nodeid-sender)
  * [tcpTransport.listen(callback)](#tcptransportlistencallback)
  * [tcpTransport.ping(contact, sender)](#tcptransportpingcontact-sender)
  * [tcpTransport.setTransportInfo(contact)](#tcptransportsettransportinfocontact)
  * [Event 'findNode'](#event-findnode)
  * [Event 'node'](#event-node)
  * [Event 'ping'](#event-ping)
  * [Event 'reached'](#event-reached)
  * [Event 'unreachable'](#event-unreachable)

#### TcpTransport.listen(options, callback)

  * `options`: See `new TcpTransport(options)` `options`.
  * `callback`: See `tcpTransport.listen(callback)` `callback`.
  * Return: _Object_ An instance of TcpTransport with server running.

Creates new TCP transport and starts the server.

#### new TcpTransport(options)

  * `options`:
    * `host`: _String_ _(Default: 'localhost')_
    * `port`: _Integer_ _(Default: 6742)_ A port value of zero will assign a random port.

Creates a new TCP transport.

#### tcpTransport.close(callback)

  * `callback`: _Function_ _(Default: undefined)_ Optional callback to call once the server is stopped.

Stops the server from listening to requests from other nodes.

#### tcpTransport.findNode(contact, nodeId, sender)

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

Issues a FIND-NODE request to the `contact`. In other words, sends FIND-NODE request to the contact at `contact.host` and `contact.port` using TCP. The transport will emit `node` event when a response is processed (or times out).

#### tcpTransport.listen(callback)

  * `callback`: _Function_ _(Default: undefined)_ Optional callback to call once the server is up.

Starts the server to listen to requests from other nodes.

#### tcpTransport.ping(contact, sender)

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

Issues a PING request to the `contact`. In other words, pings the contact at the `contact.transport.host` and `contact.transport.port` using TCP. The transport will emit `unreachable` event if the contact is deemed to be unreachable, or `reached` event otherwise.

#### tcpTransport.rpc(contact, payload, callback)

_**CAUTION: reserved for internal use**_

  * `contact`: _Object_ Contact to ping.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host to connect to.
      * `port`: _Integer_ Port to connect to.
  * `payload`: _String_ or _Object_ Payload to send on the wire. If an _Object_ is provided, it will be `JSON.stringify()`'ed.
  * `callback`: _Function_ Callback to call with an error or response.

An internal common implementation for `tcpTransport.findNode(...)` and `tcpTransport.ping(...)`.

#### tcpTransport.setTransportInfo(contact)

  * `contact`: _Object_ A contact.
  * Return: _Object_ `contact` with `contact.transport` populated.

Sets `contact.transport` to TCP transport configured values. For example:

```javascript
var contact = {id: 'id', data: 'data'};
var tcpTransport = new TcpTransport({host: 'foo.com', port: 8888});
contact = tcpTransport.setTransportInfo(contact);
assert.ok(contact.transport.host === 'foo.com'); // true
assert.ok(contact.transport.port === 8888); // true
```

#### Event: `findNode`

  * `nodeId`: _String (base64)_ Base64 encoded string representation of the node id to find.
  * `sender`: _Object_ The contact making the request.
    * `id`: _String (base64)_ Base64 encoded sender node id.
    * `data`: _Any_ Sender node data.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host of the sender.
      * `port`: _Integer_ Port of the sender.
  * `callback`: _Function_ The callback to call with the result of processing the FIND-NODE request.
    * `error`: _Error_ An error, if any.
    * `response`: _Object_ or _Array_ The response to FIND-NODE request.

Emitted when another node issues a FIND-NODE request to this node.

```javascript
var TcpTransport = require('discover-tcp-transport');
var tcpTransport = new TcpTransport();
tcpTransport.on('findNode', function (nodeId, sender, callback) {
    // ... find closestNodes to the desired nodeId
    return callback(null, closestNodes);
});
```

In the above example `closestNodes` is an Array of contacts that are closest known to the desired `nodeId`.

If the node handling the request itself contains the `nodeId`, then it sends only itself back.

```javascript
var TcpTransport = require('discover-tcp-transport');
var tcpTransport = new TcpTransport();
tcpTransport.on('findNode', function (nodeId, sender, callback) {
    // ... this node knows the node with nodeId or is itself node with nodeId
    return callback(null, nodeWithNodeId);
});
```

In the above example, `nodeWithNodeId` is not an array, but an individual `contact` representing the answer to `findNode` query.

#### Event: `node`

  * `error`: _Error_ An error, if one occurred.
  * `contact`: _Object_ The node that FIND-NODE request was sent to.
  * `nodeId`: _String (base64)_ The original base64 encoded node id requested to be found.
  * `response`: _Object_ or _Array_ The response from the queried `contact`.

If `error` occurs, the transport encountered an error when issuing the `findNode` request to the `contact`. `contact` and `nodeId` will also be provided in case of an error. `response` is undefined if an `error` occurs.

`response` will be an Array if the `contact` does not contain the `nodeId` requested. In this case `response` will be a `contact` list of nodes closer to the `nodeId` that the queried node is aware of. The usual step is to next query the returned contacts with the FIND-NODE request.

`response` will be an Object if the `contact` contains the `nodeId`. In other words, the node has been found.

#### Event: `ping`

  * `nodeId`: _String (base64)_ Base64 encoded string representation of the node id being pinged.
  * `sender`: _Object_ The contact making the request.
    * `id`: _String (base64)_ Base64 encoded sender node id.
    * `data`: _Any_ Sender node data.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host of the sender.
      * `port`: _Integer_ Port of the sender.
  * `callback`: _Function_ The callback to call with the result of processing the PING request.
    * `error`: _Error_ An error, if any.
    * `response`: _Object_ The response to PING request, if any.

Emitted when another node issues a PING request to this node.

```javascript
var TcpTransport = require('discover-tcp-transport');
var tcpTransport = new TcpTransport();
tcpTransport.on('ping', function (nodeId, sender, callback) {
    // ... verify that we have the exact node specified by nodeId
    return callback(null, contact);
});
```

In the above example `contact` is an Object representing the answer to `ping` query.

If the exact node specified by nodeId does not exist, an error shall be returned as shown below:

```javascript
var TcpTransport = require('discover-tcp-transport');
var tcpTransport = new TcpTransport();
tcpTransport.on('ping', function (nodeId, sender, callback) {
    // ...we don't have the nodeId specified
    return callback(true);
});
```

#### Event: `reached`

  * `contact`: _Object_ The contact that was reached when pinged.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `data`: _Any_ Data included with the contact.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host of reached contact.
      * `port`: _Integer_ port of reached contact.

Emitted when a previously pinged `contact` is deemed reachable by the transport.

#### Event: `unreachable`

  * `contact`: _Object_ The contact that was unreachable when pinged.
    * `id`: _String (base64)_ Base64 encoded contact node id.
    * `transport`: _Object_ TCP transport data.
      * `host`: _String_ Host of unreachable contact.
      * `port`: _Integer_ port of unreachable contact.

Emitted when a previously pinged `contact` is deemed unreachable by the transport.

## Wire Protocol

Wire protocol for TCP transport is simple one-line \r\n terminated ASCII.

### FIND-NODE

    {"request":{"findNode":"Zm9v"},"sender":{"id":"YmF6","data":"some data","transport":{"host":"127.0.0.1","port":6742}}}\r\n

FIND-NODE request consists of a JSON object with base64 encoded node id and a sender followed by \r\n as shown above.

#### Object Response

    {"id":"Zm9v","data":"some data","transport":{"host":"127.0.0.1","port":6742}}\r\n

An Object response is JSON representation of the contact followed by \r\n.

#### Array Response

    [{"id":"YmFy","data":"some data","transport":{"host":"192.168.0.1","port":6742}},{"id":"YmF6","data":"some data","transport":{"host":"192.168.0.2","port":6742}}]\r\n

An Array response is JSON representation of an array of closest contacts followed by \r\n.

### PING

    {"request":{"ping":"Zm9v"},"sender":{"id":"YmF6","data":"some data","transport":{"host":"127.0.0.1","port":6742}}}\r\n

PING request consists of a JSON object with base64 encoded node id and a sender followed by \r\n as shown above.

#### Object Response

    {"id":"Zm9v","data":"some data","transport":{"host":"127.0.0.1","port":6742}}\r\n

An Object response is JSON representation of the pinged contact followed by \r\n.

#### Failure Responses

Closing the connection without an object response or inability to connect in the first place indicates a PING failure.
