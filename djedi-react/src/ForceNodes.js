import PropTypes from "prop-types";
import React from "react";

import Node from "./Node";

ForceNodes.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function ForceNodes({ children }) {
  return React.Children.map(children, child => {
    if (child == null || child.type !== Node) {
      throw new TypeError(
        "djedi-react: <ForceNodes> only accepts <Node>s as children."
      );
    }
    return React.cloneElement(child, { render: () => null });
  });
}
