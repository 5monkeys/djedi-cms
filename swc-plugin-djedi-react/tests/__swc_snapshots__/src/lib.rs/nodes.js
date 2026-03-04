"use client";
import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "intro",
    value: "[project] is a cool CMS"
});
djedi.reportPrefetchableNode({
    uri: "en-us@link.txt",
    value: "[text]"
});
djedi.reportPrefetchableNode({
    uri: "simple",
    value: null
});
djedi.reportPrefetchableNode({
    uri: "string literal",
    value: null
});
djedi.reportPrefetchableNode({
    uri: 'single quotes "',
    value: null
});
djedi.reportPrefetchableNode({
    uri: "simple template literal",
    value: null
});
djedi.reportPrefetchableNode({
    uri: "simple",
    value: null
});
djedi.reportPrefetchableNode({
    uri: "ok 1",
    value: "simple"
});
djedi.reportPrefetchableNode({
    uri: "ok 2",
    value: "string literal"
});
djedi.reportPrefetchableNode({
    uri: "ok 3",
    value: 'single quotes "'
});
djedi.reportPrefetchableNode({
    uri: "ok 4",
    value: "simple template literal"
});
djedi.reportPrefetchableNode({
    uri: "ok 5",
    value: "<h1>markdown</h1>\n<p>example</p>"
});
djedi.reportPrefetchableNode({
    uri: "test/text.md",
    value: '<a href="./Cargo.toml">Cargo.toml,</a>\n<a href="./Cargo.lock">Cargo.lock,</a>'
});
djedi.reportPrefetchableNode({
    uri: "test/search.md",
    value: '<a href="https://www.google.com">Google,</a>\n<a href="https://www.bing.com">Bing</a>'
});
djedi.reportPrefetchableNode({
    uri: "ok 6",
    value: "simple jsx text on its own line (parses differently)"
});
djedi.reportPrefetchableNode({
    uri: "ok 7",
    value: "simple template literal on its own line (parses differently)"
});
djedi.reportPrefetchableNode({
    uri: "nope 1",
    value: null
});
djedi.reportPrefetchableNode({
    uri: "nope 2",
    value: null
});
/* eslint-disable no-undef, react/jsx-no-undef */ import { Node, djedi as djedi1, md } from "djedi-react";
import React from "react";
djedi1.options.baseUrl = "/api";
const _djedi = "djedi";
const intro = <Node uri="intro" project={_djedi}>
    [project] is a cool CMS
  </Node>;
export default function Home() {
    const link = (text)=><a href={`?page=${text}`}>
      <Node uri="en-us@link.txt" text={text}>
        [text]
      </Node>
    </a>;
    return <div>
      {intro}

      <h2>ok uri</h2>
      <Node uri="simple"/>
      <Node uri={"string literal"}/>
      <Node uri={'single quotes "'}/>
      <Node uri={`simple template literal`}/>
      <Node uri="simple" {...variables}/>

      <h2>nope uri</h2>
      <Node uri={"nope".toUpperCase()}/>
      <Node uri={`template literal with interpolation ${nope}`}/>
      <Node uri={nope`tagged template literal`}/>
      <Node uri={nope}/>
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
      <Node uri="test/text.md">{md`
        [Cargo.toml,](./Cargo.toml)
        [Cargo.lock,](./Cargo.lock)
      `}</Node>
      <Node uri="test/search.md">{md`
        [Google,](https://www.google.com)
        [Bing](https://www.bing.com)
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
      <node uri="simple"/>
      <TreeNode uri="simple"/>

      <div>
        {link("previous")}
        {link("next")}
      </div>
    </div>;
}
