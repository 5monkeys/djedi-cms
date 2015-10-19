#################################################[  API CLIENT  ]#######################################################
class window.Client
  baseUrl: '/admin/djedi/cms/'

  constructor: (@baseUrl, @uri) ->

  URL: (path) ->
    @baseUrl + path

  e: (uri) ->
    encodeURIComponent(encodeURIComponent (uri or @uri or '').valueOf())

  AJAX: (method, path, data, callback) ->
    if callback?
      $.ajax
        type: method
        url: @URL(path)
        data: data
        success: (data, textStatus, jqXHR) ->
          callback data
    else
      response = $.ajax(type: method, url: @URL(path), data: data, async: false)
      if response.status == 200 then response.responseText else undefined

  GET: (path, callback) ->
    @AJAX "GET", path, null, callback

  GET_JSON: (path, callback) ->
    if callback?
      @GET path, callback
    else
      if r=@GET(path) then JSON.parse r else undefined

  POST: (path, data, callback) ->
    @AJAX "POST", path, data, callback

  PUT: (path, data, callback) ->
    @AJAX "PUT", path, data, callback

  DELETE: (path, callback) ->
    @AJAX "DELETE", path, null, callback

  # --------------------------------------------------------

  get: (uri, callback) ->
    @GET_JSON "node/#{@e(uri)}", callback

  editor: (uri, callback) ->
    @GET "node/#{@e(uri)}/editor", callback

  set: (uri, data, callback) ->
    response = @POST "node/#{@e(uri)}", data, callback
    if not callback
      return JSON.parse response

  publish: (uri, callback) ->
    JSON.parse @PUT "node/#{@e(uri)}/publish", callback

  revisions: (uri, callback) ->
    @GET_JSON "node/#{@e(uri)}/revisions", callback

  delete: (uri, callback) ->
    @DELETE "node/#{@e(uri)}", callback

  load: (uri, callback) ->
    @GET_JSON "node/#{@e(uri)}/load", callback

  render: (ext, data, callback) ->
    @POST "plugin/"+ext, data, callback

  search: (uri, callback) ->
    @GET_JSON "search/#{@e(uri)}", callback
