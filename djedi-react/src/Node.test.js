import React from "react";
import renderer from "react-test-renderer";

import { Node } from ".";

test("it works", () => {
  const component = renderer.create(<Node />);
  const tree = component.toJSON();
  expect(tree).toMatchSnapshot();
});
