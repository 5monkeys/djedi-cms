import {
  Node,
  // djedi,
  md,
} from "djedi-react";
import Head from "next/head";
import React from "react";

import CookieWarning from "../components/CookieWarning";
import Search from "../components/Search";

export default class Home extends React.Component {
  static async getInitialProps() {
    // Simply rendering <Node>s automatically causes request for the node
    // contents, but for server-side rendering it is required to pre-load them.
    // (That can also be useful for non-server rendered cases to avoid excessive
    // loading indicators to be displayed.)
    // You are encouraged to prefix all nodes so that pre-loading becomes easy.
    // This is a low-tech way to solve the problem in a good-enough manner.
    /*
    const nodes = await djedi.loadByPrefix([
      // Load all nodes used by this page.
      "home/",
      // Also load all nodes used by the <Search> component, since it is
      // considered important to be server-side rendered.
      "Search/",
    ]);
    */
    // If `djedi.loadByPrefix` fails (for example if the API is down), Next.js
    // will show its 500 page (in production mode). You can also choose to catch
    // the error and render something else.

    // Using hard-coded nodes rather than `djedi.loadByPrefix` until the API is
    // done.
    const nodes = {
      "i18n://en-us@home/title.txt": "Welcome to the djedi-react example!",
      "i18n://en-us@home/text.md":
        '<h2>Using markdown</h2><p>Some text and a <a href="{url}">link</a>.</p>',
      "i18n://en-us@home/image.img":
        '<img src="https://djedi-cms.org/_static/djedi-portrait.svg" width="144">',
      "i18n://en-us@home/footer.txt": "© [year]. This node is not editable.",
      "i18n://en-us@Search/placeholder.txt": "Search",
    };

    // Next.js will save the stuff returned here when server-side rendering and
    // pass it to the browser. This way the browser won’t have to make a request
    // for the nodes again (which also would cause “server and client did not
    // match” warnings from React). You need to call `djedi.addNodes(nodes)`
    // somewhere. In this example that is done in _app.js.
    return { nodes };
  }

  render() {
    return (
      <div>
        <Head>
          <title>djedi-react example</title>
        </Head>

        <h1>
          {/* Simple node. */}
          <Node uri="home/title">Welcome!</Node>
        </h1>

        {/* Markdown node with variable interpolation. */}
        <Node uri="home/text.md" url="https://example.com">{md`
          ## Using markdown

          Some text and a [link]({url}).
        `}</Node>

        {/* Image node. */}
        <Node uri="home/image.img" />

        <footer>
          <p>
            {/* Alternate interpolation syntax for convenience. */}
            <Node uri="home/footer" year={new Date().getFullYear()}>
              © [year] 5 Monkeys
            </Node>
          </p>

          {/* This component shows how to use a node in an HTML attribute. */}
          <Search />
        </footer>

        {/* The nodes for this component were not pre-loaded, to show that stuff
        doesn’t break if you forget to. In this case, server-side rendering
        "Loading…" instead of a cookie warning is acceptable. */}
        <CookieWarning />
      </div>
    );
  }
}
