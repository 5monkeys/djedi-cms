/* global process */

import { djedi } from "djedi-react";
import App, { Container } from "next/app";
import React from "react";

// Set baseUrl differently for server and browser rendering.
djedi.options.baseUrl =
  (typeof process !== "undefined" && process.env.SERVER_BASE_URL) ||
  "http://localhost:8000/djedi/api";

// Inject the admin sidebar, if the user has permission.
djedi.injectAdmin();

// This is 99% the standard Next.js boilerplate for _app.js.
export default class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    // Prefetch on all pages. If the page itself has already prefetched (like
    // index.js does) this is basically a no-op. If a page absolutely must not
    // make network requests, set `.skipDjediPrefetch = true` on it.
    if (!Component.skipDjediPrefetch) {
      await djedi.prefetch();
    }

    // Track which nodes are actually rendered.
    const nodes = djedi.track();

    return { pageProps, nodes };
  }

  // Add in nodes loaded by `djedi.track` server-side.
  constructor(props) {
    super(props);
    const { nodes } = props;
    if (nodes != null) {
      djedi.addNodes(nodes);
    }
  }

  render() {
    const { Component, pageProps } = this.props;
    return (
      <Container>
        <Component {...pageProps} />
      </Container>
    );
  }
}
