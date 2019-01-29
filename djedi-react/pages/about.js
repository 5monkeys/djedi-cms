import { ForceNodes, Node } from "djedi-react";
import Head from "next/head";
import React from "react";

import Link from "../components/Link";

const forced = (
  <Node uri="about/forced">
    This node appears in the Djedi sidebar even when this section is collapsed.
    Does it get a Djedi outline?
  </Node>
);

const forcedManual = (
  <Node uri="about/forcedManual">
    This node appears in the Djedi sidebar even when it is not visible. Does it
    get a Djedi outline? Try blanking this node out in the sidebar – it should
    no longer appear when clicking the button, but still be present in the
    sidebar.
  </Node>
);

export default class About extends React.Component {
  state = {
    showText: false,
    showForced: false,
    showForcedManual: false,
  };

  render() {
    const { showText, showForced, showForcedManual } = this.state;

    return (
      <div>
        <Head>
          <title>About us</title>
        </Head>

        <p>
          <Link href={{ pathname: "/" }}>
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
          <button
            type="button"
            onClick={() => {
              this.setState({ showText: !showText });
            }}
          >
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

        <p>
          <button
            type="button"
            onClick={() => {
              this.setState({ showForced: !showForced });
            }}
          >
            {showForced ? "Hide forced node" : "Show forced node"}
          </button>
        </p>
        {showForced && (
          <div style={{ border: "1px solid black" }}>
            <p>{forced}</p>
          </div>
        )}

        <p>
          <button
            type="button"
            onClick={() => {
              this.setState({ showForcedManual: !showForcedManual });
            }}
          >
            {showForcedManual
              ? "Hide manually forced node"
              : "Show manually forced node"}
          </button>
        </p>
        {React.cloneElement(forcedManual, {
          render: state =>
            state.type === "success" &&
            // Only show when non-empty.
            /\S/.test(state.content.props.children) &&
            showForcedManual ? (
              <em>{state.content}</em>
            ) : null,
        })}

        <p>
          Inspect the following element and check its <code>.childNodes</code>{" "}
          property – are there any nodes between the pipes?
        </p>
        <div>
          |<ForceNodes>{forced}</ForceNodes>|
        </div>
      </div>
    );
  }
}
