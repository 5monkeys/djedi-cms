console.log = () ->

$.fn.enable = -> @removeAttr 'disabled'
$.fn.disable = -> @attr 'disabled', 'disabled'


#################################################[  API CLIENT  ]#######################################################
class Client
  baseUrl: '/admin/djedi/cms/'

  constructor: (@baseUrl, @uri) ->

  URL: (path) ->
    @baseUrl + path

  e: (uri) ->
    encodeURIComponent(encodeURIComponent (uri or @uri).valueOf())

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


################################################[  PROGRESSBAR  ]#######################################################
class ProgressBar

  constructor: (el) ->
    @$el = $ el
    @bar = @$el.find '.progress-bar'

  show: ->
    @$el.addClass 'active'
    @$el.show()

  hide: ->
    @$el.hide()
    @$el.removeClass 'active'

  update: (data) ->
    progress = parseInt data.loaded / data.total * 100, 10
    @bar.css width: progress + '%'


################################################[  EDITOR  ]############################################################
class window.Editor

  constructor: (@config) ->
#    console.log 'Editor.constructor', @

    # cms.coffee waits for the 'load' event of the editor iframe (in which this
    # file runs). Then, cms.coffee has access to the jQuery of the editor iframe
    # (and this file) and can attach listeners using it on the editor iframe's
    # `document`, such as the 'page:node:fetch' event. This runs before the
    # 'load' event (but I added a `document.readyState` check just in case), and
    # the 'page:node:fetch' event is fired as soon as the `Client#load` request
    # finishes. If that happens sooner than the 'load' event, cms.coffee won't
    # have had a chance to attach its listeners yet. So we have a race
    # condition. To avoid that, delay initialization here until the 'load' event
    # and then a little bit more to make sure that the 'load' listener in
    # cms.coffee runs before this one.
    if document.readyState == 'complete'
      @initialize @config
    else
      $(window).one 'load', => setTimeout (=> @initialize @config), 0

  initialize: (config) ->
#    console.log 'Editor.initialize'
    @api = new Client window.DJEDI_ENDPOINT
    @$doc = $ document

    @actions =
      discard: $ '#button-discard'
      save: $ '#button-save'
      publish: $ '#button-publish'

    @$form = $ '#form'
    @progressbar = new ProgressBar '#progressbar'
    @$plugin = $ 'header .plugin'
    @$path = $ 'header .uri'
    @$version = $ 'header .version'
    @$flag = $ 'header .flag'

    $('#button-publish').on 'click', @publish
    $('#button-discard').on 'click', @discard

    # Use ajaxForm from downloads
    @$form.ajaxForm
      beforeSubmit: @prepareForm
      success: @onSave

    $('#form input').on 'change', @onFormChange
    $('#form textarea').on 'change', @onFormChange
    $('#form select').on 'change', @onFormChange
    @$doc.on 'form:change', @onFormChange

    @$doc.ajaxStart -> $('#spinner').toggleClass('icon-spin').show()
    @$doc.ajaxStop -> $('#spinner').toggleClass('icon-spin').hide()

    @api.load config.uri, @onLoad
    @callback 'initialize', config
    @initialized = yes

  callback: (name, args...) ->
    callback = @config[name]
    if callback
      callback.apply @, args

  delay: (time, func) -> setTimeout func, time

  trigger: (eventType, params...) ->
    console.log 'Editor.trigger', eventType
    @$doc.trigger eventType, params

  triggerRender: (content) ->
    @trigger 'node:render', @node.uri.valueOf(), content

  prepareForm: ->

  onLoad: (node) =>
    console.log 'Editor.onLoad()', node.uri
    initial = @node == undefined

    # Fetch default node data from embedder
    if initial
      @trigger 'page:node:fetch', node.uri.valueOf(), (node) =>
        console.log 'Editor.inititial data', node
        @initial = node

    node = @setNode node

    # Notify embedder that plugin is loaded
    if initial
#      @delay 100, => @trigger 'plugin:loaded', node.uri.valueOf()
      @trigger 'plugin:loaded', node.uri.valueOf()

    @render node
#    @trigger 'node:render', node.uri.valueOf(), node.content or ''
    @delay 0, => @trigger 'node:render', node.uri.valueOf(), node.content or ''
    console.log 'content', node.content or ''

  onFormChange: (event) =>
    console.log 'Editor.onFormChange()'
    @setState 'dirty'
    @callback 'onFormChange', event

  onSave: (node) =>
    console.log 'Editor.onSave()'
    node = @setNode node
    @render node
    @trigger 'node:render', node.uri.valueOf(), node.content

  setNode: (node) ->
    console.log 'Editor.setNode()'
    @node = node
    @node.uri = node.uri.to_uri()

    # Prepare uri and determine editor state
    if node.uri.version == 'draft'
      @setState 'draft'
    else
      if not node.uri.version
        @setState 'new'
      else
        @setState 'published'

    if @node.data is null
      @trigger 'page:node:fetch', @node.uri.valueOf(), (node) =>
        @node.data = node.data
        @node.content = @renderContent node.data

    @renderHeader @node
    @renderRevisions()

    @node

  setState: (state) ->
    console.log 'Editor.setState()', state
    if state != @state
      @state = state
      @$version.removeClass 'label-default label-warning label-danger label-info label-success'
      switch state
        when 'new'
          @$version.addClass 'label-default'
          @actions.discard.disable()
          @actions.save.enable()
          @actions.publish.disable()
        when 'dirty'
          @$version.addClass 'label-danger'
          @actions.discard.enable()
          @actions.save.enable()
          @actions.publish.disable()
        when 'draft'
          @$version.addClass 'label-primary'
          @actions.discard.enable()
          @actions.save.disable()
          @actions.publish.enable()
        when 'published'
          @$version.addClass 'label-success'
          @actions.discard.disable()
          @actions.save.disable()
          @actions.publish.disable()
        when 'revert'
          @$version.addClass 'label-warning'
          @actions.discard.disable()
          @actions.save.disable()
          @actions.publish.enable()

  renderHeader: (node) ->
    uri = node.uri
    color = (uri.ext[0].toUpperCase().charCodeAt() - 65) % 5 + 1

    parts = (part[0].toUpperCase() + part[1..-1] for part in uri.path.split '/')
    path = parts.join " <span class=\"plugin-fg-#{color}\">/</span> "

    lang = uri.namespace.split('-')[0] if uri.scheme == 'i18n'

    @$plugin.html(uri.ext).addClass "plugin-fg-#{color}"
    @$path.html path
    @$flag.addClass "flag-#{lang}"

    v = @$version.find 'var'
    v.html @versionLabel uri.version

    @

  versionLabel: (version) ->
    if not version
      return 'default'
    else if not isNaN parseInt(version, 10)
      return "v#{version}"
    else
      return version

  renderRevisions: ->
    console.log 'Editor.renderRevisions()'
    # Load revisions
    baseUri = @node.uri.valueOf().to_uri()
    baseUri.version = null
    baseUri = baseUri.valueOf()
    @revisions = @api.revisions baseUri.valueOf()

    # Reset revision menu
    $('#revisions a').off 'click'
    $menu = $('#revisions').empty()

    # Add default "revision"
    if @initial?
      @revisions.splice 0, 0, [baseUri, no]

    # Render revision menu items
    for [uri, published] in @revisions
      uri = uri.to_uri()

      $li = $ '<li>'
      $link = $ "<a href=\"#\">#{@versionLabel uri.version}</a>"
      $link.data
        'uri': uri
        'published': published

      if published
        $li.addClass 'published'
        $link.append ' <i class=\"icon-cloud\"></i>'
      else if uri.version == 'draft'
        $li.addClass 'draft'

      $li.append $link
      $menu.append $li

    $('#revisions a').on 'click', @loadRevision

  render: (node) ->
    console.log 'Editor.render()'
    @callback 'render', node
#    $('#editor').fadeIn 150

  loadRevision: (event) =>
    console.log 'Editor.loadRevision()'
    event.preventDefault()

    $revision = $ event.target
    uri = $revision.data('uri')
    published = $revision.data 'published'

    if uri.version
      @api.load uri.valueOf(), (node) =>
        @onLoad node
        if not published and @node.uri.version != 'draft'
          @setState 'revert'
    else
      data = @initial.data or ''
      @renderContent data, yes, (content) =>
        @node.uri = uri.valueOf()
        @node.data = data
        @node.content = content
        @onLoad @node

  renderContent: (data, doTrigger, callback) ->
    console.log 'Editor.renderContent()'
    plugin = @node.uri.ext
    data = {data: data} if typeof(data) == 'string'
    content = ''

    if callback
      @api.render plugin, data, (content) =>
        if doTrigger
          @trigger 'node:render', @node.uri.valueOf(), content
        callback content if callback

    else
      content = @api.render plugin, data
      if doTrigger
        @trigger 'node:render', @node.uri.valueOf(), content

    content

  publish: =>
    node = @api.publish @node.uri.valueOf()
    @setNode node
    @setState 'published'

  discard: =>
    if @node.uri.version == 'draft'
      @api.delete @node.uri.valueOf()

    uri = @node.uri
    uri.version = null
    @node = null

    @api.load uri.valueOf(), @onLoad
