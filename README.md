# discover-tcp-transport

_Stability: 1 - [Experimental](https://github.com/tristanls/stability-index#stability-1---experimental)_

TCP transport for [Discover](https://github.com/tristanls/node-discover), a distributed master-less node discovery mechanism that enables locating any entity (server, worker, drone, actor) based on node id.

## Installation

    npm install discover-tcp-transport

## Tests

    npm test

## Overview

Discover TCP transport implements the Discover transport protocol consisting of a stripped down version of the Kademlia DHT protocol, PING and FIND-NODE. The TCP transport reports a node as unreachable if a connection cannot be established with it. 

_NOTE: Unreachability of nodes depends on the transport. For example, other transports (like TLS transport) could use other criteria (like invalid certificate) for reporting unreachable nodes._

_**WARNING**: Using TCP transport is meant primarily for development in a development environment. TCP transport exists because it is a low hanging fruit. It is most likely that it should be replaced with DTLS transport in production (maybe TLS if DTLS is not viable). There may also be a use-case for using UDP transport if communicating nodes are on a VPN/VPC. Only if UDP on a VPN/VPC seems not viable, should TCP transport be considered._

## Usage

```javascript
var TcpTransport = require('discover-tcp-transport');

var tcpTransport = new TcpTransport();

tcpTransport.on('findNode', function (nodeId, callback) {
    // process request
    return callback(null /*error*/, closestNodes); // or nodeWithNodeId 
});

tcpTransport.on('node', function (error, contact, nodeId, response) {
    // ... process event 
});

tcpTransport.on('reached', function (contact) {
    // contact is reachable
});

tcpTransport.on('unreachable', function (contact) {
    // contact is unreachable 
});

tcpTransport.ping(contact);

tcpTransport.findNode(contact, 'some.node.id');
```

## Documentation

#### tcpTransport.findNode(contact, nodeId)

  * `contact`: _Object_ The node to contact with request to find `nodeId`
    * `id`: _String (base64)_ Base64 encoded contact node id
    * `ip`: _String_ IP address to connect to
    * `port`: _Integer_ port to connect to
  * `nodeId`: _String (base64)_ Base64 encoded string representation of the node id to find

Issues a FIND-NODE request to the `contact`. In other words, sends FIND-NODE request to the contact at `contact.ip` and `contact.port` using TCP. The transport will emit `node` event when a response is processed (or times out).

#### tcpTransport.ping(contact)

  * `contact`: _Object_ contact to ping
    * `id`: _String (base64)_ Base64 encoded contact node id
    * `ip`: _String_ IP address to connect to
    * `port`: _Integer_ port to connect to  

Issues a PING request to the `contact`. In other words, pings the contact at the `contact.ip` and `contact.port` using TCP. The transport will emit `unreachable` event if the contact is deemed to be unreachable, or `reached` event otherwise.

#### Event: `findNode`

  * `nodeId`: _String (base64)_ Base64 encoded string representation of the node id to find
  * `callback`: _Function_ The callback to call with the result of processing the FIND-NODE request

Emitted when another node issues a FIND-NODE request to this node.

```javascript
var tcpTransport = require('discover-tcp-transport');
tcpTransport.on('findNode', function (nodeId, callback) {
    // ... find closestNodes to the desired nodeId
    return callback(null, closestNodes);
});
```

In the above example `closestNodes` is an Array of contacts that are closest known to the desired `nodeId`.

If the node handling the request itself contains the `nodeId`, then it sends only itself back.

```javascript
var tcpTransport = require('discover-tcp-transport');
tcpTransport.on('findNode', function (nodeId, callback) {
    // ... this node knows the node with nodeId or is itself node with nodeId
    return callback(null, nodeWithNodeId); 
});
```

In the above example, `nodeWithNodeId` is not an array, but an individual `contact` representing the answer to `findNode` query.

#### Event: `node`

  * `error`: _Error_ An error, if one occurred
  * `contact`: _Object_ The node that FIND-NODE request was sent to
  * `nodeId`: _String_ The original node id requested to be found
  * `response`: _Object_ or _Array_ The response from the queried `contact`

If `error` occurs, the transport encountered an error when issuing the `findNode` request to the `contact`. 

`response` will be an Array if the `contact` does not contain the `nodeId` requested. In this case `response` will be a `contact` list of nodes closer to the `nodeId` that the queried node is aware of. The usual step is to next query the returned contacts with the FIND-NODE request.

`response` will be an Object if the `contact` contains the `nodeId`. In other words, the node has been found.

#### Event: `reached`

  * `contact`: _Object_ The contact that was reached when pinged.
    * `id`: _String (base64)_ Base64 encoded contact node id
    * `ip`: _String_ IP address of reached contact
    * `port`: _Integer_ port of reached contact

Emitted when a previously pinged `contact` is deemed reachable by the transport.

#### Event: `unreachable`

  * `contact`: _Object_ The contact that was unreachable when pinged.
    * `id`: _String (base64)_ Base64 encoded contact node id
    * `ip`: _String_ IP address of unreachable contact
    * `port`: _Integer_ port of unreachable contact

Emitted when a previously pinged `contact` is deemed unreachable by the transport.