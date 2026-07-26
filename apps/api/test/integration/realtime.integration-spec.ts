import type { AddressInfo } from "node:net";

import type { INestApplication } from "@nestjs/common";
import { io, type Socket } from "socket.io-client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { AuthSessionService } from "../../src/auth/auth-session.service";
import { UserRole } from "../../src/auth/user-role.enum";
import { MasterOrderStatus } from "../../src/orders/order-status.enum";
import { orderRoom, platformAdminRoom, RealtimeService } from "../../src/realtime/realtime.service";
import { createOrder, createUser } from "./fixtures";
import { createIntegrationApp, truncateApplicationTables } from "./test-app";

interface SubscriptionAck {
  subscribed: boolean;
  room: string;
}

describe("Socket.IO realtime authorization and delivery", () => {
  let app: INestApplication;
  let baseUrl: string;
  let sessions: AuthSessionService;
  let realtime: RealtimeService;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    app = await createIntegrationApp({ listen: true });
    sessions = app.get(AuthSessionService);
    realtime = app.get(RealtimeService);
    const httpServer = app.getHttpServer() as {
      address: () => AddressInfo | string | null;
    };
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/realtime`;
  });

  beforeEach(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
    await truncateApplicationTables(app);
  });

  afterAll(async () => {
    for (const socket of sockets) {
      socket.disconnect();
    }
    await app.close();
  });

  it("allows a customer into their order room and delivers order updates", async () => {
    const customer = await createUser(app, { role: UserRole.CUSTOMER });
    const order = await createOrder(app, { customerId: customer.id });
    const token = (await sessions.issueSession(customer)).accessToken;
    const socket = await connectSocket(baseUrl, token);
    sockets.push(socket);

    await expect(subscribe(socket, orderRoom(order.id))).resolves.toEqual({
      subscribed: true,
      room: orderRoom(order.id),
    });

    const received = onceEvent<{
      masterOrderId: string;
      status: MasterOrderStatus;
    }>(socket, "order:status_update");
    realtime.emitOrderStatusUpdate({
      masterOrderId: order.id,
      customerId: customer.id,
      riderId: null,
      status: MasterOrderStatus.CONFIRMED,
      updatedAt: new Date(),
    });

    await expect(received).resolves.toMatchObject({
      masterOrderId: order.id,
      status: MasterOrderStatus.CONFIRMED,
    });
  });

  it("rejects customer access to the platform room", async () => {
    const customer = await createUser(app, { role: UserRole.CUSTOMER });
    const token = (await sessions.issueSession(customer)).accessToken;
    const socket = await connectSocket(baseUrl, token);
    sockets.push(socket);
    const roomError = onceEvent<{ room: string; message: string }>(socket, "room:error");

    await expect(subscribe(socket, platformAdminRoom())).resolves.toEqual({
      subscribed: false,
      room: platformAdminRoom(),
    });
    await expect(roomError).resolves.toEqual({
      room: platformAdminRoom(),
      message: "Forbidden",
    });
  });

  it("delivers platform notifications to authenticated super admins", async () => {
    const superAdmin = await createUser(app, { role: UserRole.SUPER_ADMIN });
    const token = (await sessions.issueSession(superAdmin)).accessToken;
    const socket = await connectSocket(baseUrl, token);
    sockets.push(socket);

    await subscribe(socket, platformAdminRoom());
    const received = onceEvent<{ type: string; title: string }>(socket, "notification:new");
    realtime.emitAdminNotification({
      type: "INTEGRATION_TEST",
      title: "Realtime works",
      body: "Delivered through the platform room",
    });

    await expect(received).resolves.toMatchObject({
      type: "INTEGRATION_TEST",
      title: "Realtime works",
    });
  });
});

function connectSocket(baseUrl: string, token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(baseUrl, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Timed out connecting to realtime namespace"));
    }, 5_000);

    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

function subscribe(socket: Socket, room: string): Promise<SubscriptionAck> {
  return new Promise((resolve) => {
    socket.emit("room:subscribe", { room }, resolve);
  });
}

function onceEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${event}`));
    }, 5_000);

    socket.once(event, (payload: T) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}
