export default function djediMdTag(literals, ...interpolations) {
  if (interpolations.length > 0) {
    console.warn(
      // eslint-disable-next-line no-template-curly-in-string
      "djedi-react: Using `${foo}` in a node default value is an anti-pattern: it won't work if the user edits the node. For consistency, your interpolations will be ignored. Did you mean to use `{foo}` (without the `$`) or `[foo]`?"
    );
  }

  return literals.join("");
}
