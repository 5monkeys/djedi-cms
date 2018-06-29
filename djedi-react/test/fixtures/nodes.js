/* global nope */
import { Node, djedi, md } from "djedi-react";
import React from "react";

djedi.options.baseUrl = "/api";

const _djedi = "djedi";

const intro = (
  <Node uri="intro" project={_djedi}>
    [project] is a cool CMS
  </Node>
);

export default function Home() {
  // eslint-disable-next-line func-style
  const link = text => (
    <a href={`?page=${text}`}>
      <Node uri="en-us@link.txt" text={text}>
        [text]
      </Node>
    </a>
  );

  return (
    <div>
      {intro}

      <h2>ok uri</h2>
      <Node uri="simple" />
      <Node uri={"string literal"} />
      <Node uri={'single quotes "'} />
      <Node uri={`simple template literal`} />

      <h2>nope uri</h2>
      {/* eslint-disable-next-line react/jsx-no-duplicate-props */}
      <Node uri="overwritten uri" uri />
      <Node uri={"nope".toUpperCase()} />
      <Node uri={`template literal with interpolation ${nope}`} />
      <Node uri={nope`tagged template literal`} />
      <Node uri={nope} />

      <h2>ok children</h2>
      <Node uri="ok 1">simple</Node>
      <Node uri="ok 2">{"string literal"}</Node>
      <Node uri="ok 3">{'single quotes "'}</Node>
      <Node uri="ok 4">{`simple template literal`}</Node>
      <Node uri="ok 5">{md`
        # markdown

        example
      `}</Node>

      <h2>nope children</h2>
      <Node uri="nope 1" children="children prop not supported" />
      <Node uri="nope 2">JSX interpolation {nope}</Node>
      <Node uri="nope 3">{`template literal with interpolation ${nope}`}</Node>
      <Node uri="nope 4">{nope`non-md tagged template literal`}</Node>
      <Node uri="nope 5">{nope}</Node>

      <div>
        {link("previous")}
        {link("next")}
      </div>

      <h2>non-Nodes</h2>
      <node uri="simple" />
      {/* eslint-disable-next-line react/jsx-no-undef */}
      <TreeNode uri="simple" />
    </div>
  );
}
