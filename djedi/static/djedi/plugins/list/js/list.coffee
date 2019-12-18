

################################################[  EDITOR  ]############################################################
class window.ListEditor extends window.Editor

  initDataStructure: () ->
    return {
      direction: '',
      children: []
    }


  initialize: (config) ->
    console.log 'ListEditor.initialize', @

    super config
    @editor = this;
    @subPlugins = []
    @data = @initDataStructure()
    @saveQueue = []
    @loading = false

    @container = $('#node-list')
    @dataHolder = $('#subnode-data')
    @editor.$add_list = $('#node-add-list')

    $('#form input').unbind()
    $('#form textarea').unbind()
    $('#form select').unbind()
    for plg in config.plugins
      $('<option val="'+plg+'" id="node-add">'+plg+'</option>').appendTo @editor.$add_list

    @editor.$add = $('#node-add')
    @editor.$add_list.on 'change', (evt) =>
      @spawnSubnode @node.uri.clone({
        query: {
          key: @getSubnodeKey(),
          plugin: $(evt.target).val()
        }
      }).valueOf(), true
      $(evt.target).val('')

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
            key: entry.key,
            plugin: entry.plugin,
          }
        }).valueOf(), false, entry.data
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
    if state == 'dirty' && @loading
      return
    super state

  spawnSubnode: (uri, refreshValue = true, data = "") =>
    console.log("ListEditor.spawnSubNode()")
    classes = 'subnodes__item'
    classes += ' subnodes__item--closed' if @subPlugins.length > 0

    cont = $("<div class='"+classes+"'></div>").appendTo @container
    title = $("<div class='subnodes__item-title'></div>").appendTo cont
    holder = $("<div class='subnodes__item-content'></div>").appendTo cont

    title.on 'click', (e) =>
      $(e.target).parent().toggleClass 'subnodes__item--closed'

    $("<div class='subnodes__item-remove'><i class='icon-remove'></i></div>").appendTo(title).on 'click', (e) =>
      @popSubnode($(e.target).parents('.subnodes__item').attr "uri-ref")


    node = new window.Node uri, data, holder
    separatedUri = node.uri.path.split('/')

    title.append separatedUri[separatedUri.length - 1]
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
      key: node.uri.query.key,
      plugin: node.uri.query.plugin,
      data: data,
    }
    holder.append plug.$el

    windowRef = plug.$el[0].contentWindow
    $(plug.$el).on 'load', () =>
      windowRef.$(windowRef.document).on 'editor:initialized', (event, edt, cfg) =>
        edt.$form.ajaxForm({
            success: (data) =>
              console.log "subnode save successful", data
              @workSaveQueue()
              edt.onSave(data)
            beforeSubmit: edt.prepareForm
        });

      windowRef.$(windowRef.document).on 'editor:dirty', () =>
        @editor.setState('dirty')
        @trigger 'editor:dirty'

      windowRef.$(windowRef.document).on 'node:update', (event, uri, node) =>
        @updateSubnode(uri.to_uri().query.key, node)

      windowRef.$(windowRef.document).on 'node:render', (event, uri, content) =>
        @renderSubnode(uri, content)


    @updateData(refreshValue)
    if (!refreshValue)
      @editor.setState('draft')
    else
      @trigger 'editor:dirty'
      @editor.setState('dirty')

  save: () ->
    for plug in @subPlugins
      @saveQueue.push(plug)
    super

  onSave: (node) ->
    super node
    @workSaveQueue()

  workSaveQueue: () =>
    if @saveQueue.length > 0
      @saveSubnode(@saveQueue.pop())
    else
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
    windowRef.editor.$form.submit()


  popSubnode: (uri) =>
    console.log("ListEditor.popSubnode()")
    targetUri = uri
    nodeList = @container
    @subPlugins = @subPlugins.filter (value) ->
      if value.uri.valueOf() != targetUri
        return true
      value.close()
      nodeList.find('[uri-ref="'+targetUri+'"]').remove()
      return false
    @data.children = @data.children.filter (value) ->
      if value.key != targetUri.to_uri().query.key
        return true
      return false
    @setState "dirty"
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
    newContent = $(@node.content).find('#'+uri.to_uri().query['key']).html(content).end()[0];
    @updateData(false)
    @node.content = newContent
    @editor.triggerRender newContent

  updateSubnode: (uuid, node, norender = false) =>
    console.log("ListEditor.updateSubnode()", uuid)
    if node.data
      for child in @data.children
        if child.key == node.uri.query.key
          child.data = node.data
    @renderSubnode(node.uri, node.content)

  getSubnodeKey: (key = undefined) =>
    keys = ""
    uri = @node.uri.to_uri()
    if uri.query && uri.query['key']
      keys += @node.uri.to_uri().query['key'] + ","
    return keys + (key or @generateGuid())
  generateGuid: () ->
    result = ''
    for j in [0...32]
      if j == 8 || j == 12 || j == 16 || j == 20
        result = result + '-'
      i = Math.floor(Math.random()*16).toString(16).toUpperCase()
      result = result + i
    return result
