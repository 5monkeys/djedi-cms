import React from "react";
import renderer from "react-test-renderer";

import { Node, djedi } from "../src";

import { fetch, resetAll, wait } from "./helpers";

jest.useFakeTimers();

console.warn = jest.fn();
console.error = jest.fn();

beforeEach(() => {
  resetAll();
  console.warn.mockClear();
  console.error.mockClear();
});

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

  // Imagine the above being done on the server (server-side rendering). Now,
  // simulate sending everything down to the browser. This means the `djedi`
  // instance in the browser has an empty cache, but we can send down `nodes` to
  // the browser and let the frontend add those before rendering.
  resetAll();
  djedi.addNodes(nodes);
  const component2 = renderer.create(
    <Node uri="home/intro">Hello, World!</Node>
  );
  expect(component2.toJSON()).toMatchSnapshot("browser");
  expect(fetch.mockFn).toHaveBeenCalledTimes(0);
});

test("it warns when passing a non-string as default/children", async () => {
  fetch({ "i18n://en-us@test.txt": "returned text" });
  const component = renderer.create(
    <Node uri="test">
      A <em>mistake</em>
    </Node>
  );
  expect(component.toJSON()).toMatchSnapshot("loading");
  expect(console.error.mock.calls).toMatchSnapshot("console.error");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(component.toJSON()).toMatchSnapshot("with value");
});
