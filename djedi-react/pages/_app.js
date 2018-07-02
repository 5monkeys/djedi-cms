/* global process */

import { djedi } from "djedi-react";
import App, { Container } from "next/app";
import React from "react";

// Set baseUrl differently for server and browser rendering.
djedi.options.baseUrl =
  (typeof process !== "undefined" && process.env.SERVER_BASE_URL) ||
  "http://localhost:8000/djedi";

// Inject the admin sidebar, if the user has permission. Only do this in the
// browser.
if (typeof document !== "undefined") {
  // First allow the iframe to set its `document.domain` to the domain of this
  // script. Only works if this domain is a superdomain of the iframe domain.
  // This is only needed if the iframe is served from a (different) subdomain
  // (or, in the case of this demo, different localhost ports are used).
  // eslint-disable-next-line no-self-assign
  document.domain = document.domain;
  djedi.injectAdmin();
}

// This is 99% the standard Next.js boilerplate for _app.js.
export default class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  // Add in nodes loaded by `djedi.prefetch` server-side. This uses a convention
  // where `getInitialProps` of all pages return a key called `nodes`, so that
  // we don’t have to call `djeid.addNodes` in every page component. Convenient!
  constructor(props) {
    super(props);
    const { nodes } = props.pageProps;
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
