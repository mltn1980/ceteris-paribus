import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getActiveSubscription, getUserSubscriptions, upsertSubscription } from "./db";
import { MP_PLANS } from "../shared/mp-config";
import { cancelPreapproval, createPreapproval } from "./mercadopago";

const YAHOO_RANGES = ["1mo", "6mo", "1y", "5y"] as const;
type YahooRange = typeof YAHOO_RANGES[number];

const YAHOO_INTERVAL: Record<YahooRange, string> = {
  "1mo": "1d",
  "6mo": "1d",
  "1y":  "1wk",
  "5y":  "1mo",
};

const marketCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function fetchYahoo(symbol: string, range: YahooRange) {
  const key = `${symbol}:${range}`;
  const cached = marketCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${YAHOO_INTERVAL[range]}&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo Finance: ${res.status} ${res.statusText}`);

  const json = await res.json() as any;
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo Finance: no data");

  const timestamps: number[] = result.timestamp ?? [];
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

  const points = timestamps
    .map((t: number, i: number) => ({ date: t * 1000, close: closes[i] }))
    .filter((p: { date: number; close: number }) => p.close != null);

  const data = {
    symbol,
    currency: result.meta?.currency ?? "USD",
    regularMarketPrice: result.meta?.regularMarketPrice as number,
    previousClose: result.meta?.previousClose as number,
    points,
  };

  marketCache.set(key, { data, ts: Date.now() });
  return data;
}

export const appRouter = router({
  system: systemRouter,

  market: router({
    history: publicProcedure
      .input(z.object({
        symbol: z.enum(["^VIX", "^MOVE", "^VXN", "^RVX"]),
        range:  z.enum(YAHOO_RANGES),
      }))
      .query(async ({ input }) => {
        return fetchYahoo(input.symbol, input.range);
      }),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  subscription: router({
    /** Get current user's active subscription */
    status: protectedProcedure.query(async ({ ctx }) => {
      const sub = await getActiveSubscription(ctx.user.id);
      if (!sub) {
        return { hasSubscription: false, plan: null, billingInterval: null, status: null } as const;
      }
      return {
        hasSubscription: true,
        plan: sub.plan,
        billingInterval: sub.billingInterval,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      } as const;
    }),

    /** Get all subscriptions for current user */
    history: protectedProcedure.query(async ({ ctx }) => {
      return getUserSubscriptions(ctx.user.id);
    }),

    /** Get plan configuration (public - for pricing page) */
    plans: publicProcedure.query(() => {
      return MP_PLANS;
    }),

    /**
     * Inicia el checkout de Mercado Pago: crea la suscripción pendiente y
     * devuelve la URL a la que redirigir al usuario para autorizar el débito.
     */
    checkout: protectedProcedure
      .input(z.object({
        plan: z.enum(["visual", "premium", "corporativo"]),
        interval: z.enum(["monthly", "annual"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.email) {
          return { url: null, error: "Tu cuenta no tiene email asociado; no se puede crear la suscripción." } as const;
        }

        // URL pública del sitio para el retorno post-pago
        const siteUrl = process.env.SITE_URL
          || `${ctx.req.protocol}://${ctx.req.get("host")}`;

        try {
          const result = await createPreapproval({
            userId: ctx.user.id,
            userEmail: ctx.user.email,
            plan: input.plan,
            interval: input.interval,
            siteUrl,
            planName: MP_PLANS[input.plan].name,
          });
          return { url: result.initPoint, error: null } as const;
        } catch (err) {
          console.error("[Subscription] Error creando checkout MP:", err);
          return { url: null, error: "No se pudo iniciar el pago con Mercado Pago. Intentá de nuevo." } as const;
        }
      }),

    /** Cancela la suscripción activa del usuario en Mercado Pago. */
    cancel: protectedProcedure.mutation(async ({ ctx }) => {
      const sub = await getActiveSubscription(ctx.user.id);
      if (!sub) {
        return { success: false, error: "No tenés una suscripción activa." } as const;
      }

      const ok = await cancelPreapproval(sub.paddleSubscriptionId);
      if (!ok) {
        return { success: false, error: "Mercado Pago no pudo cancelar la suscripción. Intentá más tarde." } as const;
      }

      await upsertSubscription({
        userId: sub.userId,
        paddleSubscriptionId: sub.paddleSubscriptionId,
        paddleCustomerId: sub.paddleCustomerId,
        plan: sub.plan,
        billingInterval: sub.billingInterval,
        status: "canceled",
        priceId: sub.priceId,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        canceledAt: new Date(),
      });

      return { success: true, error: null } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
