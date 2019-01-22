import PropTypes from "prop-types";
import React from "react";

import Node from "./Node";

const ERROR_MESSAGE =
  "djedi-react: <ForceNodes> children must be <Node> elements, or (nested) arrays/objects of <Node> elements.";

ForceNodes.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.element.isRequired,
    PropTypes.array.isRequired,
    PropTypes.object.isRequired,
  ]).isRequired,
};

export default function ForceNodes({ children }) {
  return render(children);
}

function render(item, key = undefined) {
  if (React.isValidElement(item)) {
    if (item.type !== Node) {
      throw new TypeError(ERROR_MESSAGE);
    }
    return React.cloneElement(item, { key, render: () => null });
  }

  if (Array.isArray(item)) {
    return item.map(render);
  }

  if (typeof item === "object" && item != null) {
    return Object.keys(item).map(key2 => render(item[key2], key2));
  }

  throw new TypeError(ERROR_MESSAGE);
}
