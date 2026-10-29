import { sanitize } from "isomorphic-dompurify";
import PropTypes from "prop-types";
import React from "react";

import djedi from "./djedi";

const POTENTIAL_HTML = /[<&]/;

export const NodeContext = React.createContext();

const propTypes = {
  uri: PropTypes.string.isRequired,
  children: PropTypes.string, // Yes, a *string*!
  edit: PropTypes.bool,
  render: PropTypes.func,
  // ...variables: {[string]: any}.
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

    this.language = djedi.options.languages.default;
    this.lastLanguage = this.language;
    this.firstRender = true;
    this.mounted = false;
  }

  componentDidMount() {
    this._updateLanguage();
    this.lastLanguage = this.language;

    this.mounted = true;

    djedi.reportRenderedNode(
      {
        uri: this.props.uri,
        value: this._getDefault(),
      },
      { language: this.language }
    );
  }

  componentDidUpdate(prevProps) {
    this._updateLanguage();

    if (
      this.props.uri !== prevProps.uri ||
      this.language !== this.lastLanguage
    ) {
      this._get();
      djedi.reportRemovedNode(prevProps.uri, {
        language: this.lastLanguage,
      });
      djedi.reportRenderedNode(
        {
          uri: this.props.uri,
          value: this._getDefault(),
        },
        { language: this.language }
      );
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

    this.lastLanguage = this.language;
  }

  componentWillUnmount() {
    this.mounted = false;
    djedi.reportRemovedNode(this.props.uri, { language: this.language });
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
      },
      { language: this.language }
    );
  }

  _getDefault() {
    const { children } = this.props;
    return children == null ? undefined : String(children);
  }

  _updateLanguage() {
    this.language =
      this.context == null ? djedi.options.languages.default : this.context;
  }

  render() {
    // The following cannot be done in `componentDidMount` because of
    // server-side rendering. This used to be done in `constructor`, but that
    // doesn't work since `this.context` isn't available yet.
    //
    // In React’s StrictMode/ConcurrentMode, components may be instantiated
    // multiple times, which means that `this._get()` might be called several
    // times for a single `<Node>`. It doesn’t matter though, because it does
    // not cause any extra fetching. And the callback (in `this._get`) will just
    // do `this.state.node = node` (`this.mounted` stays `false`) on a dead
    // instance which should be harmless (and not cause any extra rendering or
    // so).
    if (this.firstRender) {
      this._updateLanguage();
      this.lastLanguage = this.language;
      this.firstRender = false;
      this._get();
    }

    const {
      uri,
      children,
      edit,
      // Using a destructuring default rather than `defaultProps` for `render`,
      // since `djedi.options` may change.
      render = djedi.options.defaultRender,
      // Make sure to destructure all props above (even ones unused in this
      // method) so that `variables` only contains non-props.
      ...unsafeUnsanitizedVariables
    } = this.props;
    const { node } = this.state;
    const { language } = this;

    if (node == null) {
      return render({ type: "loading" }, { language });
    }

    if (node instanceof Error) {
      return render({ type: "error", error: node }, { language });
    }

    // XXX: To prevent XSS injections we need to sanitize the passed variables.
    const variables = Object.fromEntries(
      Object.entries(unsafeUnsanitizedVariables).map(([key, value]) => [
        key,
        sanitize(value),
      ])
    );

    // If there’s neither a default value nor a database value, `node.value`
    // will be `null`.
    const value = interpolate(node.value || "", variables);
    const element = djedi.element(node.uri);

    // This is mostly to make the test snapshots easier to read. Might be faster
    // not using `dangerouslySetInnerHTML` unnecessarily, too.
    const hasHtml = POTENTIAL_HTML.test(value);

    const content = edit ? (
      hasHtml ? (
        <element.tag
          {...element.attributes}
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        <element.tag {...element.attributes}>{value}</element.tag>
      )
    ) : (
      // NOTE: It’s not possible to render HTML without a wrapper element in
      // React. So you can’t do `edit={false}` and expect the node value to be
      // treated as HTML.
      value
    );

    return render({ type: "success", content }, { language });
  }
}

Node.propTypes = propTypes;
Node.defaultProps = defaultProps;
Node.contextType = NodeContext;

const INNER = /[^{}[\]\s]+/.source;
const INTERPOLATION_REGEX = RegExp(`\\{${INNER}\\}|\\[${INNER}\\]`, "g");

/*
This intentionally only supports `{key}`, not any of the fancy Python string
formatting extras. If `key` maps to a string in `variables`, that string is
inserted. Otherwise it is kept as-is. No escaping, no nothing. KISS and
YAGNI. If somebody does want fancy extras, they can do it themselves before
putting the value in `variables`.

Also support `[key]`, since `{foo}` is already used in JSX syntax:

    const user = "Bob"
    <Node uri="test">Hello, {user}!</Node>
    <Node uri="test">Hello, [user]!</Node>
    <Node uri="test">{`Hello, {user}!`}</Node>
*/
function interpolate(string, variables) {
  return string.replace(INTERPOLATION_REGEX, match => {
    const key = match.slice(1, -1);
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match;
  });
}
