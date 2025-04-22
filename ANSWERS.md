# Questions & Answers


## 1. What kind of authentication for the users you will consider if this was a real work task?

The primary problem authentication solves in our application would be client-side persistence. Since users are being connected only as an instance, disconnections cause them to lose not only their message history (which is only stored on the client side), but also their unique clientId and the rooms they have subscribed to.
As an additional benefit, we ensure that all users are the original client, preventing impersonation or session hijacking across reconnects.

I will opt for a JWT authentication method, as it allows for authentication to occur during the WebSocket connection, while keeping most of the functionality intact. On the client side, we would store the JWT token in localStorage, and reuse it on every reconnect by passing it as a query parameter during WebSocket connection. The server would then verify the token and restore the user's identity and state (such as clientId and subscribed rooms). This allows the client to automatically resume their session after a disconnection, without being required to log in again.

The authentication method itself could use a simple username/password authentication, stored in a relational database, done over HTTP.

## 2. What kind of persistence for the service you will consider if this was a real work task?

As mentioned in Question 1, `messages` are currently only stored on the client side.

Implementing data persistence in our application will allow us to extend the functionality to show historic data to newly subscribed users, or, paired with authentication, show existing users historic chats, from when they were disconnected.

Additionally, currently the only source of truth for which users belong to which rooms are the fields in the `connectionHandler` object. Any failure, or otherwise reboot of the system would automatically wipe away any state.

To implement a persistence layer I would connect a separate handler service for communication as a client to the websocket connection, to listen to messages and write them to the database. Assuming we imlemented authentication, I would create a many to many reltionship with rooms, and messages with two foreign keys - `userId` and `roomName`/`roomId`.

## 3. What strategy for scale-out you will consider if this was a real work task?

The most obvious way of scaling any aplication is vertically, where more compute and memory are supplied to the server. However, this approach tends to grow exponentially expensive, and a server can only grow for so long.

A better approach would be to scale horizonally, where we create more instances of the app, usually with docker containers, and have requests come to a loadbalancer, such as NGINX or Traefik which then disperse them to the different instances at random. With this approach we have the added benefit of fault tolerance in case one of the containers fails.

The caveat in our case is that the connection handling states will remain across all devices. One possible alternative is to reimplement the connectionHandler class as a group of functions interracting with a Redis in-memory cache. This will allow all containers to use the same memory and state.
