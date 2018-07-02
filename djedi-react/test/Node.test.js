import React from "react";
import dedent from "dedent";
import renderer from "react-test-renderer";

import { Node, djedi, md } from "../src";

import {
  errorDetails,
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
  djedi.reportPrefetchableNode({
    uri: "home/intro",
    value: "Welcome",
  });
  const nodes = await djedi.prefetch();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(nodes).toMatchSnapshot("prefetch result");
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
  expect(component.toJSON()).toMatchSnapshot("render");

  instance.setState({ uri: "second", defaultValue: "second" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("render");

  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("it handles auto-versioning", async () => {
  fetch({ "i18n://en-us@test.txt#1": "user edited text" });
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchSnapshot("render");
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
    ...simpleNodeResponse("first", 'A <a href="https://example.com">link</a>.'),
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

      Some text with a [link](https://example.com)

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
      {/* prettier-ignore */}
      <Node uri="6">{md`Hello, {user}!`}</Node>
      {/* prettier-ignore */}
      <Node uri="7">{md`Hello, [user]!`}</Node>
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

  const unusualVariables = {
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
      hasOwnProperty="Asking for trouble"
      undefined={undefined}
      null={null}
      {...unusualVariables}
    >
      Default value
    </Node>
  );

  await wait();
  expect(component.toJSON()).toMatchSnapshot("rendered");
});

test("custom render function", async () => {
  fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
  fetch(new Error("Network error"));
  fetch(simpleNodeResponse("3", null));
  fetch(simpleNodeResponse("4", "returned value"));

  function render1(state) {
    return state.type;
  }

  function render2(state) {
    switch (state.type) {
      case "error":
        return <div data-details={errorDetails(state.error)}>Error</div>;
      case "success":
        return <article>{state.content}</article>;
      case "loading":
        return "LOADING";
      default:
        return "UNKNOWN";
    }
  }

  djedi.options.defaultRender = render1;

  const Wrapper = withState(({ uri = "1" }) => (
    <div>
      <Node uri={uri} />
      <hr />
      <Node uri={uri} render={render2} />
    </div>
  ));

  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();

  expect(component.toJSON()).toMatchSnapshot("loading");

  await wait();
  expect(component.toJSON()).toMatchSnapshot("status error");

  instance.setState({ uri: "2" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("network error");

  instance.setState({ uri: "3" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("missing");

  instance.setState({ uri: "4" });
  await wait();
  expect(component.toJSON()).toMatchSnapshot("with value");

  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api calls");
});

test("it handles window.DJEDI_NODES", async () => {
  fetch({
    ...simpleNodeResponse("removed", "removed"),
    ...simpleNodeResponse("loneRemoved", "loneRemoved"),
    ...simpleNodeResponse("changing1", "changing1"),
    ...simpleNodeResponse("changing2", "changing2"),
    ...simpleNodeResponse("changing3", "changing3"),
  });

  const Wrapper = withState(({ remove = false, changingUri = "changing1" }) => (
    <div>
      <Node uri="removed" />
      {!remove && <Node uri="removed" />}

      {!remove && <Node uri="loneRemoved">loneRemoved</Node>}

      <Node uri="changing1" />
      <Node uri={changingUri} />
    </div>
  ));

  expect(window.DJEDI_NODES).toMatchSnapshot("before render");

  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();

  await wait();
  expect(window.DJEDI_NODES).toMatchSnapshot("render");

  instance.setState({ remove: true, changingUri: "changing2" });
  expect(window.DJEDI_NODES).toMatchSnapshot("render");

  instance.setState({ changingUri: "changing3" });
  expect(window.DJEDI_NODES).toMatchSnapshot("render");

  component.unmount();
  expect(window.DJEDI_NODES).toMatchSnapshot("unmounted");
});

test("it warns about rendering nodes with different defaults", async () => {
  fetch(simpleNodeResponse("test", "test"));
  renderer.create(
    <div>
      <Node uri="test">default</Node>
      <Node uri="en-us@test">other default</Node>
      <Node uri="i18n://test.txt" />
    </div>
  );
  expect(console.warn.mock.calls).toMatchSnapshot("console.warn");
  expect(window.DJEDI_NODES).toMatchSnapshot("window.DJEDI_NODES");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
});

test("edge case: if node.value is missing somehow, it doesn’t crash", () => {
  const component = renderer.create(<Node uri="test" />);
  const instance = component.getInstance();
  instance.setState({ node: { uri: "test", value: null } });
  expect(component.toJSON()).toMatchSnapshot();
});

test("batching", async () => {
  fetch({});
  fetch({});

  djedi.options.batchInterval = 30;

  const Wrapper = withState(({ level = 0 }) => (
    <div>
      <Node uri="1" />
      <Node uri="1.txt" />
      {level >= 1 && <Node uri="en-us@1" />}
      {level >= 2 && <Node uri="2" />}
      {level >= 3 && <Node uri="3" />}
    </div>
  ));
  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();

  jest.advanceTimersByTime(10);
  instance.setState({ level: 1 });

  jest.advanceTimersByTime(10);
  instance.setState({ level: 2 });

  jest.advanceTimersByTime(10);
  instance.setState({ level: 3 });

  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot(
    "api calls (one request for 1 & 2, one for 3)"
  );
});
