export function parseUri(uri, separators) {
  const [scheme, rest1] = takeLeft(uri, separators.scheme);
  const [namespace, rest2] = takeLeft(rest1, separators.namespace);
  const [rest3, version] = takeRight(rest2, separators.version);
  const [path, ext] = takeRight(rest3, separators.ext);
  return { scheme, namespace, path, ext, version };
}

export function stringifyUri(uriObject, separators) {
  return []
    .concat(
      ...[
        [uriObject.scheme, separators.scheme],
        [uriObject.namespace, separators.namespace],
        [uriObject.path, separators.path],
        [uriObject.ext, separators.ext],
        [uriObject.version, separators.version],
      ].filter(([part]) => part !== "")
    )
    .join("");
}

export function applyUriDefaults(uriObject, defaults, namespaceByScheme) {
  const defaulted = { ...defaults, ...uriObject };
  const namespace = namespaceByScheme[defaulted.scheme];
  const namespaced =
    namespace != null && uriObject.namespace === ""
      ? { ...defaulted, namespace }
      : defaulted;
  return namespaced;
}

function takeLeft(string, separator) {
  const index = string.indexOf(separator);
  return index === -1
    ? ["", string]
    : [string.slice(0, index), string.slice(index + separator.length)];
}

function takeRight(string, separator) {
  const index = string.lastIndexOf(separator);
  return index === -1
    ? [string, ""]
    : [string.slice(0, index), string.slice(index + separator.length)];
}
