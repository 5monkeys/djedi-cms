/* global process */

import { NodeContext, djedi } from "djedi-react";
import App, { Container } from "next/app";
import PropTypes from "prop-types";
import React from "react";

import Link from "../components/Link";

const LANGUAGES = {
  "en-us": "English",
  "de-de": "German",
  "sv-se": "Swedish",
};

const DEFAULT_LANGUAGE = "en-us";

// Set default and available languages.
djedi.options.languages = {
  default: DEFAULT_LANGUAGE,
  additional: Object.keys(LANGUAGES).filter(
    language => language !== DEFAULT_LANGUAGE
  ),
};

// Set baseUrl differently for server and browser rendering.
djedi.options.baseUrl =
  (typeof process !== "undefined" && process.env.SERVER_BASE_URL) ||
  "http://localhost:8000/djedi/api";

// Inject the admin sidebar, if the user has permission.
djedi.injectAdmin();

// This is 99% the standard Next.js boilerplate for _app.js.
export default class MyApp extends App {
  static async getInitialProps({ Component, ctx, ctx: { query } }) {
    let pageProps = {};

    // This demo uses a query parameter for the language to keep the demo small.
    // Ugly, but it works.
    const language = {}.hasOwnProperty.call(LANGUAGES, query.language)
      ? query.language
      : DEFAULT_LANGUAGE;

    if (Component.getInitialProps) {
      // Pass the language to the child `getInitialProps`, in case it needs to
      // call `djedi.prefetch`.
      pageProps = await Component.getInitialProps({ ...ctx, language });
    }

    // Prefetch on all pages. If the page itself has already prefetched (like
    // index.js does) this is basically a no-op. If a page absolutely must not
    // make network requests, set `.skipDjediPrefetch = true` on it.
    if (!Component.skipDjediPrefetch) {
      // Make sure to pass the language.
      await djedi.prefetch({ language });
    }

    // Track which nodes are actually rendered.
    const nodes = djedi.track();

    return { pageProps, nodes, language };
  }

  // Add in nodes loaded by `djedi.track` server-side.
  constructor(props) {
    super(props);

    if (props.nodes != null) {
      djedi.addNodes(props.nodes);
    }
  }

  render() {
    const { Component, pageProps, language } = this.props;

    return (
      <Container>
        {/* Provide the current language to all `<Node>`s. */}
        <NodeContext.Provider value={language}>
          <LanguageChooser current={language} />
          <Component {...pageProps} />
        </NodeContext.Provider>
      </Container>
    );
  }
}

LanguageChooser.propTypes = {
  current: PropTypes.oneOf(Object.keys(LANGUAGES)).isRequired,
};

function LanguageChooser({ current }) {
  return (
    <div>
      {Object.entries(LANGUAGES).map(([language, name], index) => (
        <React.Fragment key={language}>
          {index !== 0 && " / "}

          {language === current ? (
            <strong>{name}</strong>
          ) : (
            <Link href={{ query: { language } }}>
              <a>{name}</a>
            </Link>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
