import type { Order, PrismaClient } from '../../generated/prisma';
import type { AuthenticatedUser } from '../../auth/authProvider';
import { toOrderDto, type OrderDto, type OrderScope } from '../dto/orderDto';

type ReadResult<T> = { ok: true; value: T } | { ok: false; reason: 'forbidden' | 'not-found' };

export interface OrderReads {
  listOrders(user: AuthenticatedUser, scope: OrderScope): Promise<ReadResult<OrderDto[]>>;
  getOrder(user: AuthenticatedUser, id: string): Promise<ReadResult<OrderDto>>;
}

// Authorization lives here as well as at the route boundary so future
// transports cannot bypass role/ownership restrictions.
export function createOrderService(db: PrismaClient): OrderReads {
  const isAdmin = (user: AuthenticatedUser) => user.roles.includes('ADMINISTRATOR');
  const isStudent = (user: AuthenticatedUser) => user.roles.includes('USER');

  return {
    async listOrders(user, scope) {
      if (scope === 'all' ? !isAdmin(user) : !isStudent(user)) {
        return { ok: false, reason: 'forbidden' };
      }
      let orders;
      if (scope === 'open') {
        // Use database time rather than the browser or API host clock.
        orders = await db.$queryRaw<Order[]>`
          SELECT * FROM "Order"
          WHERE "status" = 'UNASSIGNED' AND "expiryTime" > statement_timestamp()
            AND "requesterId" <> ${user.id}
          ORDER BY "createdAt" DESC, "id" ASC
        `;
      } else {
        orders = await db.order.findMany({
          where: scope === 'requested' ? { requesterId: user.id }
            : scope === 'assigned' ? { courierId: user.id } : {},
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        });
      }
      return { ok: true, value: orders.map(toOrderDto) };
    },

    async getOrder(user, id) {
      if (!isStudent(user) && !isAdmin(user)) return { ok: false, reason: 'forbidden' };
      const [order] = await db.$queryRaw<(Order & { available: boolean })[]>`
        SELECT *, ("status" = 'UNASSIGNED' AND "expiryTime" > statement_timestamp()) AS "available"
        FROM "Order" WHERE "id" = ${id}::uuid
      `;
      if (!order) return { ok: false, reason: 'not-found' };
      const participant = order.requesterId === user.id || order.courierId === user.id;
      if (!participant && !isAdmin(user)) {
        if (!order.available) return { ok: false, reason: 'forbidden' };
      }
      return { ok: true, value: toOrderDto(order) };
    },
  };
}
