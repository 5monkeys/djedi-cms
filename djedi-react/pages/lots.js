import { Node } from "djedi-react";
import Head from "next/head";
import React from "react";

import Link from "../components/Link";

export default class Lots extends React.Component {
  render() {
    return (
      <div>
        <Head>
          <title>Lots of nodes</title>
        </Head>

        <p>
          <Link href={{ pathname: "/" }}>
            <a>Home</a>
          </Link>
        </p>

        {Array.from({ length: 30 }, (_, i) =>
          Array.from({ length: i + 1 }, (_2, j) => (
            <p key={j}>
              <Node uri={`lots${i + 1}/node/${j + 1}`}>Test</Node>
            </p>
          ))
        )}
      </div>
    );
  }
}
