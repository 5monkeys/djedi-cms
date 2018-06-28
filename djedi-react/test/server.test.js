/**
 * @jest-environment node
 */

import React from "react";
import dedent from "dedent";
import renderer from "react-test-renderer";

import { Node, djedi, md } from "../src";

import { fetch, resetAll, simpleNodeResponse, wait } from "./helpers";

jest.useFakeTimers();

beforeEach(() => {
  resetAll();
});

test("it renders loading and then the node", async () => {
  fetch(
    simpleNodeResponse(
      "test",
      dedent`
        <h1>Heading</h1>
        <p>And a <a href="{url}">link</a>.</p>
      `
    )
  );
  const component = renderer.create(
    <Node uri="test" url="https://example.com/">{md`
      # Heading

      And a [link]({url}).
    `}</Node>
  );
  djedi.options.baseUrl = "http://internal:3210";
  expect(component.toJSON()).toMatchSnapshot("loading");
  await wait();
  expect(fetch.mockFn.mock.calls).toMatchSnapshot("api call");
  expect(component.toJSON()).toMatchSnapshot("with value");
  expect(typeof window).toBe("undefined");
});
