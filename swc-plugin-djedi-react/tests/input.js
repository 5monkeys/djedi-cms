/* eslint-disable no-undef, react/jsx-no-undef */
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
      <Node uri="simple" {...variables} />

      <h2>nope uri</h2>
      <Node uri={"nope".toUpperCase()} />
      <Node uri={`template literal with interpolation ${nope}`} />
      <Node uri={nope`tagged template literal`} />
      <Node uri={nope} />
      <Node uri={nope}>default</Node>

      <h2>ok children</h2>
      <Node uri="ok 1">simple</Node>
      <Node uri="ok 2">{"string literal"}</Node>
      <Node uri="ok 3">{'single quotes "'}</Node>
      <Node uri="ok 4">{`simple template literal`}</Node>
      <Node uri="ok 5">{md`
        # markdown

        example
      `}</Node>
      <Node uri="ok 6">
        simple jsx text on its own line (parses differently)
      </Node>
      <Node uri="ok 7">
        {`simple template literal on its own line (parses differently)`}
      </Node>

      <h2>nope children</h2>
      <Node uri="nope 1">{nope`non-md tagged template literal`}</Node>
      <Node uri="nope 2">{nope}</Node>

      <h2>non-Nodes</h2>
      <node uri="simple" />
      <TreeNode uri="simple" />

      <div>
        {link("previous")}
        {link("next")}
      </div>
    </div>
  );
}
