import { Node, djedi } from "djedi-react";
import PropTypes from "prop-types";
import React from "react";

export default function Toplist() {
  return (
    <Node
      uri="Toplist/toplist"
      // `edit={false}` makes `state.content` a string instead of a <span>.
      edit={false}
      // Use a custom render function to parse the node content into a list, so
      // it can be passed to the `<ReversibleList>` component.
      render={state => {
        if (state.type !== "success") {
          return djedi.options.defaultRender(state);
        }

        const items = state.content
          .split("\n")
          .map(line => line.trim())
          .filter(line => line !== "");

        return items.length === 0 ? null : <ReversibleList items={items} />;
      }}
    >{`
      Python
      JavaScript
      CSS
      HTML
    `}</Node>
  );
}

class ReversibleList extends React.Component {
  static propTypes = {
    items: PropTypes.arrayOf(PropTypes.string.isRequired).isRequired,
  };

  state = {
    reversed: false,
  };

  toggleReversed = () => {
    this.setState(state => ({ reversed: !state.reversed }));
  };

  render() {
    const items = this.state.reversed
      ? this.props.items.slice().reverse()
      : this.props.items;

    return (
      <ol onClick={this.toggleReversed}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ol>
    );
  }
}
