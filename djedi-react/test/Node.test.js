import React from "react";
import renderer from "react-test-renderer";

import { Node, djedi } from "../src";

import {
  fetch,
  resetAll,
  simpleNodeResponse,
  wait,
  withState,
} from "./helpers";

jest.useFakeTimers();

console.warn = jest.fn();
console.error = jest.fn();

beforeEach(() => {
  resetAll();
  console.warn.mockClear();
  console.error.mockClear();
});

test("it renders loading and then the node", async () => {
  fetch(simpleNodeResponse("test", "returned text"));
  const component = renderer.create(<Node uri="test" />);
  expect(component.toJSON()).toMatchSnapshot("loading");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(window.DJEDI_NODES).toMatchSnapshot("window.DJEDI_NODES");
});

test("it renders synchronously if the node is already in cache", async () => {
  fetch(simpleNodeResponse("home/intro", "Welcome to our amazing website!"));
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
  fetch(simpleNodeResponse("test", "returned text"));
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

test("it fetches again after changing the uri prop (but not other props)", async () => {
  fetch(simpleNodeResponse("first", "first"));
  fetch(simpleNodeResponse("second", "second"));
  const Wrapper = withState(({ uri = "first", edit = true }) => (
    <Node uri={uri} edit={edit} />
  ));
  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();
  await wait();
  expect(component.toJSON()).toMatchSnapshot("first render");
  instance.setState({ uri: "second" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("second render");
  instance.setState({ edit: false });
  expect(component.toJSON()).toMatchSnapshot(
    "third render (same uri, no edit)"
  );
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("it warns if changing the default/children", async () => {
  fetch(simpleNodeResponse("test", "test value"));
  const Wrapper = withState(({ defaultValue = "first" }) => (
    <Node uri="test">{defaultValue}</Node>
  ));
  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();
  await wait();
  expect(component.toJSON()).toMatchSnapshot("first render");
  instance.setState({ defaultValue: "second" });
  expect(console.error.mock.calls).toMatchSnapshot("console.error");
  expect(component.toJSON()).toMatchSnapshot(
    "second render (same as first render)"
  );
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("it allows changing the default/children if also changing the uri", async () => {
  fetch(simpleNodeResponse("first", "first"));
  fetch(simpleNodeResponse("second", "second"));
  const Wrapper = withState(({ uri = "first", defaultValue = "first" }) => (
    <Node uri={uri}>{defaultValue}</Node>
  ));
  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();
  await wait();
  expect(component.toJSON()).toMatchSnapshot("first render");
  instance.setState({ uri: "second", defaultValue: "second" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("second render");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("it handles error status codes", async () => {
  fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchSnapshot("error");
});

test("it handles rejected requests", async () => {
  fetch(new Error("Network error"));
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchSnapshot("error");
});

test("it handles missing nodes in response", async () => {
  fetch({});
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchSnapshot("missing");
});
