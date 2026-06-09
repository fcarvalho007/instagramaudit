/**
 * Endpoint coverage for DELETE /api/admin/leads-bulk.
 *
 * Validates the two modes (archive / purge), the paid-lead guard and
 * the auth.users cleanup path. All external dependencies (Supabase
 * Admin client + admin session) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const requireAdminSession = vi.fn();

  type State = {
    leadRows: Array<{ id: string; email_normalized: string }>;
    paidRows: Array<{ lead_id: string }>;
    archivedCount: number;
    deleteCounts: Record<string, number>;
    authUsers: Array<{ id: string; email: string }>;
    authDeleted: string[];
    inserts: Array<{ table: string; rows: unknown }>;
    updates: Array<{ table: string; patch: unknown }>;
  };
  const state: State = {
    leadRows: [],
    paidRows: [],
    archivedCount: 0,
    deleteCounts: {},
    authUsers: [],
    authDeleted: [],
    inserts: [],
    updates: [],
  };

  function tableBuilder(table: string) {
    const builder: any = {
      _filters: {} as Record<string, unknown>,
      select: () => builder,
      eq: (col: string, val: unknown) => {
        builder._filters[col] = val;
        return builder;
      },
      in: (col: string, vals: unknown[]) => {
        builder._filters[col] = vals;
        return builder;
      },
      is: () => builder,
      limit: () => builder,
      then: undefined,
      update: (patch: unknown, _opts?: unknown) => {
        state.updates.push({ table, patch });
        if (table === "leads") {
          return {
            in: () => ({
              is: () =>
                Promise.resolve({
                  error: null,
                  count: state.archivedCount,
                }),
            }),
          };
        }
        return {
          in: () => Promise.resolve({ error: null, count: 0 }),
        };
      },
      delete: (_opts?: unknown) => {
        return {
          in: () => {
            const c = state.deleteCounts[table] ?? 0;
            return Promise.resolve({ error: null, count: c });
          },
        };
      },
      insert: (rows: unknown) => {
        state.inserts.push({ table, rows });
        return Promise.resolve({ error: null });
      },
    };
    // Promise-shaped lookups (.select().in().eq()…).
    builder.select = (_cols?: string) => {
      const lookup: any = {
        in: (_col: string, _vals: unknown[]) => {
          if (table === "leads") {
            return Promise.resolve({ data: state.leadRows, error: null });
          }
          if (table === "lead_payments") {
            return {
              eq: () => ({
                limit: () =>
                  Promise.resolve({ data: state.paidRows, error: null }),
              }),
            };
          }
          return Promise.resolve({ data: [], error: null });
        },
      };
      return lookup;
    };
    return builder;
  }

  const supabaseAdmin = {
    from: (table: string) => tableBuilder(table),
    auth: {
      admin: {
        listUsers: vi.fn(async () => ({
          data: { users: state.authUsers },
          error: null,
        })),
        deleteUser: vi.fn(async (id: string) => {
          state.authDeleted.push(id);
          return { error: null };
        }),
      },
    },
  };

  return { requireAdminSession, supabaseAdmin, state };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));
vi.mock("@/lib/admin/session", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));

import { Route } from "@/routes/api/admin/leads-bulk";

function makeRequest(body: unknown): Request {
  return new Request("https://test/api/admin/leads-bulk", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getHandler() {
  const handlers = (Route.options as any).server.handlers;
  return handlers.DELETE as (ctx: { request: Request }) => Promise<Response>;
}

describe("DELETE /api/admin/leads-bulk", () => {
  beforeEach(() => {
    mocks.requireAdminSession.mockReset();
    mocks.requireAdminSession.mockResolvedValue({
      id: "admin-1",
      email: "admin@test",
    });
    mocks.state.leadRows = [];
    mocks.state.paidRows = [];
    mocks.state.archivedCount = 0;
    mocks.state.deleteCounts = {};
    mocks.state.authUsers = [];
    mocks.state.authDeleted = [];
    mocks.state.inserts = [];
    mocks.state.updates = [];
  });

  it("rejects when admin session is missing", async () => {
    mocks.requireAdminSession.mockRejectedValueOnce(
      new Response("nope", { status: 401 }),
    );
    const res = await getHandler()({
      request: makeRequest({ ids: ["11111111-1111-1111-1111-111111111111"] }),
    });
    expect(res.status).toBe(401);
  });

  it("archive mode marks leads as archived, never touches auth", async () => {
    mocks.state.archivedCount = 2;
    const res = await getHandler()({
      request: makeRequest({
        ids: [
          "11111111-1111-1111-1111-111111111111",
          "22222222-2222-2222-2222-222222222222",
        ],
        mode: "archive",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      mode: "archive",
      archived: 2,
    });
    expect(
      mocks.state.updates.find((u) => u.table === "leads"),
    ).toBeTruthy();
    expect(
      mocks.supabaseAdmin.auth.admin.deleteUser as unknown as ReturnType<
        typeof vi.fn
      >,
    ).not.toHaveBeenCalled();
    expect(mocks.state.authDeleted).toEqual([]);
    expect(
      mocks.state.inserts.find(
        (i) =>
          i.table === "product_events" &&
          Array.isArray(i.rows) &&
          (i.rows as Array<{ event_type: string }>)[0]?.event_type ===
            "leads_bulk_archived",
      ),
    ).toBeTruthy();
  });

  it("purge blocks when any lead has paid payments unless force_paid", async () => {
    mocks.state.leadRows = [
      { id: "11111111-1111-1111-1111-111111111111", email_normalized: "a@x.pt" },
    ];
    mocks.state.paidRows = [{ lead_id: "11111111-1111-1111-1111-111111111111" }];
    const res = await getHandler()({
      request: makeRequest({
        ids: ["11111111-1111-1111-1111-111111111111"],
        mode: "purge",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error_code).toBe("PAID_LEAD_BLOCKED");
    expect(mocks.state.authDeleted).toEqual([]);
  });

  it("purge deletes deps + auth user and reports counts", async () => {
    mocks.state.leadRows = [
      { id: "11111111-1111-1111-1111-111111111111", email_normalized: "ghost@x.pt" },
    ];
    mocks.state.deleteCounts = { leads: 1, lead_payments: 0, report_requests: 1 };
    mocks.state.authUsers = [
      { id: "auth-1", email: "ghost@x.pt" },
      { id: "auth-2", email: "other@x.pt" },
    ];
    const res = await getHandler()({
      request: makeRequest({
        ids: ["11111111-1111-1111-1111-111111111111"],
        mode: "purge",
      }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.mode).toBe("purge");
    expect(body.deleted).toBe(1);
    expect(body.details.auth_users).toBe(1);
    expect(mocks.state.authDeleted).toEqual(["auth-1"]);
    expect(body.auth_errors).toEqual([]);
  });
});