import PropTypes from "prop-types";
import React from "react";
import dedent from "dedent";

import djedi from "./djedi";

const propTypes = {
  uri: PropTypes.string.isRequired,
  children: PropTypes.string, // Yes, a *string*!
  edit: PropTypes.bool,
  render: PropTypes.func,
  // ...kwargs: {[key: string]: string}.
};

const defaultProps = {
  edit: true,
  children: undefined,
  render: undefined,
};

export default class Node extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      node: undefined,
    };

    // Must be done in the constructor rather than `componentDidMount` because
    // of server-side rendering.
    this._get();
  }

  componentDidMount() {
    djedi.reportRenderedNode({
      uri: this.props.uri,
      value: this._getDefault(),
    });
  }

  componentDidUpdate(prevProps) {
    if (this.props.uri !== prevProps.uri) {
      this._get();
      djedi.reportRemovedNode(prevProps.uri);
      djedi.reportRenderedNode({
        uri: this.props.uri,
        value: this._getDefault(),
      });
    }

    if (
      this.props.uri === prevProps.uri &&
      this.props.children !== prevProps.children
    ) {
      console.error(
        "djedi-react: Changing the default value of a node is not supported.",
        { prev: prevProps.children, next: this.props.children }
      );
    }
  }

  componentWillUnmount() {
    djedi.reportRemovedNode(this.props.uri);
  }

  _get() {
    djedi.getBatched(
      { uri: this.props.uri, value: this._getDefault() },
      node => {
        this.setState({ node });
      }
    );
  }

  _getDefault() {
    const { children } = this.props;
    return children == null ? undefined : dedent(children);
  }

  render() {
    const {
      uri,
      children,
      edit,
      // Using a destructuring default rather than `defaultProps` for `render`,
      // since `djedi.options` may change.
      render = djedi.options.defaultRender,
      ...kwargs
    } = this.props;
    const { node } = this.state;

    if (node == null) {
      return render({ type: "loading" });
    }

    if (node instanceof Error) {
      return render({ type: "error", error: node });
    }

    if (node.value == null) {
      return render({ type: "missing" });
    }

    const value = interpolate(node.value, kwargs);
    const element = djedi.element(node.uri);

    const content = edit ? (
      <element.tag
        {...element.attributes}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    ) : (
      // WARNING: It’s not possible to render HTML without a wrapper element in
      // React. So you can’t do `edit={false}` and expect the node value to be
      // treated as HTML.
      value
    );

    return render({ type: "success", content });
  }
}

Node.propTypes = propTypes;
Node.defaultProps = defaultProps;

// This intentionally only supports `{key}`, not any of the fancy Python string
// formatting extras. If `key` maps to a string in `kwargs`, that string is
// inserted. Otherwise it is kept as-is. No escaping, no nothing. KISS and
// YAGNI. If somebody does want fancy extras, they can do it themselves before
// putting the value in `kwargs`.
function interpolate(string, kwargs) {
  return string.replace(/\{([^{}\s]+)\}/g, (match, key) => {
    const value = kwargs[key];
    return typeof value === "string" ? value : match;
  });
}
