import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { InjectRepository } from "@nestjs/typeorm";
import type { Server, Socket } from "socket.io";
import { Repository } from "typeorm";

import { AuthSessionService } from "../auth/auth-session.service";
import type { AuthenticatedUser } from "../auth/authenticated-user";
import { ACCESS_TOKEN_COOKIE } from "../auth/auth.constants";
import { readCookie } from "../auth/cookies";
import { Customer } from "../auth/customer.entity";
import { isPlatformAdminRole, UserRole } from "../auth/user-role.enum";
import { MasterOrder } from "../orders/master-order.entity";
import { MasterOrderStatus } from "../orders/order-status.enum";
import { SubOrder } from "../orders/sub-order.entity";
import {
  orderRoom,
  outletRoom,
  platformAdminRoom,
  RealtimeService,
  riderRoom,
} from "./realtime.service";

interface SubscribeInput {
  room: string;
}

interface RealtimeSocketData {
  user?: AuthenticatedUser;
}

type AuthenticatedSocket = Socket & { data: RealtimeSocketData };

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  namespace: "/realtime",
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly sessions: AuthSessionService,
    private readonly realtime: RealtimeService,
    @InjectRepository(Customer) private readonly users: Repository<Customer>,
    @InjectRepository(MasterOrder) private readonly masterOrders: Repository<MasterOrder>,
    @InjectRepository(SubOrder) private readonly subOrders: Repository<SubOrder>,
  ) {}

  afterInit(server: Server): void {
    this.realtime.bindServer(server);
    server.use((client, next) => {
      void this.authenticateClient(client as AuthenticatedSocket)
        .then(() => next())
        .catch((error: unknown) => {
          this.logger.warn(
            `Rejected WebSocket connection: ${error instanceof Error ? error.message : "unknown"}`,
          );
          next(new Error("Authentication failed"));
        });
    });
  }

  handleConnection(): void {
    // Authentication is completed by namespace middleware before the connection event.
  }

  private async authenticateClient(client: AuthenticatedSocket): Promise<void> {
    const token = this.extractToken(client);

    if (!token) {
      return;
    }

    socketData(client).user = await this.sessions.authenticateAccessToken(token);
  }

  @SubscribeMessage("room:subscribe")
  async subscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() input: SubscribeInput,
  ) {
    const user = socketData(client).user;

    if (!user) {
      client.emit("room:error", { room: input.room, message: "Authentication required" });
      return { subscribed: false, room: input.room };
    }

    const canJoin = await this.canJoinRoom(user, input.room);

    if (!canJoin) {
      client.emit("room:error", { room: input.room, message: "Forbidden" });
      return { subscribed: false, room: input.room };
    }

    await client.join(input.room);
    client.emit("room:subscribed", { room: input.room });

    return { subscribed: true, room: input.room };
  }

  @SubscribeMessage("room:unsubscribe")
  async unsubscribe(@ConnectedSocket() client: Socket, @MessageBody() input: SubscribeInput) {
    await client.leave(input.room);
    client.emit("room:unsubscribed", { room: input.room });

    return { unsubscribed: true, room: input.room };
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown>;
    const authToken = auth.token;

    if (typeof authToken === "string" && authToken.trim()) {
      return authToken.trim().replace(/^Bearer\s+/i, "");
    }

    const header = client.handshake.headers.authorization;

    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice("Bearer ".length);
    }

    return readCookie(client.handshake.headers.cookie, ACCESS_TOKEN_COOKIE) ?? null;
  }

  private async canJoinRoom(user: AuthenticatedUser, room: string): Promise<boolean> {
    const [kind, id] = room.split(":");

    if (room === platformAdminRoom()) {
      return isPlatformAdminRole(user.role);
    }

    if (!kind || !id) {
      return false;
    }

    if (kind === "order") {
      return this.canJoinOrderRoom(user, id, room);
    }

    if (kind === "outlet") {
      return this.canJoinOutletRoom(user, id, room);
    }

    if (kind === "rider") {
      return await this.canJoinRiderRoom(user, id, room);
    }

    return false;
  }

  private async canJoinOrderRoom(
    user: AuthenticatedUser,
    masterOrderId: string,
    room: string,
  ): Promise<boolean> {
    if (room !== orderRoom(masterOrderId)) {
      return false;
    }

    const order = await this.masterOrders.findOneBy({ id: masterOrderId });

    if (!order) {
      return false;
    }

    if (isPlatformAdminRole(user.role) || order.customerId === user.id) {
      return true;
    }

    if (user.role === UserRole.RIDER) {
      return order.riderId === null || order.riderId === user.id;
    }

    if (user.role === UserRole.ADMIN) {
      const outletId = await this.getAdminOutletId(user.id);

      return outletId
        ? Boolean(await this.subOrders.findOneBy({ masterOrderId, outletId }))
        : false;
    }

    return false;
  }

  private async canJoinOutletRoom(
    user: AuthenticatedUser,
    outletId: string,
    room: string,
  ): Promise<boolean> {
    if (room !== outletRoom(outletId)) {
      return false;
    }

    if (isPlatformAdminRole(user.role)) {
      return true;
    }

    return user.role === UserRole.ADMIN && (await this.getAdminOutletId(user.id)) === outletId;
  }

  private async canJoinRiderRoom(
    user: AuthenticatedUser,
    riderId: string,
    room: string,
  ): Promise<boolean> {
    if (room !== riderRoom(riderId)) {
      return false;
    }

    if (isPlatformAdminRole(user.role) || user.id === riderId) {
      return true;
    }

    if (user.role === UserRole.ADMIN) {
      const outletId = await this.getAdminOutletId(user.id);
      if (!outletId) {
        return false;
      }

      // Check 1: Rider is linked directly to this admin's outlet
      const rider = await this.users.findOne({
        where: { id: riderId, role: UserRole.RIDER },
        select: { id: true, outletId: true },
      });
      if (rider?.outletId === outletId) {
        return true;
      }

      // Check 2: Rider is currently assigned to an active order containing a sub-order from this admin's outlet
      const activeOrder = await this.masterOrders
        .createQueryBuilder("mo")
        .innerJoin("sub_orders", "so", "so.master_order_id = mo.id")
        .where("mo.rider_id = :riderId", { riderId })
        .andWhere("mo.status NOT IN (:...completedStatuses)", {
          completedStatuses: [MasterOrderStatus.DELIVERED, MasterOrderStatus.CANCELLED],
        })
        .andWhere("so.outlet_id = :outletId", { outletId })
        .select("mo.id")
        .getOne();

      return !!activeOrder;
    }

    return false;
  }

  private async getAdminOutletId(userId: string): Promise<string | null> {
    const admin = await this.users.findOne({
      where: { id: userId, role: UserRole.ADMIN },
      select: { id: true, outletId: true },
    });

    return admin?.outletId ?? null;
  }
}

function socketData(client: Socket): RealtimeSocketData {
  return client.data as RealtimeSocketData;
}
