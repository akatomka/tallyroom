import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), admin: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
import { GET } from "../app/api/export/route";

const staffId = "11111111-1111-4111-8111-111111111111";
const businessId = "22222222-2222-4222-8222-222222222222";
const request = (id = businessId) => new Request(`http://localhost/api/export?clientId=${id}`);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("EXPORT_STAFF_USER_IDS", staffId);
  mocks.getUser.mockResolvedValue({ data: { user: { id: staffId } }, error: null });
  mocks.admin.mockReturnValue({ from: mocks.from });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.order.mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("staff export access", () => {
  it("rejects unauthenticated requests before opening admin access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("rejects an invalid session even if a user object is present", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: staffId } }, error: { message: "Invalid token" } });
    expect((await GET(request())).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("rejects ordinary clients including self-declared staff metadata", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: {
      id: "client-user", user_metadata: { role: "staff" },
    } }, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("denies exports when the staff list is empty", async () => {
    vi.stubEnv("EXPORT_STAFF_USER_IDS", "");
    expect((await GET(request())).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("validates the business ID before opening admin access", async () => {
    expect((await GET(request("not-a-uuid"))).status).toBe(400);
    expect((await GET(new Request("http://localhost/api/export"))).status).toBe(400);
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("exports only the requested business for an approved staff user", async () => {
    vi.stubEnv("EXPORT_STAFF_USER_IDS", `another-id, ${staffId} `);
    mocks.order.mockResolvedValue({ data: [{
      name: 'Invoice "April", paid', doc_type: "invoice", status: "received", due_date: "2026-04-30",
    }, { name: "=1+1", doc_type: "receipt", status: "outstanding", due_date: "2026-05-01" }], error: null });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("client_id", businessId);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const csv = await response.text();
    expect(csv).toContain('"Invoice ""April"", paid"');
    expect(csv).toContain('"\'=1+1"');
  });

  it("does not expose database error details", async () => {
    mocks.order.mockResolvedValue({ data: null, error: { message: "Sensitive database detail" } });
    const response = await GET(request());
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("Sensitive");
  });

  it("returns a header-only CSV when the requested business has no documents", async () => {
    const response = await GET(request());
    expect(await response.text()).toBe("name,type,status,due_date");
  });
});
