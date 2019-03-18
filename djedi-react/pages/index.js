import { Node, djedi, md } from "djedi-react";
import Head from "next/head";
import PropTypes from "prop-types";
import React from "react";

import Link from "../components/Link";
import Search from "../components/Search";
import Toplist from "../components/Toplist";

export default class Home extends React.Component {
  static propTypes = {
    storeSlug: PropTypes.string.isRequired,
  };

  static skipDjediPrefetch = true;

  static async getInitialProps({ language }) {
    // Imagine this coming from the URL or something.
    const storeSlug = "andys-tools";

    // Simply rendering <Node>s automatically causes request for the node
    // contents, but for server-side rendering it is required to prefetch them.
    // (That can also be useful for non-server rendered cases to avoid excessive
    // loading indicators to be displayed.)
    await djedi.prefetch({
      extra: [specialOfferNode(storeSlug)],
      language,
    });
    // If `djedi.prefetch` fails (for example if the API is down), Next.js will
    // show its 500 page (in production mode). You can also choose to catch the
    // error and render something else.

    // Next.js will save the stuff returned here when server-side rendering and
    // pass it to the browser. This way the browser won’t have to make a request
    // for the nodes again (which also would cause “server and client did not
    // match” warnings from React). You need to call `djedi.addNodes(nodes)`
    // somewhere. In this example that is done in _app.js.
    return { storeSlug };
  }

  render() {
    const { storeSlug } = this.props;

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

        <p>
          <Link href={{ pathname: "/about" }}>
            <a>About us</a>
          </Link>
        </p>

        <p>
          <Link href={{ pathname: "/lots" }}>
            <a>Lots of nodes</a>
          </Link>
        </p>

        {/* Image node. */}
        <Node uri="home/image.img" />

        <footer>
          <p>
            {/* Alternate interpolation syntax for convenience. */}
            <Node uri="home/footer" year={new Date().getFullYear()}>
              © [year] 5 Monkeys
            </Node>
          </p>

          {/* This component shows how to use a node in an HTML attribute. Even
          though this node is defined in another file, it is still prefetched. */}
          <Search />

          {/* This component shows how to parse a node value. (This is also
          prefetched.) */}
          <Toplist />
        </footer>

        {/* This node has a dynamic URI and therfore isn‘t prefetched. In this
        case, server-side rendering "Loading…" instead of a cookie warning is
        acceptable. Note that it might be rendered on subsequent requests if the
        node ends up in cache. */}
        <p>
          <Node uri={`store/${storeSlug}/cookie-warning/text`}>
            This site uses cookies.
          </Node>
        </p>

        {/* This node has a dynamic URI but _is_ prefetched, by calling
        `specialOfferNode` and passing it to the `extra` array of
        `djedi.prefetch` (see above). A bit cumbersome yes, but it works. */}
        {(() => {
          const node = specialOfferNode(storeSlug);
          return (
            <p>
              <Node uri={node.uri}>{node.value}</Node>
            </p>
          );
        })()}

        <style jsx global>{`
          img {
            max-width: 600px;
            height: auto;
          }
        `}</style>
      </div>
    );
  }
}

function specialOfferNode(storeSlug) {
  return {
    uri: `store/${storeSlug}/special-offer/text`,
    value: "Special offer: All products on sale!",
  };
}
