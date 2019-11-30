################################################[  EDITOR  ]############################################################
class window.ListEditor extends window.Editor

  initialize: (config) ->
    console.log 'ListEditor.initialize', @
    @firstRender = true
    super config
    editor = this;
    editor.$add = $('#node-add');
    editor.$add.on 'click', () =>

    editor.$textarea = $('textarea');
    editor.$textarea.on 'input', () =>
      console.log('ListEditor:input');
      editor.triggerRender(editor.$textarea.val());
      editor.$textarea.change()
  render: (node) ->
    console.log('ListEditor.render()')
    super node
    this.$textarea.val(node.data)
    @firstRender = false