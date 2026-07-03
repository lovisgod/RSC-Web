# Realtime Socket.io Contract

The backend exposes realtime updates through Socket.io v4 at the `/realtime`
namespace. Swagger cannot describe WebSocket traffic directly, so the API also
exposes a discovery endpoint:

- `GET /api/v1/realtime/contract`

That endpoint is public and returns the same room, event, and cadence contract
documented here.

## Connection

Connect to the API host with the `/realtime` namespace:

```ts
import { io } from "socket.io-client";

const socket = io("https://api-dev.rscdev.tech/realtime", {
  auth: { token: accessToken },
});
```

The token can also be sent as `Authorization: Bearer <token>` during the
Socket.io handshake. Connections without a valid API access token are rejected.

## Subscribing

Clients subscribe to rooms after connecting:

```ts
socket.emit("room:subscribe", { room: `order:${masterOrderId}` });

socket.on("room:subscribed", ({ room }) => {
  console.log("subscribed", room);
});

socket.on("room:error", ({ room, message }) => {
  console.error("subscription failed", room, message);
});
```

Unsubscribe with:

```ts
socket.emit("room:unsubscribe", { room: `order:${masterOrderId}` });
```

## Rooms

| Room pattern            | Who can join                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `order:{masterOrderId}` | Order customer, assigned rider, outlet admin for one of the order suborders, or super admin |
| `outlet:{outletId}`     | Matching outlet admin or super admin                                                        |
| `platform:admin`        | Super admin only                                                                            |
| `rider:{riderId}`       | The rider themself or super admin                                                           |

## Events

### `order:status_update`

Broadcast rooms:

- `order:{masterOrderId}`
- `rider:{riderId}`, when the order has an assigned rider

Cadence: emitted immediately when an order status changes or a delivery is
completed.

Payload:

```json
{
  "masterOrderId": "uuid",
  "customerId": "uuid",
  "riderId": "uuid|null",
  "status": "OUT_FOR_DELIVERY",
  "updatedAt": "2026-07-03T10:00:00.000Z"
}
```

### `suborder:new`

Broadcast rooms:

- `outlet:{outletId}`
- `platform:admin`

Cadence: emitted once for each suborder created during checkout/payment
initiation.

Payload: the created suborder payload.

### `rider:location_update`

Broadcast rooms:

- `order:{masterOrderId}`, when `masterOrderId` is included
- `rider:{riderId}`
- `platform:admin`

Cadence: emitted immediately when `POST /api/v1/riders/locations` succeeds.
There is no server timer. The rider app controls how often it posts locations;
use every 10 seconds while the rider is actively delivering.

Payload:

```json
{
  "riderId": "uuid",
  "masterOrderId": "uuid|null",
  "latitude": 6.4474,
  "longitude": 3.4542,
  "recordedAt": "2026-07-03T10:00:00.000Z"
}
```

## Customer Tracking Flow

For FE-Story-04, the customer tracking page should:

1. Connect to `/realtime` using the logged-in customer's access token.
2. Subscribe to `order:{masterOrderId}`.
3. Listen for `order:status_update` to move the status timeline.
4. Listen for `rider:location_update` to move the rider marker on the map.

The backend emits updates as soon as the relevant HTTP write succeeds, so the
frontend does not need polling for status or rider location updates.
