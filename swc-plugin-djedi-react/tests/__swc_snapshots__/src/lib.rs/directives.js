"use strict";
import { djedi as djedi } from "djedi-react";
djedi.reportPrefetchableNode({
    uri: "foo",
    value: "default value"
});
<Node uri="foo">default value</Node>;
