import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "foo",
    value: "simple template literal"
});
<Node uri="foo">{`simple template literal`}</Node>;
