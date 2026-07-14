import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiMessage } from "../common/http/api-message.decorator";

@ApiTags("Realtime")
@Controller({ path: "realtime", version: "1" })
export class RealtimeController {
  @Get("contract")
  @ApiMessage("Realtime contract retrieved")
  @ApiOperation({
    summary: "Get Socket.io realtime contract",
    description:
      "Documents the Socket.io namespace, authentication, room subscriptions, emitted events, and broadcast cadence used by frontend clients.",
  })
  contract() {
    return {
      namespace: "/realtime",
      transport: "Socket.io v4",
      auth: {
        description:
          "Public outlet status broadcasts are available on connection. Protected room subscriptions require the API access token as socket auth.token, an Authorization: Bearer header, or the HttpOnly accessToken cookie during the Socket.io handshake.",
        examples: {
          authPayload: { auth: { token: "ACCESS_TOKEN" } },
          header: { extraHeaders: { Authorization: "Bearer ACCESS_TOKEN" } },
          cookie: { withCredentials: true },
        },
      },
      subscribe: {
        event: "room:subscribe",
        payload: { room: "order:{masterOrderId}" },
        successEvent: "room:subscribed",
        errorEvent: "room:error",
      },
      unsubscribe: {
        event: "room:unsubscribe",
        payload: { room: "order:{masterOrderId}" },
        successEvent: "room:unsubscribed",
      },
      rooms: [
        {
          pattern: "order:{masterOrderId}",
          audience:
            "Order customer, assigned rider, outlet admin for one of the order suborders, or super admin.",
        },
        {
          pattern: "outlet:{outletId}",
          audience: "Matching outlet admin or super admin.",
        },
        {
          pattern: "platform:admin",
          audience: "Super admin only.",
        },
        {
          pattern: "rider:{riderId}",
          audience: "The rider themself or super admin.",
        },
      ],
      events: [
        {
          name: "order:status_update",
          rooms: ["order:{masterOrderId}", "rider:{riderId}"],
          cadence: "Emitted immediately when an order status changes or a delivery is completed.",
          payload: {
            masterOrderId: "uuid",
            customerId: "uuid",
            riderId: "uuid|null",
            status:
              "PENDING|CONFIRMED|PREPARING|PARTIALLY_READY|PARTIALLY_FULFILLED|READY|OUT_FOR_DELIVERY|DELIVERED|CANCELLED",
            updatedAt: "ISO-8601 timestamp",
          },
        },
        {
          name: "suborder:new",
          rooms: ["outlet:{outletId}", "platform:admin"],
          cadence: "Emitted once for each suborder created during checkout/payment initiation.",
          payload: "SubOrder entity payload.",
        },
        {
          name: "rider:location_update",
          rooms: ["order:{masterOrderId}", "rider:{riderId}", "platform:admin"],
          cadence:
            "Emitted immediately when POST /api/v1/riders/locations succeeds. The rider client controls frequency; use every 10 seconds during active delivery.",
          payload: {
            riderId: "uuid",
            masterOrderId: "uuid|null",
            latitude: 6.4474,
            longitude: 3.4542,
            recordedAt: "ISO-8601 timestamp",
          },
        },
        {
          name: "outlet:status_update",
          rooms: ["all connected authenticated clients"],
          cadence: "Emitted immediately when a super admin makes an outlet online or offline.",
          payload: {
            outletId: "uuid",
            isOnline: false,
            updatedAt: "ISO-8601 timestamp",
          },
        },
      ],
      clientExample:
        "const socket = io('https://api-dev.rscdev.tech/realtime', { auth: { token }, withCredentials: true }); socket.emit('room:subscribe', { room: `order:${masterOrderId}` }); socket.on('outlet:status_update', handler);",
    };
  }
}
