import PropTypes from "prop-types";
import React from "react";

import Node from "./Node";

const ERROR_MESSAGE =
  "djedi-react: <NodeText> `node` must be a <Node> element.";

NodeText.propTypes = {
  node: PropTypes.element.isRequired,
  children: PropTypes.func.isRequired,
};

export default function NodeText({ node, children }) {
  if (!React.isValidElement(node) || node.type !== Node) {
    throw new TypeError(ERROR_MESSAGE);
  }

  // `edit={false}` makes `<Node>` hand over the node value as a plain string
  // instead of wrapping it in a `<span>`. Rendering the `<Node>` (rather than
  // calling `djedi.get` directly) keeps it reported to the admin sidebar,
  // batched, cached, language aware and picked up by the Babel plugin.
  return React.cloneElement(node, {
    edit: false,
    render: (state, options) =>
      children(state.type === "success" ? state.content : "", state, options),
  });
}
