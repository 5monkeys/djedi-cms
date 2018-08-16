import { Node, djedi, md } from "../src";

test("exports", () => {
  expect(djedi).toBeDefined();
  expect(typeof djedi).toBe("object");
  expect(typeof Node).toBe("function");
  expect(typeof md).toBe("function");
});
