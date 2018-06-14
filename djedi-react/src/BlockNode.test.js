import React from "react";
import renderer from "react-test-renderer";

import { BlockNode } from ".";

test("it works", () => {
  const component = renderer.create(<BlockNode />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
