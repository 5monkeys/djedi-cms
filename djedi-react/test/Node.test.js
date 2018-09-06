import React from "react";
import dedent from "dedent-js";
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

console.error = jest.fn();

beforeEach(() => {
  resetAll();
  console.error.mockReset();
  // The `prop-types` package only logs the exact same error once. As a
  // workaround, tests that need to check for logged errors temporarily assign
  // `Node.displayName` to something unique. That is cleaned up here.
  delete Node.displayName;
});

test("it renders loading and then the node", async () => {
  fetch(simpleNodeResponse("test", "returned text"));
  const component = renderer.create(<Node uri="test" />);

  expect(component.toJSON()).toMatchInlineSnapshot(`"Loading…"`);

  await wait();
  expect(fetch.mockFn.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "/djedi/nodes/",
    Object {
      "body": Object {
        "i18n://en-us@test.txt": null,
      },
      "headers": Object {
        "Content-Type": "application/json",
      },
      "method": "POST",
    },
  ],
]
`);

  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@test"
>
  returned text
</span>
`);

  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": undefined,
}
`);
});

test("it renders synchronously if the node is already in cache", async () => {
  fetch(simpleNodeResponse("home/intro", "Welcome to our amazing website!"));
  djedi.reportPrefetchableNode({
    uri: "home/intro",
    value: "Welcome",
  });

  const nodes = await djedi.prefetch();

  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@home/intro.txt": "Welcome",
}
`);

  expect(nodes).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@home/intro.txt": "Welcome to our amazing website!",
}
`);

  const component = renderer.create(
    <Node uri="home/intro">Hello, World!</Node>
  );

  const serverRendered = component.toJSON();
  expect(serverRendered).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@home/intro"
>
  Welcome to our amazing website!
</span>
`);

  // Imagine the above being done on the server (server-side rendering). Now,
  // simulate sending everything down to the browser. This means the `djedi`
  // instance in the browser has an empty cache, but we can send down `nodes` to
  // the browser and let the frontend add those before rendering.
  resetAll();
  djedi.addNodes(nodes);
  const component2 = renderer.create(
    <Node uri="home/intro">Hello, World!</Node>
  );

  expect(component2.toJSON()).toEqual(serverRendered);
  expect(fetch.mockFn).toHaveBeenCalledTimes(0);
});

test("it warns when passing a non-string as default/children", async () => {
  Node.displayName = "NodeChildrenMistake";
  const component = renderer.create(
    <Node uri="test">
      A <em>mistake</em>
    </Node>
  );

  expect(component.toJSON()).toMatchInlineSnapshot(`"Loading…"`);

  expect(console.error.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "Warning: Failed prop type: Invalid prop \`children\` of type \`array\` supplied to \`NodeChildrenMistake\`, expected \`string\`.
    in NodeChildrenMistake",
  ],
]
`);

  // This shows how non-string stuff is just passed to `String()`.
  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "A ,[object Object]",
}
`);
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
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@first"
>
  first
</span>
`);

  instance.setState({ uri: "second" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@second"
>
  second
</span>
`);

  instance.setState({ edit: false });
  expect(component.toJSON()).toMatchInlineSnapshot(`"second"`);

  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Array [
  Object {
    "i18n://en-us@first.txt": null,
  },
  Object {
    "i18n://en-us@second.txt": null,
  },
]
`);
});

test("it warns if changing the default/children", async () => {
  fetch(simpleNodeResponse("test", "test value"));

  const Wrapper = withState(({ defaultValue = "first" }) => (
    <Node uri="test">{defaultValue}</Node>
  ));
  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();

  await wait();
  const firstRender = component.toJSON();
  expect(firstRender).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@test"
>
  test value
</span>
`);

  instance.setState({ defaultValue: "second" });
  expect(component.toJSON()).toEqual(firstRender);
  expect(console.error.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "djedi-react: Changing the default value of a node is not supported.",
    Object {
      "next": "second",
      "prev": "first",
    },
  ],
]
`);

  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "first",
}
`);
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
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@first"
>
  first
</span>
`);

  instance.setState({ uri: "second", defaultValue: "second" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@second"
>
  second
</span>
`);

  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Array [
  Object {
    "i18n://en-us@first.txt": "first",
  },
  Object {
    "i18n://en-us@second.txt": "second",
  },
]
`);
});

test("it handles auto-versioning", async () => {
  fetch({ "i18n://en-us@test.txt#1": "user edited text" });
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@test"
>
  user edited text
</span>
`);
});

test("it handles error status codes", async () => {
  fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(
    `"Failed to fetch content 😞 (500)"`
  );
});

test("it handles rejected requests", async () => {
  fetch(new Error("Network error"));
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(
    `"Failed to fetch content 😞 (-1)"`
  );
});

test("it handles missing nodes in response", async () => {
  fetch({});
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(
    `"Failed to fetch content 😞 (1404)"`
  );
});

test("it handles nodes with null value in response", async () => {
  fetch(simpleNodeResponse("test", null));
  const component = renderer.create(<Node uri="test" />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  data-i18n="en-us@test"
>
  
</span>
`);
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
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  <span
    dangerouslySetInnerHTML={
      Object {
        "__html": "A <a href=\\"https://example.com\\">link</a>.",
      }
    }
    data-i18n="en-us@first"
  />
  <span
    dangerouslySetInnerHTML={
      Object {
        "__html": "A &amp; B",
      }
    }
    data-i18n="en-us@second"
  />
</div>
`);
});

test("edit=false", async () => {
  fetch(simpleNodeResponse("test", "test"));
  const component = renderer.create(<Node uri="test" edit={false} />);
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`"test"`);
});

test("using the md tag", async () => {
  renderer.create(
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
  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "# A heading

Some text with a [link](https://example.com)

> Blockquote

    function codeBlock() {
      return \\"with indentation\\"
    }",
}
`);
});

test("dedenting", async () => {
  const withoutMd = `
    Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
    hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
    metus, torquent ac egestas integer erat pharetra vehicula senectus.
  `;

  const withMd = md`
    Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id, hendrerit
    euismod iaculis convallis ante tincidunt tempus bibendum metus, torquent ac
    egestas integer erat pharetra vehicula senectus.
  `;

  renderer.create(
    <div>
      <Node uri="babel-dedented">
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      </Node>
      <Node uri="not-dedented">{`
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      `}</Node>
      <Node uri="not-dedented-var">{withoutMd}</Node>
      <Node uri="md-dedented">{md`
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      `}</Node>
      <Node uri="md-dedented-var">{withMd}</Node>
    </div>
  );

  await wait();

  // Note the whitespace difference. md dedents.
  expect(withoutMd).toMatchInlineSnapshot(`
"
    Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
    hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
    metus, torquent ac egestas integer erat pharetra vehicula senectus.
  "
`);
  expect(withMd).toMatchInlineSnapshot(`
"Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id, hendrerit
euismod iaculis convallis ante tincidunt tempus bibendum metus, torquent ac
egestas integer erat pharetra vehicula senectus."
`);

  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@babel-dedented.txt": "Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id, hendrerit euismod iaculis convallis ante tincidunt tempus bibendum metus, torquent ac egestas integer erat pharetra vehicula senectus.",
  "i18n://en-us@md-dedented-var.txt": "Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id, hendrerit
euismod iaculis convallis ante tincidunt tempus bibendum metus, torquent ac
egestas integer erat pharetra vehicula senectus.",
  "i18n://en-us@md-dedented.txt": "Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
metus, torquent ac egestas integer erat pharetra vehicula senectus.",
  "i18n://en-us@not-dedented-var.txt": "
    Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
    hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
    metus, torquent ac egestas integer erat pharetra vehicula senectus.
  ",
  "i18n://en-us@not-dedented.txt": "
        Lorem ipsum dolor sit amet consectetur adipiscing elit tempor id,
        hendrerit euismod iaculis convallis ante tincidunt tempus bibendum
        metus, torquent ac egestas integer erat pharetra vehicula senectus.
      ",
}
`);
});

test("interpolations: passing values to backend", async () => {
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

  // console.error for uri `1`.
  expect(console.error.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "Warning: Failed prop type: Invalid prop \`children\` of type \`array\` supplied to \`NodeInterpolationMistake\`, expected \`string\`.
    in NodeInterpolationMistake",
  ],
]
`);

  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@1.txt": "Hello, ,Bob,!",
  "i18n://en-us@2.txt": "Hello, {user}!",
  "i18n://en-us@3.txt": "Hello, [user]!",
  "i18n://en-us@4.txt": "Hello, {user}!",
  "i18n://en-us@5.txt": "Hello, [user]!",
  "i18n://en-us@6.txt": "Hello, {user}!",
  "i18n://en-us@7.txt": "Hello, [user]!",
}
`);
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
  expect(component.toJSON()).toMatchInlineSnapshot(`
<span
  dangerouslySetInnerHTML={
    Object {
      "__html": "Hello Bob!
Hello Bob!
Number: 3.141592653589793
Number: 3.141592653589793
Formatted number: 3.14
Formatted number: 3.14
hasOwnProperty: Asking for trouble
hasOwnProperty: Asking for trouble
undefined: undefined
undefined: undefined
null: null
null: null
Unusual key: slash
Unusual key: slash
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
Double brackets OK: {Bob}
Double brackets OK: [Bob]
Double brackets OK: [Bob]
Double brackets OK: {Bob}",
    }
  }
  data-i18n="en-us@test"
/>
`);
});

test("custom render function", async () => {
  fetch("<h1>Server error 500</h1>", { status: 500, stringify: false });
  fetch(new Error("Network error"));
  fetch({});
  fetch(simpleNodeResponse("4", "returned value"));
  fetch(simpleNodeResponse("5", null));

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

  // Loading.
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  loading
  <hr />
  LOADING
</div>
`);

  // Status error.
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  error
  <hr />
  <div
    data-details={
      Object {
        "message": "Djedi API error for request: POST /djedi/nodes/
RequestData sent: {
  \\"i18n://en-us@1.txt\\": null
}
Response: 500 <mock.statusText>
Error: Unexpected response status code. Got 500 but expected 200 <= status < 400.",
        "responseText": "<h1>Server error 500</h1>",
        "status": 500,
      }
    }
  >
    Error
  </div>
</div>
`);

  // Network error.
  instance.setState({ uri: "2" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  error
  <hr />
  <div
    data-details={
      Object {
        "message": "Djedi API error for request: POST /djedi/nodes/
RequestData sent: {
  \\"i18n://en-us@2.txt\\": null
}
Response: undefined
Error: Network error",
        "responseText": "",
        "status": -1,
      }
    }
  >
    Error
  </div>
</div>
`);

  // Missing.
  instance.setState({ uri: "3" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  error
  <hr />
  <div
    data-details={
      Object {
        "message": "Missing result for node: i18n://en-us@3.txt",
        "responseText": undefined,
        "status": 1404,
      }
    }
  >
    Error
  </div>
</div>
`);

  // Success.
  instance.setState({ uri: "4" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  success
  <hr />
  <article>
    <span
      data-i18n="en-us@4"
    >
      returned value
    </span>
  </article>
</div>
`);

  // Null value.
  instance.setState({ uri: "5" });
  await wait();
  expect(component.toJSON()).toMatchInlineSnapshot(`
<div>
  success
  <hr />
  <article>
    <span
      data-i18n="en-us@5"
    >
      
    </span>
  </article>
</div>
`);
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

  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`Object {}`);

  const component = renderer.create(<Wrapper />);
  const instance = component.getInstance();

  await wait();
  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@changing1.txt": undefined,
  "i18n://en-us@loneRemoved.txt": "loneRemoved",
  "i18n://en-us@removed.txt": undefined,
}
`);

  instance.setState({ remove: true, changingUri: "changing2" });
  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@changing1.txt": undefined,
  "i18n://en-us@changing2.txt": undefined,
  "i18n://en-us@removed.txt": undefined,
}
`);

  instance.setState({ changingUri: "changing3" });
  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@changing1.txt": undefined,
  "i18n://en-us@changing3.txt": undefined,
  "i18n://en-us@removed.txt": undefined,
}
`);

  component.unmount();
  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`Object {}`);
});

test("it uses the last default when rendering nodes with different defaults", async () => {
  renderer.create(
    <div>
      <Node uri="test">default</Node>
      <Node uri="i18n://test.txt" />
      <Node uri="en-us@test">other default</Node>
    </div>
  );

  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test.txt": "other default",
}
`);
});

test("batching", async () => {
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

  // One request for 1 and 2, one for 3.
  await wait();
  expect(fetch.calls()).toMatchInlineSnapshot(`
Array [
  Object {
    "i18n://en-us@1.txt": null,
    "i18n://en-us@2.txt": null,
  },
  Object {
    "i18n://en-us@3.txt": null,
  },
]
`);
});
