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
        [uriObject.path, ""],
      ].filter(([part]) => part !== ""),
      ...[
        [separators.ext, uriObject.ext],
        [separators.version, uriObject.version],
      ].filter(([, part]) => part !== "")
    )
    .join("");
}

const PLACEHOLDER = /^\{(\w+)\}$/;

export function applyUriDefaults(
  uriObject,
  defaults,
  namespaceByScheme,
  placeholders
) {
  const defaulted = Object.keys(uriObject).reduce(
    (result, key) => {
      result[key] = uriObject[key] === "" ? defaults[key] : uriObject[key];
      return result;
    },
    { ...defaults }
  );
  const namespace = namespaceByScheme[defaulted.scheme];
  const namespaced =
    namespace != null && uriObject.namespace === ""
      ? {
          ...defaulted,
          namespace: namespace.replace(
            PLACEHOLDER,
            (match, name) => placeholders[name] || match
          ),
        }
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
