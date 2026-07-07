import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import {
  users, creditPackages, creditOrders, creditLedger, listings
} from '../../db/schema';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { eq, desc, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Billing Routes — Prefix: /api/v1/billing
 *
 * Security contract (matches moyasar-credit-wallet-security-spec.md):
 * - Secret key never leaves server
 * - Credit amounts always looked up server-side from DB (never from client)
 * - Confirmation always re-fetches payment from Moyasar before crediting
 * - Wallet credit is idempotent — double-call never double-credits
 * - Wallet debit is atomic via UPDATE … WHERE credits_balance >= amount
 */
export default async function billingRoutes(app: FastifyInstance) {

  // ──────────────────────────────────────────────────────────
  // GET /billing/packages  — List active packages (public-ish)
  // ──────────────────────────────────────────────────────────
  app.get('/packages', async (_req, reply) => {
    try {
      const packages = await db.select().from(creditPackages)
        .where(eq(creditPackages.isActive, true))
        .orderBy(creditPackages.sortOrder);
      return reply.send({ success: true, data: packages });
    } catch (err: any) {
      app.log.error(err, 'billing packages list error');
      return reply.code(500).send({ success: false, message: 'Failed to load packages' });
    }
  });

  // ──────────────────────────────────────────────────────────
  // GET /billing/balance  — Broker's current credit balance
  // ──────────────────────────────────────────────────────────
  app.get('/balance', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const userId = (req as any).user?.userId;
    if (!userId) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    try {
      const [user] = await db.select({ creditsBalance: users.creditsBalance })
        .from(users).where(eq(users.id, userId)).limit(1);

      if (!user) return reply.code(404).send({ success: false, message: 'User not found' });
      return reply.send({ success: true, data: { balance: user.creditsBalance ?? 0 } });
    } catch (err: any) {
      app.log.error(err, 'billing balance error');
      return reply.code(500).send({ success: false, message: 'Failed to fetch balance' });
    }
  });

  // ──────────────────────────────────────────────────────────
  // GET /billing/orders  — Broker's own order history
  // ──────────────────────────────────────────────────────────
  app.get('/orders', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const userId = (req as any).user?.userId;
    if (!userId) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    try {
      const orders = await db
        .select({
          id: creditOrders.id,
          status: creditOrders.status,
          creditsAmount: creditOrders.creditsAmount,
          priceSar: creditOrders.priceSar,
          moyasarPaymentId: creditOrders.moyasarPaymentId,
          creditedAt: creditOrders.creditedAt,
          createdAt: creditOrders.createdAt,
          packageKey: creditPackages.key,
          packageNameEn: creditPackages.nameEn,
          packageNameAr: creditPackages.nameAr,
        })
        .from(creditOrders)
        .innerJoin(creditPackages, eq(creditOrders.packageId, creditPackages.id))
        .where(eq(creditOrders.brokerId, userId))
        .orderBy(desc(creditOrders.createdAt))
        .limit(50);

      return reply.send({ success: true, data: orders });
    } catch (err: any) {
      app.log.error(err, 'billing orders error');
      return reply.code(500).send({ success: false, message: 'Failed to fetch orders' });
    }
  });

  // ──────────────────────────────────────────────────────────
  // GET /billing/ledger  — Broker's credit spend/earn ledger
  // ──────────────────────────────────────────────────────────
  app.get('/ledger', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const userId = (req as any).user?.userId;
    if (!userId) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    const query = req.query as { page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(50, parseInt(query.limit ?? '25', 10));
    const offset = (page - 1) * limit;

    try {
      const entries = await db
        .select({
          id: creditLedger.id,
          type: creditLedger.type,
          amount: creditLedger.amount,
          balanceAfter: creditLedger.balanceAfter,
          description: creditLedger.description,
          refOrderId: creditLedger.refOrderId,
          refListingId: creditLedger.refListingId,
          createdAt: creditLedger.createdAt,
        })
        .from(creditLedger)
        .where(eq(creditLedger.brokerId, userId))
        .orderBy(desc(creditLedger.createdAt))
        .limit(limit)
        .offset(offset);

      return reply.send({ success: true, data: entries });
    } catch (err: any) {
      app.log.error(err, 'billing ledger error');
      return reply.code(500).send({ success: false, message: 'Failed to fetch ledger' });
    }
  });

  // ──────────────────────────────────────────────────────────
  // POST /billing/checkout  — Initiate Moyasar payment
  // Client sends ONLY the package key. Server looks up price.
  // ──────────────────────────────────────────────────────────
  app.post('/checkout', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const userId = (req as any).user?.userId;
    if (!userId) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    const secretKey = process.env.MOYASAR_SECRET_KEY;
    const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY;

    if (!secretKey || !publishableKey) {
      return reply.code(503).send({
        success: false,
        message: 'Payment gateway not configured. Contact support.',
      });
    }

    const { packageKey } = req.body as { packageKey?: string };
    if (!packageKey) {
      return reply.code(400).send({ success: false, message: 'packageKey is required' });
    }

    try {
      // 1. Look up package server-side (never trust client price)
      const [pkg] = await db.select().from(creditPackages)
        .where(and(eq(creditPackages.key, packageKey), eq(creditPackages.isActive, true)))
        .limit(1);

      if (!pkg) {
        return reply.code(404).send({ success: false, message: 'Package not found or inactive' });
      }

      // 2. Create our idempotency reference
      const reference = `tamleeq-${userId.slice(0, 8)}-${Date.now()}`;

      // 3. Create pending order in DB
      const [order] = await db.insert(creditOrders).values({
        brokerId: userId,
        packageId: pkg.id,
        creditsAmount: pkg.credits,       // snapshot — immutable
        priceSar: pkg.priceSar,           // snapshot — immutable
        moyasarReference: reference,
        status: 'PENDING',
        metadata: {},
      }).returning();

      return reply.send({
        success: true,
        data: {
          orderId: order.id,
          publishableKey,                    // safe to send — it's the public key
          amount: pkg.priceSar,
          credits: pkg.credits,
          packageName: pkg.nameEn,
          reference,
        },
      });
    } catch (err: any) {
      app.log.error(err, 'billing checkout error');
      return reply.code(500).send({ success: false, message: 'Checkout failed' });
    }
  });

  // ──────────────────────────────────────────────────────────
  // POST /billing/confirm  — Client-triggered confirmation
  // Treats client signal as a *hint only* — always re-fetches
  // from Moyasar independently before crediting wallet.
  // ──────────────────────────────────────────────────────────
  app.post('/confirm', { preHandler: [authenticateJWT] }, async (req, reply) => {
    const userId = (req as any).user?.userId;
    if (!userId) return reply.code(401).send({ success: false, message: 'Unauthorized' });

    const { paymentId, orderId } = req.body as { paymentId?: string; orderId?: string };
    if (!paymentId) {
      return reply.code(400).send({ success: false, message: 'paymentId is required' });
    }

    // 1. Associate paymentId with the order if orderId is provided
    if (orderId) {
      await db.update(creditOrders)
        .set({ moyasarPaymentId: paymentId, updatedAt: new Date() })
        .where(and(eq(creditOrders.id, orderId), eq(creditOrders.brokerId, userId)));
    }

    const result = await verifyAndCredit(app, paymentId, 'client-confirm');
    if (result.alreadyProcessed) {
      return reply.send({ success: true, message: 'Already processed', data: result });
    }
    if (!result.success) {
      return reply.code(402).send({ success: false, message: result.message });
    }
    return reply.send({ success: true, data: result });
  });

  // ──────────────────────────────────────────────────────────
  // POST /billing/webhook  — Moyasar server-to-server webhook
  // Verify HMAC signature FIRST, then re-fetch payment.
  // No auth middleware — Moyasar calls this directly.
  // ──────────────────────────────────────────────────────────
  app.post('/webhook', async (req, reply) => {
    const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      app.log.warn('MOYASAR_WEBHOOK_SECRET not set — rejecting webhook');
      return reply.code(500).send({ success: false, message: 'Webhook not configured' });
    }

    // 1. Verify HMAC-SHA256 signature (Moyasar signs the raw body)
    const signature = req.headers['x-moyasar-signature'] as string;
    if (!signature) {
      return reply.code(401).send({ success: false, message: 'Missing signature' });
    }

    const rawBody = JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      app.log.warn({ signature }, 'Webhook signature mismatch — rejecting');
      return reply.code(401).send({ success: false, message: 'Invalid signature' });
    }

    // 2. Parse event — we care about payment_paid primarily
    const event = req.body as any;
    const eventType: string = event?.type ?? '';
    const paymentId: string = event?.data?.id ?? '';
    const metadata = event?.data?.metadata ?? {};
    const orderId = metadata.orderId;

    if (orderId && paymentId) {
      // Associate order with payment ID
      await db.update(creditOrders)
        .set({ moyasarPaymentId: paymentId, updatedAt: new Date() })
        .where(eq(creditOrders.id, orderId));
    }

    app.log.info({ eventType, paymentId, orderId }, 'Moyasar webhook received');

    if (!paymentId) {
      return reply.code(400).send({ success: false, message: 'No payment ID in webhook payload' });
    }

    // 3. Always re-fetch from Moyasar (even though we already verified the signature)
    //    Signature proves it came from Moyasar; re-fetch proves the status is current.
    await verifyAndCredit(app, paymentId, 'webhook');

    // Always return 200 to Moyasar — they retry on non-2xx
    return reply.code(200).send({ received: true });
  });
}

// ──────────────────────────────────────────────────────────
// Shared verify-and-credit function (idempotent)
// Called by BOTH /confirm and /webhook so the guard exists once.
// ──────────────────────────────────────────────────────────
async function verifyAndCredit(
  app: FastifyInstance,
  paymentId: string,
  source: 'client-confirm' | 'webhook'
): Promise<{ success: boolean; alreadyProcessed?: boolean; message?: string; newBalance?: number }> {
  const secretKey = process.env.MOYASAR_SECRET_KEY;
  if (!secretKey) return { success: false, message: 'Payment gateway not configured' };

  try {
    // 1. Find our order by Moyasar payment ID
    const [order] = await db.select().from(creditOrders)
      .where(eq(creditOrders.moyasarPaymentId, paymentId))
      .limit(1);

    if (!order) {
      app.log.warn({ paymentId, source }, 'verifyAndCredit: order not found');
      return { success: false, message: 'Order not found' };
    }

    // 2. Idempotency guard — only process PENDING orders
    if (order.status !== 'PENDING') {
      app.log.info({ paymentId, status: order.status, source }, 'verifyAndCredit: already processed');
      return { success: true, alreadyProcessed: true, message: `Already ${order.status}` };
    }

    // 3. Fetch authoritative payment from Moyasar (server-to-server)
    const fetchRes = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      },
    });
    const payment = await fetchRes.json() as any;

    if (!fetchRes.ok) {
      app.log.error({ payment, source }, 'verifyAndCredit: Moyasar fetch failed');
      return { success: false, message: 'Could not verify payment with gateway' };
    }

    // 4. Verify status, amount, and currency against our DB record — never trust client claims
    const amountInSar = Math.round(payment.amount / 100); // Convert halalas → SAR
    if (
      payment.status !== 'paid' ||
      amountInSar !== order.priceSar ||
      payment.currency !== 'SAR'
    ) {
      app.log.warn({ paymentStatus: payment.status, paymentAmount: payment.amount, orderPriceSar: order.priceSar, source }, 'verifyAndCredit: validation failed');
      await db.update(creditOrders)
        .set({ status: 'FAILED', metadata: payment, updatedAt: new Date() })
        .where(eq(creditOrders.id, order.id));
      return { success: false, message: 'Payment validation failed' };
    }

    // 5. All checks passed — credit wallet atomically
    const now = new Date();

    const [updatedUser] = await db
      .update(users)
      .set({
        creditsBalance: sql`${users.creditsBalance} + ${order.creditsAmount}`,
        updatedAt: now,
      })
      .where(eq(users.id, order.brokerId))
      .returning({ creditsBalance: users.creditsBalance });

    if (!updatedUser) {
      app.log.error({ brokerId: order.brokerId, source }, 'verifyAndCredit: user update failed');
      return { success: false, message: 'Failed to update wallet' };
    }

    // 6. Mark order as PAID
    await db.update(creditOrders)
      .set({ status: 'PAID', creditedAt: now, metadata: payment, updatedAt: now })
      .where(eq(creditOrders.id, order.id));

    // 7. Write ledger entry
    await db.insert(creditLedger).values({
      brokerId: order.brokerId,
      type: 'CREDIT_PURCHASE',
      amount: order.creditsAmount,
      balanceAfter: updatedUser.creditsBalance ?? 0,
      refOrderId: order.id,
      description: `Credit purchase — ${order.creditsAmount} credits (${order.priceSar} SAR) via Moyasar`,
      performedById: order.brokerId,
    });

    app.log.info({ paymentId, brokerId: order.brokerId, credits: order.creditsAmount, source }, 'Credits successfully added to wallet');
    return { success: true, newBalance: updatedUser.creditsBalance ?? 0 };

  } catch (err: any) {
    app.log.error(err, `verifyAndCredit error [${source}]`);
    return { success: false, message: 'Internal error during payment confirmation' };
  }
}
