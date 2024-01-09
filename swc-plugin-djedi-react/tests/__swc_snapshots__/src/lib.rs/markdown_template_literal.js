import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "foo",
    value: "**Markdown**"
});
<Node uri="foo">{md`**Markdown**`}</Node>;
