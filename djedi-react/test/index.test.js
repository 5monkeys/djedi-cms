import { ForceNodes, Node, NodeContext, djedi, md } from "../src";

test("exports", () => {
  expect(djedi).toBeDefined();
  expect(typeof djedi).toBe("object");
  expect(typeof Node).toBe("function");
  expect(typeof NodeContext.Provider).toBe("object");
  expect(typeof NodeContext.Consumer).toBe("object");
  expect(typeof ForceNodes).toBe("function");
  expect(typeof md).toBe("function");
});
