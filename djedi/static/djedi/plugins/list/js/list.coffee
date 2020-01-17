

################################################[  EDITOR  ]############################################################
class window.ListEditor extends window.Editor

  initDataStructure: () ->
    return {
      direction: 'col',
      children: []
    }


  initialize: (config) ->
    console.log 'ListEditor.initialize', @

    super config
    @subnodeCss = '
      <style>
        .node-title, footer {
          display: none;
        }
        #editor {
          height: auto;
          max-height: none;
        }
      </style>
    ';

    @editor = this;
    @subnodeIframes = []
    @data = @initDataStructure()
    @saveQueue = []
    @loading = false
    @preventParentReload = false
    @subnodeDirty = false
    @doShallowSave = false

    @container = $('#node-list')
    @dataHolder = $('#subnode-data')
    @directions = $('#direction-options')
    @editor.$add_list = $('#plugin-list')

    $('#form input').unbind()
    $('#form textarea').unbind()
    $('#form select').unbind()

    @directions.find('input').on 'change', (e) =>
      @setDirection e.target.value

    for plg in config.plugins
      if plg != 'list'
        $("<li class='node-add'><a href='#'><span class='#{@getPluginColor(plg)}'>#{plg}</span></a></li>").appendTo @editor.$add_list

    @editor.$add = $('.node-add')
    @editor.$add.on 'click', (evt) =>
      if (!@subnodeDirty)
        @addSubnode(@getSubnodeUriKey(), $(evt.target).text(), true)

  setDirection: (dir, refreshData = true) =>
    @directions.find('[name="direction"]').prop('checked', false);
    target = @directions.find("[value='#{dir}']");
    if target.length == 1
      target.prop('checked', true);
      @data.direction = dir
      @updateData(refreshData)
      @setDirty()
    else
      @setDirection "col", refreshData;

  addSubnode: (key, plugin, markDirty, defaultData = "") =>
    @spawnSubnode @node.uri.clone({
      query: {
        key: key,
        plugin: plugin
      },
      version: "",
    }).valueOf(), markDirty, defaultData

  onLoad: (node) =>
    @loading = true
    @clearList()
    super node
    @frameBias = "node/" + encodeURIComponent((encodeURIComponent(node.uri.valueOf().replace('#'+node.uri.version, '')))) + "/editor"
    try
      codedData = node.data
      for entry in codedData.children
        @addSubnode(@getSubnodeUriKey(entry.key), entry.plugin, false, entry.data)
      @setDirection codedData.direction, false
    catch exception
      @clearList()
      @updateData(true)
      console.log "ListEditor.onLoad(), error when loading. Data invalid: ", exception
    @loading = false

  render: (node) =>
    console.log('ListEditor.render()', node.content, @)
    @dataHolder.val(JSON.stringify(@data))
    super node

  setState: (state) =>
    if state == 'draft' && @preventParentReload || state == 'dirty' && @loading
      return
    if state == "dirty" && @subnodeDirty
      @toggleListActions()
    super state

  spawnSubnode: (uri, refreshValue = true, data = "") =>
    console.log("ListEditor.spawnSubNode()")
    classes = 'subnodes__item'

    node_container = $("<div class='"+classes+"'></div>").appendTo @container
    title = $("<div class='subnodes__item-title'></div>").appendTo node_container
    holder = $("<div class='subnodes__item-content'></div>").appendTo node_container

    title.on 'click', (e) =>
      $(e.target).parent().toggleClass 'subnodes__item--closed'

    $("<div class='subnodes__item-remove'><i class='icon-remove'></i></div>").appendTo(title).on 'click', (e) =>
      @popSubnode($(e.target).parents('.subnodes__item').attr "uri-ref")

    handle = $("<div class='subnodes__item-shift'>
                  <a class='subnodes__item-shift--up'><i class='icon-chevron-up'></i></a>
                  <a class='subnodes__item-shift--down'><i class='icon-chevron-down'></i></a>
                </div>").prependTo title
    handle.find('a').on 'click', (event) =>
      if @subnodeDirty
        return false
      newOrder = false
      if ($(event.target).hasClass('subnodes__item-shift--up') || $(event.target).hasClass('icon-chevron-up'))
        newOrder = @moveChild(uri, -1)
      else
        newOrder = @moveChild(uri, 1)
      if newOrder != false
        @resortNodes()
        @updateData true
        @setDirty()
        @shallowSave()

    node = new window.Node uri, data, holder

    title.append ("<span class='subnodes__item-title__text'>"+(node.uri.query['plugin'] or 'unknown')+"</span>")
    title.find('.subnodes__item-title__text').addClass(@getPluginColor(node.uri.query['plugin'] or 'plugin-fg-unknown'))

    node_container.attr 'uri-ref', node.uri.valueOf()
    node_container.attr 'data-key', node.uri.query['key']

    node_iframe = new window.Plugin node

    ref_uri = @node.uri.clone({
      version: ""
    }).valueOf()

    path = document.location.pathname.replace("node/#{encodeURIComponent(encodeURIComponent ref_uri)}/editor", "")
    path = path.replace("node/#{encodeURIComponent(encodeURIComponent @node.uri)}/editor", "")
    node_iframe.$el.attr 'src', path + "node/#{encodeURIComponent(encodeURIComponent uri)}/editor"

    node_container.css('order', @data.children.length);
    @subnodeIframes.push node_iframe
    @data.children.push {
      key: @getSubnodeKey(node.uri.query.key),
      plugin: node.uri.query.plugin,
      data: data,
    }
    holder.append node_iframe.$el

    windowRef = node_iframe.$el[0].contentWindow

    $(node_iframe.$el).on 'load', () =>
      head = windowRef.$(node_iframe.$el[0]).contents().find("head");
      windowRef.$(head).append(@subnodeCss)
      windowRef.$(windowRef.document).on 'editor:state-changed', (event, oldState, newState, node) =>
        if oldState == 'dirty' && newState == 'draft'
          @workSaveQueue()
          @updateSubnode(node.uri.to_uri().query.key, node)

      windowRef.$(windowRef.document).on 'editor:dirty', () =>
        @subnodeDirty = true
        @setDirty()

      windowRef.$(windowRef.document).on 'node:update', (event, uri, node) =>
        @updateSubnode(uri.to_uri().query.key, node)

      windowRef.$(windowRef.document).on 'node:render', (event, uri, content) =>
        @renderSubnode(uri, content)

    @updateData(refreshValue)
    if refreshValue
      @setDirty()

  save: () ->
    @preventParentReload = true
    for subnode_iframe in @subnodeIframes
      @saveQueue.push(subnode_iframe)
    super

  shallowSave: () ->
    @doShallowSave = true
    if @state == "dirty"
      @trigger 'editor:save', @node.uri

  onSave: (node) ->
    super node
    if !@doShallowSave
      @workSaveQueue()
    else
      @doShallowSave = false;

  onPublish: () =>
    super
    @loadRevisionByClass('.published')
    @setState 'published'

  workSaveQueue: () =>
    console.log "ListEditor.workSaveQueue()", @saveQueue.length
    if @saveQueue.length > 0
      @saveSubnode(@saveQueue.pop())
    else
      @preventParentReload = false
      @loadRevisionByClass('.draft')
      @setState('draft')
      @subnodeDirty = false
      @toggleListActions(true)

  saveSubnode: (plugin) =>
    windowRef = plugin.$el[0].contentWindow
    if windowRef and windowRef.editor and windowRef.editor.state != 'dirty'
      @workSaveQueue()
    else if windowRef and windowRef.editor
      windowRef.editor.save()

  popSubnode: (uri) =>
    console.log("ListEditor.popSubnode()")
    targetUri = uri
    targetKey = @getSubnodeKey(targetUri.to_uri().query.key)
    @subnodeIframes = @subnodeIframes.filter (value) =>
      if value.uri.valueOf() != targetUri
        return true

      value.close()
      @container.find('[uri-ref="'+targetUri+'"]').remove()
      return false

    @data.children = @data.children.filter (value) ->
      if value.key != targetKey
        return true
      return false
    @setDirty()
    @updateData(true)

  clearList: () =>
    @container.empty()
    @subnodeIframes = []
    @data = @initDataStructure()

  updateData: (reRender = false) =>
    collection = JSON.stringify @data

    @dataHolder.val collection
    @dataHolder.change()

    @node.data = collection

    if (reRender)
      @api.render "list", {
        data: collection
      }, (response) =>
        contentSet = $(response)[0]
        @node.content = contentSet
        @editor.triggerRender (@node.content)

  renderSubnode: (uri, content) =>
    console.log("ListEditor.renderSubnode()")
    key = @getSubnodeKey(decodeURIComponent(uri.to_uri().query['key']))
    newContent = $(@node.content).find('#'+key).html(content).end()[0];
    @updateData(false)
    @node.content = newContent
    @editor.triggerRender newContent

  updateSubnode: (uuid, node, norender = false) =>
    console.log("ListEditor.updateSubnode()", uuid)
    index = 0;
    if node['data']
      for child in @data.children
        if child.key == uuid
          @data.children[index].data = node['data']
        index++
    @renderSubnode(node['uri'], node['content'])

  toggleListActions: (enable = false) =>
    @container.find('.subnodes__item-shift').toggleClass('subnodes__item-shift--disabled', !enable)
    @editor.$add.toggleClass('disabled', !enable)
    @directions.find('input').prop('disabled', !enable)

  setDirty: () =>
    @setState 'dirty'
    @trigger 'editor:dirty'

  array_move: (arr, old_index, new_index) ->
    if new_index >= arr.length
      k = new_index - arr.length + 1
      while k--
        arr.push(undefined)
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);

  moveChild: (uri, steps) =>
    _uri = uri.to_uri();
    step = 0;
    for child in @data.children
      if (child.key == _uri.query['key'])
        if (step+steps >= 0 && step+steps < @data.children.length)
          @array_move(@data.children, step, step+steps)
          return step+steps;
      else
        step++;
    return false;

  resortNodes: () =>
    step  = 0;
    for child in @data.children
      $("[data-key="+child.key+"]").css('order', step)
      step++;

  getSubnodeUriKey: (key = undefined) =>
    keys = ""
    uri = @node.uri.to_uri()
    if uri.query && uri.query['key']
      keys += @node.uri.to_uri().query['key'] + "_"
    return keys + (key or @generateGuid())

  getSubnodeKey: (composite_key) =>
    keys = composite_key.split('_')
    return keys[keys.length - 1]

  generateGuid: () ->
    result = ''
    for j in [0...32]
      if j == 8 || j == 12 || j == 16 || j == 20
        result = result + '-'
      i = Math.floor(Math.random()*16).toString(16).toUpperCase()
      result = result + i
    return result

  loadRevisionByClass: (targetVersionClass) =>
    @loadRevision({
      type:'click',
      target: $('#revisions').find(targetVersionClass).find('a').get()[0],
      preventDefault: () -> {},
    })
