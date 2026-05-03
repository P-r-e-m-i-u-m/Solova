const { paginate, paginateOffset, clampLimit, parseCursorFromRequest } = require("../paginate");

jest.mock("../../services/logger", () => ({ time: () => ({ end: jest.fn() }), info: jest.fn() }));

const makeModel = (items, total = items.length) => ({
  name: "TestModel",
  findMany: jest.fn().mockResolvedValue(items),
  count: jest.fn().mockResolvedValue(total)
});

describe("clampLimit", () => {
  test("clamps to max", () => { expect(clampLimit(9999)).toBe(100); });
  test("clamps to min", () => { expect(clampLimit(0)).toBe(1); });
  test("returns default for NaN", () => { expect(clampLimit("abc")).toBe(20); });
});

describe("paginate", () => {
  test("returns data and meta", async () => {
    const model = makeModel([{ id: 1 }, { id: 2 }]);
    const result = await paginate(model, { limit: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.meta.hasMore).toBe(false);
    expect(result.meta.nextCursor).toBeNull();
  });
  test("detects hasMore when extra item returned", async () => {
    const model = makeModel([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const result = await paginate(model, { limit: 2 });
    expect(result.meta.hasMore).toBe(true);
    expect(result.meta.nextCursor).toBe("2");
    expect(result.data).toHaveLength(2);
  });
});

describe("paginateOffset", () => {
  test("returns pagination meta", async () => {
    const model = makeModel([{ id: 1 }], 50);
    const result = await paginateOffset(model, { page: 2, limit: 10 });
    expect(result.meta.total).toBe(50);
    expect(result.meta.totalPages).toBe(5);
    expect(result.meta.hasPrev).toBe(true);
    expect(result.meta.hasNext).toBe(true);
  });
});
