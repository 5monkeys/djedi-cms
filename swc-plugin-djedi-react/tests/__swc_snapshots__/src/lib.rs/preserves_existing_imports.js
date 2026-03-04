import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "test",
    value: "Hello"
});
import React from "react";
import { Node } from "djedi-react";
<Node uri="test">Hello</Node>;
