import PropTypes from "prop-types";
import React from "react";
import dedent from "dedent";

import djedi from "./djedi";

const POTENTIAL_HTML = /[<&]/;

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

    this.mounted = false;

    // Must be done in the constructor rather than `componentDidMount` because
    // of server-side rendering.
    this._get();
  }

  componentDidMount() {
    this.mounted = true;
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
    this.mounted = false;
    djedi.reportRemovedNode(this.props.uri);
  }

  _get() {
    djedi.getBatched(
      { uri: this.props.uri, value: this._getDefault() },
      node => {
        if (this.mounted) {
          this.setState({ node });
        } else {
          // If the node already exists in cache, this callback is called
          // immediately (synchronously). If this happens in the `_get()` call in
          // `constructor`, where it is not allowed to call `setState`, mutate
          // `this.state` directly instead (which is fine in the `constructor`).
          // eslint-disable-next-line react/no-direct-mutation-state
          this.state.node = node;
        }
      }
    );
  }

  _getDefault() {
    const { children } = this.props;
    return children == null ? undefined : dedent(String(children));
  }

  render() {
    const {
      uri,
      children,
      edit,
      // Using a destructuring default rather than `defaultProps` for `render`,
      // since `djedi.options` may change.
      render = djedi.options.defaultRender,
      // Make sure to destructure all props above (even ones unused in this
      // method) so that `kwargs` only contains non-props.
      ...kwargs
    } = this.props;
    const { node } = this.state;

    if (node == null) {
      return render({ type: "loading" });
    }

    if (node instanceof Error) {
      return render({ type: "error", error: node });
    }

    const value = interpolate(node.value || "", kwargs);
    const element = djedi.element(node.uri);

    // This is mostly to make the test snapshots easier to read. Might be faster
    // not using `dangerouslySetInnerHTML` unnecessarily, too.
    const hasHtml = POTENTIAL_HTML.test(value);

    const content = edit ? (
      <element.tag
        {...element.attributes}
        dangerouslySetInnerHTML={hasHtml ? { __html: value } : undefined}
      >
        {hasHtml ? undefined : value}
      </element.tag>
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

const INNER = /[^{}[\]\s]+/.source;
const INTERPOLATION_REGEX = RegExp(`\\{${INNER}\\}|\\[${INNER}\\]`, "g");

/*
This intentionally only supports `{key}`, not any of the fancy Python string
formatting extras. If `key` maps to a string in `kwargs`, that string is
inserted. Otherwise it is kept as-is. No escaping, no nothing. KISS and
YAGNI. If somebody does want fancy extras, they can do it themselves before
putting the value in `kwargs`.

Also support `[key]`, since `{foo}` is already used in JSX syntax:

    const user = "Bob"
    <Node uri="test">Hello, {user}!</Node>
    <Node uri="test">Hello, [user]!</Node>
    <Node uri="test">{`Hello, {user}!`}</Node>
*/
function interpolate(string, kwargs) {
  return string.replace(INTERPOLATION_REGEX, match => {
    const key = match.slice(1, -1);
    return Object.prototype.hasOwnProperty.call(kwargs, key)
      ? kwargs[key]
      : match;
  });
}
