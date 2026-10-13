import React from "react";
import renderer from "react-test-renderer";

import { Node, NodeContext, NodeText, djedi } from "../src";
import { fetch, resetAll, simpleNodeResponse, wait } from "./helpers";

jest.useFakeTimers();

console.warn = jest.fn();
console.error = jest.fn();

const fullUri = (language, path) => `i18n://${language}@${path}.txt`;

beforeEach(() => {
  resetAll();
  console.warn.mockReset();
  console.error.mockReset();
  // The `prop-types` package only logs the exact same error once. As a
  // workaround, tests that need to check for logged errors temporarily assign
  // `NodeText.displayName` to something unique. That is cleaned up here.
  delete NodeText.displayName;
});

test("passes the node value as a plain string", async () => {
  fetch(simpleNodeResponse("search/placeholder", "Search products"));
  const children = jest.fn(text => <input placeholder={text} />);
  const component = renderer.create(
    <NodeText node={<Node uri="search/placeholder">Search</Node>}>
      {children}
    </NodeText>
  );

  expect(component.toJSON()).toMatchInlineSnapshot(`
<input
  placeholder=""
/>
`);

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<input
  placeholder="Search products"
/>
`);

  expect(children.mock.calls).toEqual([
    ["", { type: "loading" }, { language: "en-us" }],
    [
      "Search products",
      { type: "success", content: "Search products" },
      { language: "en-us" },
    ],
  ]);
});

test("does not wrap HTML values in an element", async () => {
  fetch(simpleNodeResponse("title", "Fish &amp; <em>chips</em>"));
  const component = renderer.create(
    <NodeText node={<Node uri="title" />}>
      {text => <option title={text}>x</option>}
    </NodeText>
  );

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<option
  title="Fish &amp; <em>chips</em>"
>
  x
</option>
`);
});

test("sends the default value and reports the node", async () => {
  // The backend answers with the default value when nothing has been saved.
  fetch(simpleNodeResponse("search/placeholder", "Search"));
  const component = renderer.create(
    <NodeText node={<Node uri="search/placeholder">Search</Node>}>
      {text => <input placeholder={text} />}
    </NodeText>
  );

  await wait();
  expect(fetch.mockFn.mock.calls[0][1].body).toEqual({
    [fullUri("en-us", "search/placeholder")]: "Search",
  });
  expect(component.toJSON()).toMatchInlineSnapshot(`
<input
  placeholder="Search"
/>
`);
  expect(window.DJEDI_NODES).toEqual({
    [fullUri("en-us", "search/placeholder")]: "Search",
  });

  component.unmount();
  expect(window.DJEDI_NODES).toEqual({});
});

test("interpolates variables", async () => {
  fetch(simpleNodeResponse("greeting", "Hello, {name}!"));
  const component = renderer.create(
    <NodeText node={<Node uri="greeting" name="Bob" />}>
      {text => <img alt={text} />}
    </NodeText>
  );

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<img
  alt="Hello, Bob!"
/>
`);
});

test("overrides `edit` and `render` on the passed node", async () => {
  fetch(simpleNodeResponse("test", "returned text"));
  const render = jest.fn(() => "custom render");
  const component = renderer.create(
    <NodeText node={<Node uri="test" edit render={render} />}>
      {text => `text: ${text}`}
    </NodeText>
  );

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`"text: returned text"`);
  expect(render).not.toHaveBeenCalled();
});

test("passes an empty string and the error state on failure", async () => {
  fetch(new Error("network error"));
  const children = jest.fn((text, state) =>
    state.type === "error" ? "failed" : text
  );
  const component = renderer.create(
    <NodeText node={<Node uri="test">default</Node>}>{children}</NodeText>
  );

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`"failed"`);
  const [text, state] = children.mock.calls[children.mock.calls.length - 1];
  expect(text).toBe("");
  expect(state.type).toBe("error");
  expect(state.error.message).toMatch("network error");
});

test("follows the language from NodeContext", async () => {
  djedi.options.languages = {
    default: "en-us",
    additional: ["sv-se"],
  };
  fetch({ [fullUri("sv-se", "test")]: "svensk text" });
  const children = jest.fn(text => text);
  const component = renderer.create(
    <NodeContext.Provider value="sv-se">
      <NodeText node={<Node uri="test" />}>{children}</NodeText>
    </NodeContext.Provider>
  );

  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`"svensk text"`);
  expect(children.mock.calls[children.mock.calls.length - 1][2]).toEqual({
    language: "sv-se",
  });
});

test("only a <Node> is allowed as `node`", () => {
  class Boundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        error: undefined,
      };
    }

    static getDerivedStateFromError(error) {
      return { error };
    }

    render() {
      // eslint-disable-next-line react/prop-types
      const { node } = this.props;
      const { error } = this.state;
      return error != null ? (
        error.message
      ) : (
        <NodeText node={node}>{text => text}</NodeText>
      );
    }
  }

  const component1 = renderer.create(<Boundary node={<div />} />);

  expect(component1.toJSON()).toMatchInlineSnapshot(
    `"djedi-react: <NodeText> \`node\` must be a <Node> element."`
  );

  NodeText.displayName = "NodeTextNodeMistake";
  const component2 = renderer.create(<Boundary node={null} />);

  expect(console.error.mock.calls[0][0]).toMatch(
    "The prop `node` is marked as required in `NodeTextNodeMistake`"
  );
  expect(component2.toJSON()).toMatchInlineSnapshot(
    `"djedi-react: <NodeText> \`node\` must be a <Node> element."`
  );
});
