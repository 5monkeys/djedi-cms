import { Node } from "djedi-react";
import React from "react";

export default function Search() {
  return (
    <Node
      uri="Search/placeholder"
      // `edit={false}` makes `state.content` a string instead of a <span>.
      edit={false}
      // Use a custom render function to put the node content in the
      // `placeholder` attribute. `<input placeholder={<Node uri="..."/>}` />`
      // won’t work because `<Tag>` always returns an object in React.
      render={state => (
        <input
          type="search"
          // Ignore loading and error states and show the content if available.
          placeholder={state.type === "success" ? state.content : ""}
        />
      )}
    >
      Search
    </Node>
  );
}
