

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
    @subPlugins = []
    @data = @initDataStructure()
    @saveQueue = []
    @loading = false
    @preventParentReload = false

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
        $('<li class="node-add"><a href="#">'+plg+'</a></li>').appendTo @editor.$add_list

    @editor.$add = $('.node-add')
    @editor.$add.on 'click', (evt) =>
      @spawnSubnode @node.uri.clone({
        query: {
          key: @getSubnodeUriKey(),
          plugin: $(evt.target).text()
        }
      }).valueOf(), true

    $(window).on 'editor:state-changed', (event, oldState, newState) =>
      console.log("ListEditor.stateChanged()")
      console.log(oldState, newState);

  setDirection: (dir, refreshData = true) =>
    @directions.find('[name="direction"]').prop('checked', false);
    target = @directions.find('[value="'+dir+'"]');
    if target.length == 1
      target.prop('checked', true);
      @data.direction = dir
      @updateData(refreshData)
      @setState('dirty')
    else
      @setDirection "col", refreshData;

  onLoad: (node) =>
    @loading = true
    @clearList()
    super node
    @frameBias = "node/" + encodeURIComponent((encodeURIComponent(node.uri.valueOf().replace('#'+node.uri.version, '')))) + "/editor"
    try
      codedData = JSON.parse node.data
      for entry in codedData.children
        @spawnSubnode @node.uri.clone({
          query: {
            key: @getSubnodeUriKey(entry.key),
            plugin: entry.plugin,
          }
        }).valueOf(), false, entry.data
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
    super state

  spawnSubnode: (uri, refreshValue = true, data = "") =>
    console.log("ListEditor.spawnSubNode()")
    classes = 'subnodes__item'

    cont = $("<div class='"+classes+"'></div>").appendTo @container
    title = $("<div class='subnodes__item-title'></div>").appendTo cont
    holder = $("<div class='subnodes__item-content'></div>").appendTo cont

    title.on 'click', (e) =>
      $(e.target).parent().toggleClass 'subnodes__item--closed'

    $("<div class='subnodes__item-remove'><i class='icon-remove'></i></div>").appendTo(title).on 'click', (e) =>
      @popSubnode($(e.target).parents('.subnodes__item').attr "uri-ref")


    node = new window.Node uri, data, holder

    title.append node.uri.query['plugin'] or 'unknown'
    cont.attr 'uri-ref', node.uri.valueOf()
    plug = new window.Plugin node
    ref_uri = @node.uri.clone({
      version: ""
    }).valueOf()
    path = document.location.pathname.replace("node/#{encodeURIComponent(encodeURIComponent ref_uri)}/editor", "")
    path = path.replace("node/#{encodeURIComponent(encodeURIComponent @node.uri)}/editor", "")
    plug.$el.attr 'src', path + "node/#{encodeURIComponent(encodeURIComponent uri)}/editor"

    @subPlugins.push plug
    @data.children.push {
      key: @getSubnodeKey(node.uri.query['key']),
      plugin: node.uri.query.plugin,
      data: data,
    }
    holder.append plug.$el

    windowRef = plug.$el[0].contentWindow

    $(plug.$el).on 'load', () =>
      head = windowRef.$(plug.$el[0]).contents().find("head");
      console.log(head);
      windowRef.$(head).append(@subnodeCss)
      windowRef.$(windowRef.document).on 'editor:state-changed', (event, oldState, newState, node) =>
        console.log(oldState, newState)
        if oldState == 'dirty' && (newState == 'draft' || newState == 'published')
          @workSaveQueue()
          @updateSubnode(node.uri.to_uri().query.key, node)

      windowRef.$(windowRef.document).on 'editor:dirty', () =>
        @editor.setState('dirty')
        @trigger 'editor:dirty'

      windowRef.$(windowRef.document).on 'node:update', (event, uri, node) =>
        @updateSubnode(uri.to_uri().query.key, node)

      windowRef.$(windowRef.document).on 'node:render', (event, uri, content) =>
        @renderSubnode(uri, content)


    @updateData(refreshValue)
    if refreshValue
      @trigger 'editor:dirty'
      @editor.setState('dirty')

  save: () ->
    @preventParentReload = true
    for plug in @subPlugins
      @saveQueue.push(plug)
    super

  onSave: (node) ->
    super node
    @workSaveQueue()

  onPublish: () =>
    super
    event = {
      type:'click',
      target: $('#revisions').find('.published').find('a').get()[0],
      preventDefault: () -> {},
    }
    @loadRevision(event)
    @setState 'published'

  workSaveQueue: () =>
    console.log "ListEditor.workSaveQueue()", @saveQueue.length
    if @saveQueue.length > 0
      @saveSubnode(@saveQueue.pop())
    else
      @preventParentReload = false
      event = {
        type:'click',
        target: $('#revisions').find('.draft').find('a').get()[0],
        preventDefault: () -> {},
      }
      @loadRevision(event)
      @setState('draft')
      # Load latest revision

  saveSubnode: (plugin) =>
    windowRef = plugin.$el[0].contentWindow
    if windowRef.editor.state != 'dirty'
      @workSaveQueue()
    else
      windowRef.editor.save()


  popSubnode: (uri) =>
    console.log("ListEditor.popSubnode()")
    targetUri = uri
    targetKey = @getSubnodeKey(targetUri.to_uri().query.key)
    nodeList = @container
    @subPlugins = @subPlugins.filter (value) ->
      if value.uri.valueOf() != targetUri
        return true
      value.close()
      nodeList.find('[uri-ref="'+targetUri+'"]').remove()
      return false
    @data.children = @data.children.filter (value) ->
      if value.key != targetKey
        return true
      return false
    @setState "dirty"
    @trigger 'editor:dirty'
    @updateData(true)

  clearList: () =>
    @container.empty()
    @subPlugins = []
    @data = @initDataStructure()

  updateData: (withDirty = false) =>
    collection = JSON.stringify @data
    @dataHolder.val collection
    @dataHolder.change()
    @node.data = collection
    if (withDirty)
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
    if node.data
      console.log(node)
      for child in @data.children
        if child.key == node.uri.query.key
          console.log("updating node data")
          child.data = node.data
    @renderSubnode(node.uri, node.content)

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
