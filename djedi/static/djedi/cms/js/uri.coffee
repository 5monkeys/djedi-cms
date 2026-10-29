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
    s += '?' + @stringify_query(@query) if @query
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
    @query = obj.query

    @parts =
      scheme: @scheme
      namespace: @namespace
      path: @path
      ext: @ext
      version: @version
      query: @query

  @parse = (uri_str) ->
    [base, _, version] = partition(uri_str, '#')
    if base.indexOf('?') != -1
      [base, _, querystring] = rpartition(base,'?')
      param_pairs = querystring.split('&')
      query = {}
      for pair in param_pairs
         [key, _, val] = partition(pair, '=')
         if !query[key] or query[key].length == 0
          query[key] = [decodeURIComponent(val)]
    [scheme, _, path] = rpartition(base, '://')
    [namespace, _, path] = rpartition(path, '@')
    [path, _, ext] = partition(path, '.')

    scheme: scheme or null
    namespace: namespace or null
    path: path
    ext: ext or null
    version: version or null
    query: query or null


  @from_str = (uri_str) ->
    @from_parts @parse uri_str

  @clone = (obj) ->
    parts = Object.assign({}, @parts)
    _uri = ((' ' + @valueOf()).slice(1)).to_uri()
    for key, val of obj
      parts[key] = val
    _uri.from_parts(parts)
    return _uri

  @stringify_query = (query) ->
    simplified_query = {}
    for key, arr of @query
      simplified_query[key] = arr[0]
    return $.param(simplified_query)

  @get_query_param = (key) ->
    if @query and @query[key] and @query[key].length > 0
      return @query[key][0]
    else
      return undefined

  @from_parts @parse @
  @
