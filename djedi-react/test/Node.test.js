import React from "react";
import renderer from "react-test-renderer";

import { Node, djedi } from "../src";

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

test("it renders synchronously if the node is already in cache", async () => {
  fetch({ "i18n://en-us@home/intro.txt": "Welcome to our amazing website!" });
  const nodes = await djedi.loadByPrefix(["home/"]);
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(nodes).toMatchSnapshot("loadByPrefix result");
  const component = renderer.create(
    <Node uri="home/intro">Hello, World!</Node>
  );
  expect(component.toJSON()).toMatchSnapshot("with value");
});
