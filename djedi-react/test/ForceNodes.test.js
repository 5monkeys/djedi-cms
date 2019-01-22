import React from "react";
import renderer from "react-test-renderer";

import { ForceNodes, Node } from "../src";
import { fetch, resetAll, simpleNodeResponse, wait } from "./helpers";

jest.useFakeTimers();

console.error = jest.fn();

beforeEach(() => {
  resetAll();
  console.error.mockReset();
  // The `prop-types` package only logs the exact same error once. As a
  // workaround, tests that need to check for logged errors temporarily assign
  // `ForceNodes.displayName` to something unique. That is cleaned up here.
  delete ForceNodes.displayName;
});

test("loads nodes but never renders anything", async () => {
  fetch({
    ...simpleNodeResponse("test1", "returned text1"),
    ...simpleNodeResponse("test2", "returned text2"),
  });
  const test2 = <Node uri="test2" />;
  const component = renderer.create(
    <ForceNodes>
      <Node uri="test1" />
      {test2}
    </ForceNodes>
  );

  expect(component.toJSON()).toMatchInlineSnapshot(`null`);

  await wait();
  expect(fetch.mockFn.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "/djedi/nodes/",
    Object {
      "body": Object {
        "i18n://en-us@test1.txt": null,
        "i18n://en-us@test2.txt": null,
      },
      "headers": Object {
        "Content-Type": "application/json",
      },
      "method": "POST",
    },
  ],
]
`);

  expect(component.toJSON()).toMatchInlineSnapshot(`null`);

  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@test1.txt": undefined,
  "i18n://en-us@test2.txt": undefined,
}
`);
});

test("deeply nested objects and arrays", async () => {
  const NODES = {
    failed: <Node uri="failed">Failed saving your data.</Node>,
    email: {
      missing: <Node uri="email/missing">Please enter your email.</Node>,
      invalid: <Node uri="email/invalid">Invalid email.</Node>,
      hints: [
        <Node key="1" uri="email/hints/1">
          something@something.com
        </Node>,
        {
          left: <Node uri="email/hints/2/left">No spam</Node>,
          right: <Node uri="email/hints/2/right">Great content</Node>,
        },
        [
          <Node key="1" uri="email/hints/3/array">
            This is inside an array for some reason.
          </Node>,
        ],
      ],
    },
  };

  fetch({
    ...simpleNodeResponse("invalid", "returned text1"),
    ...simpleNodeResponse("email/missing", "returned text2"),
    ...simpleNodeResponse("email/invalid", "returned text3"),
    ...simpleNodeResponse("email/hints/1", "returned text4"),
    ...simpleNodeResponse("email/hints/2/left", "returned text5"),
    ...simpleNodeResponse("email/hints/2/right", "returned text6"),
    ...simpleNodeResponse("email/hints/3/array", "returned text7"),
  });

  const component = renderer.create(<ForceNodes>{NODES}</ForceNodes>);

  expect(component.toJSON()).toMatchInlineSnapshot(`null`);

  await wait();
  expect(fetch.mockFn.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "/djedi/nodes/",
    Object {
      "body": Object {
        "i18n://en-us@email/hints/1.txt": "something@something.com",
        "i18n://en-us@email/hints/2/left.txt": "No spam",
        "i18n://en-us@email/hints/2/right.txt": "Great content",
        "i18n://en-us@email/hints/3/array.txt": "This is inside an array for some reason.",
        "i18n://en-us@email/invalid.txt": "Invalid email.",
        "i18n://en-us@email/missing.txt": "Please enter your email.",
        "i18n://en-us@failed.txt": "Failed saving your data.",
      },
      "headers": Object {
        "Content-Type": "application/json",
      },
      "method": "POST",
    },
  ],
]
`);

  expect(component.toJSON()).toMatchInlineSnapshot(`null`);

  expect(window.DJEDI_NODES).toMatchInlineSnapshot(`
Object {
  "i18n://en-us@email/hints/1.txt": "something@something.com",
  "i18n://en-us@email/hints/2/left.txt": "No spam",
  "i18n://en-us@email/hints/2/right.txt": "Great content",
  "i18n://en-us@email/hints/3/array.txt": "This is inside an array for some reason.",
  "i18n://en-us@email/invalid.txt": "Invalid email.",
  "i18n://en-us@email/missing.txt": "Please enter your email.",
  "i18n://en-us@failed.txt": "Failed saving your data.",
}
`);
});

test("only <Node>s are allowed as children", () => {
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
      const { children } = this.props;
      const { error } = this.state;
      return error != null ? (
        error.message
      ) : (
        <ForceNodes>{children}</ForceNodes>
      );
    }
  }

  const component1 = renderer.create(
    <Boundary>
      <div />
    </Boundary>
  );

  expect(component1.toJSON()).toMatchInlineSnapshot(
    `"djedi-react: <ForceNodes> children must be <Node> elements, or (nested) arrays/objects of <Node> elements."`
  );

  ForceNodes.displayName = "ForceNodesChildrenMistake";
  const component2 = renderer.create(<Boundary>{null}</Boundary>);

  expect(console.error.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "Warning: Failed prop type: The prop \`children\` is marked as required in \`ForceNodesChildrenMistake\`, but its value is \`null\`.
    in ForceNodesChildrenMistake (created by Boundary)
    in Boundary",
  ],
]
`);

  expect(component2.toJSON()).toMatchInlineSnapshot(
    `"djedi-react: <ForceNodes> children must be <Node> elements, or (nested) arrays/objects of <Node> elements."`
  );
});
