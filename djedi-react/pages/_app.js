import { djedi } from "djedi-react";
import App, { Container } from "next/app";
import React from "react";

// Set baseUrl differently for server and browser rendering.
djedi.options.baseUrl =
  typeof window === "undefined"
    ? "http://django:8000"
    : "http://localhost:8000";

// This is 99% the standard Next.js boilerplate for _app.js.
export default class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};

    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }

    return { pageProps };
  }

  // Add in nodes loaded by `djedi.loadByPrefix` server-side. This uses a
  // convention where `getInitialProps` of all pages return a key called
  // `nodes`, so that we don’t have to call `djeid.addNodes` in every page
  // component. Convenient!
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
