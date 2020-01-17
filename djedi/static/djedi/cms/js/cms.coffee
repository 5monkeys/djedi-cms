console.log = () ->

################################################[  EVENTS  ]############################################################
Events = $ {}
Events.handler = (event, params...) =>
  console.log 'Event', event.type
  Events.trigger event.type, params


################################################[  SETTINGS  ]##########################################################
class Settings

  keys: []

  constructor: (defaults) ->
    for key, def of defaults
      value = localStorage.getItem key
      if value
        @set key, JSON.parse(value)
      else
        @set key, def

  get: (key) ->
    @[key]

  set: (key, value) ->
    console.log "Settings.set #{key} = #{value}"
    if key not in @keys
        @keys.push key
    @[key] = value
    localStorage.setItem key, value

  toggle: (key) ->
    @set key, not @get key


################################################[  NODE  ]##############################################################
class window.Node

  selected: no

  constructor: (uri, data, container) ->
    @uri = uri.to_uri()
    @data = data
    @$el = $ "span[data-i18n='#{@id()}']", container
    @preview = @$el.length > 0

    # Create node outline
    if @preview
      @$outline = $ '<div class="djedi-node-outline">'
      @$outline.on 'click', @select
      $('body', container).append @render()

    # Whenever an image loads inside a node, re-render its outline. The 'load'
    # event doesn't bubble. jQuery does not support listening in the capture
    # phase, so use vanilla `addEventListener`.
    @$el[0].addEventListener 'load', @render, true if @$el.length > 0

  id: ->
    @uri.namespace + '@' + @uri.path

  getContent: ->
    if @preview then (@$el.html() or '').trim() else ''

  setContent: (content, silent) ->
    if @preview
      content = $($.parseHTML(content)) if typeof content is "string"
      @$el.html content
      @render()

  render: =>
    return unless @preview
    console.log 'Node.render'

    children = @$el.children()
    firstChild = children[0]

    if firstChild
      # Node contains html elements -> Calculate offset/bounds based on child edges
      @bounds =
        top: 0
        left: 0
        right: 0
        bottom: 0

      for child in ($ c for c in children)
        {top, left} = child.offset()
        right = left + child.outerWidth()
        bottom = top + child.outerHeight()

        @bounds.left = left if @bounds.left == 0 or left < @bounds.left
        @bounds.top = top if @bounds.top == 0 or top < @bounds.top
        @bounds.right = right if right > @bounds.right
        @bounds.bottom = bottom if bottom > @bounds.bottom

      @bounds.width = @bounds.right - @bounds.left
      @bounds.height = @bounds.bottom - @bounds.top

    else
      # Node is simple text -> Get offset/bounds
      offset = @$el.offset()
      @bounds =
        left:   offset.left
        top:    offset.top
        width:  @$el.outerWidth(true)
        height: @$el.outerHeight(true)

    # Apply padding to bounds
    padding = 5
    @bounds.left -= padding
    @bounds.top -= padding
    @bounds.width += padding * 2
    @bounds.height += padding * 2

    # Style node outline
    @$outline.css @bounds

#    if @selected
#      b = @bounds
#      $('#djedi-overlay-left').css left: 0, top: 0, width: b.left, height: b.top+b.height
#      $('#djedi-overlay-right').css left: b.left+b.width, top: b.top, right: 400, bottom: 0
#      $('#djedi-overlay-top').css left: b.left, top: 0, right: 400, height: b.top
#      $('#djedi-overlay-bottom').css left: 0, top: b.top+b.height, width: b.left+b.width, bottom: 0

    @$outline

  select: =>
    if @preview
      @selected = yes
      @$outline.addClass 'selected'
      console.log 'select node'
      Events.trigger 'node:edit', @
  #    $('.djedi-overlay').show()
    @

  deselect: ->
    if @preview
      @selected = no
      @$outline.removeClass 'selected'
  #    $('.djedi-overlay').hide()
    @


################################################[  SEARCH  ]############################################################
class Search

  constructor: ->
    @$result = $ '#search-result'

  addNodes: (nodes) ->
    nodes = (node for uri, node of nodes)
    nodes.sort (n1, n2) ->
      if n1.uri.path < n2.uri.path then -1 else 1

    groups = {}

    for node in nodes
      do (node) =>
        uri = node.uri
        color = (uri.ext[0].toUpperCase().charCodeAt() - 65) % 5 + 1

        parts = (
          for part in uri.path.split '/' when part != ''
            (part[..0].toUpperCase() + part[1..-1]).replace /[_-]/g, ' '
        )
        path = parts[1..].join " <span class=\"plugin-fg-#{color}\">/</span> "

        lang = uri.namespace
        lang = lang.split('-')[0] if uri.scheme == 'i18n'

        # Create new group if node path root changed
        root = parts[0]
        if not groups[root]
          $panel = $ """
                     <div class="panel panel-default">
                       <a class="panel-heading accordion-toggle collapsed" data-toggle="collapse" data-parent="#search-result" href="#node-group-#{root.toLowerCase()}">
                         <h4 class="panel-title">
                           <i class="icon-chevron-sign-down"></i> #{root}
                         </h4>
                       </a>
                     </div>
                     """
          $group = $ """
                     <ul id="node-group-#{root.toLowerCase()}" class="panel-collapse collapse list-unstyled">
                     """
          groups[root] = $group
          $panel.append $group
          @$result.append $panel

        # Create node item
        $item = $ """
                  <li class="node-title">
                    <div class="plugin plugin-fg-#{color}">#{uri.ext}</div>
                    <div class="flag flag-#{lang}"></div>
                    <span class="uri">#{path}</span>
                  </li>
                  """

        $item.on 'click', -> Events.trigger 'node:edit', node
        groups[root].append $item


################################################[  PAGE  ]##############################################################
class Page

  constructor: (@window) ->
    @win = window
    @doc = @win.document
    @$doc = $ @doc
    @$el = $ 'html', @doc
    @$cms = $ '#djedi-cms', @doc

    # Initialize nodes/outlines
    @nodes = {}
    for uri, data of @win.DJEDI_NODES
      @nodes[uri] = new Node uri, data, @doc

    Events.on 'node:render', @updateNode
    Events.on 'node:resize', @renderNodes

  updateNode: (event, uri, content) =>
    uri = uri.to_uri()
    uri.version = null
    uri = uri.valueOf()
    @nodes[uri].setContent content
    @renderNodes()

  renderNodes: =>
    node.render() for uri, node of @nodes

  showNodes: ->
    $('.djedi-node-outline', @doc).show()

  hideNodes: ->
    $('.djedi-node-outline', @doc).hide()

  shrink: (width, animated) ->
    @pageWidth = @$el.width()
    style = width: "#{@pageWidth-width}px"
    if animated
      @$el.animate style, 100, => @renderNodes()
    else
      @$el.css style
      @renderNodes()

  unshrink: (animated) ->
    style = width: "#{@pageWidth}px"
    if animated
      @$el.animate style, 100, => @renderNodes()
    else
      @$el.css style
      @renderNodes()


################################################[  PLUGIN  ]############################################################
window.Plugin = class Plugin

  constructor: (@node) ->
    @uri = @node.uri.valueOf()

    # Create iframe
    @$el = $ '<iframe>'
    @$el.attr 'id', 'editor-iframe'
    @$el.one 'load', @connect
    @navigate @uri

  navigate: (uri) ->
    @$el.attr 'src', document.location.pathname + "node/#{encodeURIComponent(encodeURIComponent uri)}/editor"

  connect: =>
    console.log 'Plugin.connect()'
    @window = @$el[0].contentWindow  # Local iframe window

    if not @window.$
      alert 'Failed to load node'
      return

    @$doc = @window.$ @window.document  # Local iframe jQuery document

    # Bind and catch/forward events from plugin
    @$doc.on 'node:render', Events.handler
    @$doc.on 'node:resize', Events.handler
    @$doc.on 'page:node:fetch', (event, uri, callback) => callback data: @node.data, content: @node.getContent()

  close: ->
    @node.deselect()
    @$el.remove()


################################################[  CMS  ]###############################################################
class CMS

  constructor: ->
    @$body = $ 'body'
    @panels =
      editor: $ '#editor-panel'
      settings: $ '#settings-panel'

    @settings = new Settings
      livePreview:  no
      showOutlines: no
      panelIsOpen:  no

    @search = new Search

    # Set embed mode and initialize nodes from page
    if window.parent != window
      @embed()

    Events.on 'node:edit', @openEditor
    $('#brand').on 'click', @toggleOpen

  embed: ->
    @$body.addClass 'embedded'
    @embedded = yes

    # Connect page embedding cms
    @page = new Page window.parent
    @width = @page.$cms.width()

    # Fill search with nodes
    @search.addNodes @page.nodes

    # Listen to nav tab events
    $('#tab-close').removeClass('hide').on 'click', @toggleOpen
    $('#fullscreen').removeClass('hide').on 'click', @toggleFullscreen

    # Add embed inner shadow effect
    @$body.append $ '<div class="embed-shadow">'

    @openPanel 'search'

    # Open/close panel
    if @settings.panelIsOpen then @open() else @close()

  openEditor: (event, node) =>
    @plugin.close() if @plugin
    @plugin = new Plugin node
    @panels.editor.append @plugin.$el
    @openPanel 'editor'

  openPanel: (name) ->
    $("header nav a[href=\"##{name}-panel\"]").tab 'show'

  isClosed: ->
    @page.$cms.hasClass 'closed'

  toggleFullscreen: (event) =>
    event.preventDefault()
    $icon = $ '#fullscreen i'
    $icon.toggleClass 'icon-resize-full icon-resize-small'
    @page.$cms.toggleClass 'fullscreen'
    @$body.toggleClass 'embedded'

  toggleOpen: (event) =>
    event.preventDefault()
    if @embedded
      @page.$cms.animate {right: "-#{@width}px"}, 100, =>
        if @isClosed() then @open(yes) else @close(yes)

  open: (animate) ->
    @page.shrink @width, animate
    @css {height: '100%'}
    @css {right: 0}, animate
    @page.$cms.removeClass 'closed'
    @$body.removeClass 'closed'
    @$body.addClass 'embedded open'
    @page.showNodes()
    @settings.set 'panelIsOpen', yes

  close: (animate) ->
    @page.unshrink animate
    $brand = $ 'header'  # .navbar-brand'
    brandHeight = $brand.outerHeight yes
    brandWidth = brandHeight  # $brand.outerWidth yes
    @css {height: "#{brandHeight}px"}
    @css {right: "#{brandWidth-@width}px"}, animate
    @page.$cms.addClass 'closed'
    @page.$cms.removeClass 'fullscreen'
    @$body.addClass 'closed'
    @$body.removeClass 'embedded open'
    @page.hideNodes()
    @settings.set 'panelIsOpen', no

  css: (style, animated) ->
    if animated
      @page.$cms.animate style, 100
    else
      @page.$cms.css style

window.makeCms = ->
  new CMS