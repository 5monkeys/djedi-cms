import { Node, djedi } from "djedi-react";
import Head from "next/head";
import Link from "next/link";
import React from "react";

export default class Home extends React.Component {
  static async getInitialProps() {
    const nodes = await djedi.prefetch();
    return { nodes };
  }

  state = {
    showText: false,
  };

  toggleText = () => {
    this.setState(state => ({ showText: !state.showText }));
  };

  render() {
    const { showText } = this.state;

    return (
      <div>
        <Head>
          <title>About us</title>
        </Head>

        <p>
          <Link href="/">
            <a>Home</a>
          </Link>
        </p>

        <p>
          <Node uri="about/intro">
            This page exists to test that the Djedi sidebar stays up-to-date
            when switching pages or clicking buttons that show/hide nodes.
          </Node>
        </p>

        <p>
          <Node uri="about/duplicate">Duplicate node</Node>
        </p>

        <p>
          <button type="button" onClick={this.toggleText}>
            {showText ? "Collapse" : "Read more"}
          </button>
        </p>

        {showText && (
          <div style={{ border: "1px solid black" }}>
            <p>
              <Node uri="about/text">
                More text! Does this appear in the sidebar?
              </Node>
            </p>

            <p>
              <Node uri="about/duplicate">Duplicate node</Node>
            </p>
          </div>
        )}
      </div>
    );
  }
}
