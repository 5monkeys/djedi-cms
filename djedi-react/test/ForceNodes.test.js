import React from "react";
import renderer from "react-test-renderer";

import { ForceNodes, Node } from "../src";
import { fetch, resetAll, simpleNodeResponse, wait } from "./helpers";

jest.useFakeTimers();

beforeEach(() => {
  resetAll();
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
      const { error } = this.state;
      return error != null ? (
        error.message
      ) : (
        <ForceNodes>
          <div />
        </ForceNodes>
      );
    }
  }

  const component = renderer.create(<Boundary />);

  expect(component.toJSON()).toMatchInlineSnapshot(
    `"djedi-react: <ForceNodes> only accepts <Node>s as children."`
  );
});
