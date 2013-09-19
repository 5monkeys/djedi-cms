partition = (str, delimiter) ->
  s = str.split(delimiter)
  [s[0], delimiter, s[1]]


rpartition = (str, delimiter) ->
  s = str.split(delimiter).reverse()
  [s[1], delimiter, s[0]]


String::to_uri = ->
  @render = ->
    s = ''
    s += @scheme + '://' if @scheme
    s += @namespace + '@' if @namespace
    s += @path
    s += '.' + @ext if @ext
    s += '#' + @version if @version
    s #@scheme + '://' + @namespace + '@' + @path + '.' + @ext + '#' + @version

  @valueOf = ->
    @render()

  @from_parts = (obj) ->
    @scheme = obj.scheme #or 'i18n'
    @namespace = obj.namespace
    @path = obj.path
    @ext = obj.ext
    @version = obj.version

    @parts =
      scheme: @scheme
      namespace: @namespace
      path: @path
      ext: @ext
      version: @version

  @parse = (uri_str) ->
    [base, _, version] = partition(uri_str, '#')
    [scheme, _, path] = rpartition(base, '://')
    [namespace, _, path] = rpartition(path, '@')
    [path, _, ext] = partition(path, '.')

    scheme: scheme or null
    namespace: namespace or null
    path: path
    ext: ext or null
    version: version or null

  @from_str = (uri_str) ->
    @from_parts @parse uri_str

  @clone = (obj) ->
    @from_parts _.extend(obj, @parts)

  @from_parts @parse @
  @
