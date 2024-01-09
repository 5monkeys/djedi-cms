import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "foo",
    value: null
});
<Node uri="foo">{tag`hello world`}</Node>;
