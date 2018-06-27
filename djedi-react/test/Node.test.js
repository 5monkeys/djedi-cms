import React from "react";
import dedent from "dedent";
import renderer from "react-test-renderer";

import { Node, djedi, md } from "../src";

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
  // The `prop-types` package only logs the exact same error once. As a
  // workaround, tests that need to check for logged errors temporarily assign
  // `Node.displayName` to something unique. That is cleaned up here.
  delete Node.displayName;
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
  Node.displayName = "NodeChildrenMistake";
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

test("it treats node values as HTML", async () => {
  fetch({
    ...simpleNodeResponse("first", 'A <a href="http://example.com">link</a>.'),
    ...simpleNodeResponse("second", "A &amp; B"),
  });
  const component = renderer.create(
    <div>
      <Node uri="first" />
      <Node uri="second" />
    </div>
  );
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");
});

test("edit=false", async () => {
  fetch(simpleNodeResponse("test", "test"));
  const component = renderer.create(<Node uri="test" edit={false} />);
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");
});

test("default values are dedented", async () => {
  fetch({
    ...simpleNodeResponse("first", "first"),
    ...simpleNodeResponse("second", "second"),
  });
  const component = renderer.create(
    <div>
      <Node uri="first">
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      </Node>
      <Node uri="second">{`
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      `}</Node>
    </div>
  );
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("using the md tag", async () => {
  fetch(simpleNodeResponse("test", "test"));
  const component = renderer.create(
    <Node uri="test">{md`
      # A heading

      Some text with a [link](http://example.com)

      > Blockquote

          function codeBlock() {
            return "with indentation"
          }
    `}</Node>
  );
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("the md tag ignores interpolations and warns about them", async () => {
  fetch(simpleNodeResponse("test", "test"));
  const user = "Bob";
  const component = renderer.create(
    <Node uri="test">{md`
      Hello, ${user}!
    `}</Node>
  );
  expect(console.warn.mock.calls).toMatchSnapshot("console.warn");
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("interpolations: passing values to backend", async () => {
  fetch({});
  Node.displayName = "NodeInterpolationMistake";
  const user = "Bob";
  renderer.create(
    <div>
      <Node uri="1">Hello, {user}!</Node>
      <Node uri="2">Hello, &#x7b;user&#x7d;!</Node>
      <Node uri="3">Hello, [user]!</Node>
      <Node uri="4">{`Hello, {user}!`}</Node>
      <Node uri="5">{`Hello, [user]!`}</Node>
      <Node uri="6">{md`
        Hello,
        {user}!
      `}</Node>
      <Node uri="7">{md`
        Hello,
        [user]!
      `}</Node>
    </div>
  );
  expect(console.error.mock.calls).toMatchSnapshot(
    "console.error (for uri `1`)"
  );
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("interpolations: rendering values", async () => {
  fetch(
    simpleNodeResponse(
      "test",
      dedent`
        Hello {name}!
        Hello [name]!
        Number: {pi}
        Number: [pi]
        Formatted number: {pi2}
        Formatted number: [pi2]
        Date: {date}
        Date: [date]
        hasOwnProperty: {hasOwnProperty}
        hasOwnProperty: [hasOwnProperty]
        undefined: {undefined}
        undefined: [undefined]
        null: {null}
        null: [null]
        Unusual key: {a/b}
        Unusual key: [a/b]
        Whitespace in key not interpolated: {a b}
        Whitespace in key not interpolated: [a b]
        Delimiter in key not interpolated: {a{b}
        Delimiter in key not interpolated: {a}b}
        Delimiter in key not interpolated: [a[b]
        Delimiter in key not interpolated: [a]b]
        Empty key not interpolated: {}
        Empty key not interpolated: []
        edit not interpolated: {edit}
        edit not interpolated: [edit]
        children not interpolated: {children}
        children not interpolated: [children]
        toString not interpolated: {toString}
        toString not interpolated: [toString]
        Unknown key left alone: {unknown}
        Unknown key left alone: [unknown]
        Escaped: &#x7b;name&#x7d;
        Escaped: &#x5b;name&#x5d;
        Double brackets OK: {{name}}
        Double brackets OK: [{name}]
        Double brackets OK: [[name]]
        Double brackets OK: {[name]}
      `
    )
  );
  const unusualKwargs = {
    "a/b": "slash",
    "a b": "ignored",
    "a{b": "ignored",
    "a}b": "ignored",
    "a[b": "ignored",
    "a]b": "ignored",
    "": "ignored",
  };
  const component = renderer.create(
    <Node
      uri="test"
      name="Bob"
      pi={Math.PI}
      pi2={Math.PI.toFixed(2)}
      date={new Date("2018-06-27")}
      hasOwnProperty="Asking for trouble"
      undefined={undefined}
      null={null}
      {...unusualKwargs}
    >
      Default value
    </Node>
  );
  await wait();
  expect(component.toJSON()).toMatchSnapshot("rendered");
});
