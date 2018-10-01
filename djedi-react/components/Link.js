import { NodeContext } from "djedi-react";
import NextLink from "next/link";
import PropTypes from "prop-types";
import React from "react";

// This component is just like "next/link" except it maintains the `?language`
// query parameter.

Link.propTypes = {
  ...NextLink.propTypes,
  // This version of `<Link>` only supports object hrefs.
  href: PropTypes.object.isRequired,
};
Link.defaultProps = NextLink.defaultProps;

export default function Link({ href, ...props }) {
  return (
    <NodeContext.Consumer>
      {language => (
        <NextLink
          {...props}
          href={{
            ...href,
            query: {
              language,
              ...href.query,
            },
          }}
        />
      )}
    </NodeContext.Consumer>
  );
}
