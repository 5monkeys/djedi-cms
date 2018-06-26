import React from "react";
import renderer from "react-test-renderer";

import { Node } from "../src";

import { fetch, resetAll, wait } from "./helpers";

jest.useFakeTimers();

beforeEach(resetAll);

test("it renders loading and then the node", async () => {
  fetch({ "i18n://en-us@test.txt": "returned text" });
  const component = renderer.create(<Node uri="test" />);
  expect(component.toJSON()).toMatchSnapshot("loading");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(window.DJEDI_NODES).toMatchSnapshot("window.DJEDI_NODES");
});
