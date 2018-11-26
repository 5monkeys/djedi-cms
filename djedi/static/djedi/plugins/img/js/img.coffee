delay = (ms, func) ->
  setTimeout func, ms


################################################[  CROP  ]##############################################################
class CropTool

  constructor: ($el) ->
    @$img = $el
    @init()

  init: ->
    api = null

    @$img.Jcrop
      bgColor: 'none'
      bgOpacity: 1
      onChange: @cropHandler
      onSelect: @cropHandler
      onRelease: @release
    , ->
      api = @

    @api = api
    @bounds = @api.getBounds()

    # Get original image width/height
    _image = new Image
    _image.src = @$img.attr 'src'
    $(_image).load =>
      @imageSize =
        width: _image.width
        height: _image.height

  destroy: ->
    @api.ui.holder.hide()
    @api.destroy()

  show: ->
    @api.enable()
    @api.ui.holder.show()
    @$img.hide().css visibility: 'hidden'

  hide: ->
    @api.ui.holder.hide()
    @api.disable()
    @api.release()
    @$img.show().css visibility: 'visible'

  setAspectRatio: (ratio) ->
    @api.setOptions aspectRatio: ratio

  disableAspectRatio: ->
    @setAspectRatio 0

  createPreview: ->
    console.log 'new crop image preview'
    image = new Image
    image.src = @$img.attr 'src'
    $image = $ image
    @preview = $image

    @previewContainer = $ '<div>'
    @previewContainer.css
      overflow: 'hidden'
      display: 'inline-block'
    @previewContainer.append image

    delay 100, => @$img.trigger 'crop:preview', @previewContainer

  setPreviewAttributes: (attrs) ->
    if not @preview?
      @createPreview()
    @previewContainer.attr attr, value for attr, value of attrs

  resizePreview: =>
    if not @preview?
      @createPreview()

    @previewSize =
      width: parseInt $('#field-width').val() or 0, 10
      height: parseInt $('#field-height').val() or 0, 10

    @previewContainer.css
      width: @previewSize.width
      height: @previewSize.height

  release: =>
    if @previewSize
      @preview.css
        width: @previewSize.width + 'px'
        height: @previewSize.height + 'px'
        marginLeft: 0
        marginTop: 0

  cropPreview: (coords) ->
    # Fetch crop area if not given
    if not coords
      coords = @api.tellSelect()

    # Update "height" form field and resize preview when cropping without aspect ratio
    if @api.getOptions().aspectRatio == 0
      if coords.w
        hr = coords.h / coords.w
      else
        hr = @bounds[1] / @bounds[0]
      $('#field-height').val Math.round(@previewSize.width * hr)
      @resizePreview()

    if coords.w > 0
      # Crop image in preview, but maintain size
      rx = @previewSize.width / coords.w
      ry = @previewSize.height / coords.h

      @preview.css
        width: Math.round(rx * @bounds[0]) + 'px'
        height: Math.round(ry * @bounds[1]) + 'px'
        marginLeft: '-' + Math.round(rx * coords.x) + 'px'
        marginTop: '-' + Math.round(ry * coords.y) + 'px'
    else
      @release()

  cropHandler: (coords) =>
    if not @preview?
      @createPreview()
      @resizePreview()
    else
      @cropPreview coords

    # Update "crop" form field
    $crop = $ '#field-crop'
    if coords.w
      rx = @imageSize.width / @bounds[0]
      ry = @imageSize.height / @bounds[1]
      box = [coords.x*rx, coords.y*ry, coords.x2*rx, coords.y2*ry]
      box = (Math.round(x) for x in box).join ','
      $crop.val box
    else
      $crop.val ''

    $crop.change()


################################################[  DROPZONE  ]##########################################################
class Dropzone

  constructor: (config) ->
    @el = config.el
    @$el = $ config.el
    @$section = @$el.find 'section'
    @startCallback = config.start
    @stopCallback = config.stop

    # Bind drag/drop handler
    $(document).bind 'dragover', @dragHandler

    # Disable native browser file drop
    $(document).bind 'drop dragover', (event) -> event.preventDefault()

  hide: ->
    console.log 'Dropzone.hide(), hasError:', @hasError()
    if not @hasError()
      @$el.hide()

  show: ->
    @$el.show()

  hasError: ->
    @$section.hasClass 'error'

  resizeTo: (target) ->
    @$section.css
      'height': "#{target.outerHeight()}px"
      'line-height': "#{target.outerHeight() - 6}px"

  dragStart: ->
    @$section.addClass('drag').removeClass('drag-over error')
    @$section.html '<i class="icon-circle-arrow-down"></i> Drop your image here'

  dragOver: ->
    @$section.addClass('drag-over').removeClass('drag drop')
    @$section.html '<i class="icon-cloud-upload"></i> Release to upload'

  dragDrop: ->
    @$section.addClass('drop').removeClass('drag-over')
    @$section.html '<i class="icon-spinner icon-spin icon-large"></i>'

  dragError: ->
    @$section.addClass('error').removeClass('drag-over drop')
    @$section.html '<i class="icon-warning-sign"> Failed to upload image</i>'

  dragStop: ->
    if not @hasError()
      @$section.removeClass('drag-over drop error')
      @$section.html ''

  dragHandler: (event) =>
    @startCallback()
    zone = @$el

    if not @dragId
      # Drag over window
      @dragStart()
      zone.fadeIn 'fast'
    else
      clearTimeout @dragId

    if event.target == @$section[0]
      # Drag over dropzone
      @dragOver()
    else
      # Drag over window
      @dragStart()

    @dragId = delay 100, =>
      # Drag outside window
      @dragId = null
      @hide()
      @dragStop()
      @stopCallback()


################################################[  EDITOR  ]############################################################
class window.ImageEditor extends window.Editor

  initialize: (config) ->
#    console.log 'ImageEditor.initialize', @

    super config

    @dropzone = new Dropzone
      el: config.dropzone
      start: => @crop.hide() if @crop?
      stop: => @crop.show() if @crop?

    @field = $ config.field
    @preview = $ config.preview

    # Initialize fileupload
    @field.fileupload
      # acceptFileTypes: /(\.|\/)(jpg)$/i,  # TODO: Restrict image file types
      dropZone: dropzone.el
      drop: @prepareUpload
      send: @uploadStart
      done: @uploadComplete
      fail: @uploadError
      progressall: (event, data) => @progressbar.update data

    @widthField = $ '#field-width'
    @heightField = $ '#field-height'
    @ratioButton = $ '#ar-lock'

    # Field events
    $('.dimension').on 'keyup', @resizeImage
    $('#html-pane input').on 'keyup', => @updateImageAttributes()
    @ratioButton.on 'click', @toggleAspectRatio
    @ratioButton.tooltip()

  render: (node) ->
    console.log 'ImageEditor.render()'
    super node

    if node and node.data
      @updateForm node.data
      if node.data.url
        @dropzone.dragDrop()
        @renderThumbnail node.data.url
      else
        @dropzone.dragStart()
    else
      @updateForm filename: '', width: '', height: '', id: '', 'class': '', alt: ''
      @removeThumbnail()

  updateForm: (data) ->
#    $('#filename').html node.data.filename
    $("input[name='data[filename]']").val data.filename
    $("input[name='data[width]']").val data.width
    $("input[name='data[height]']").val data.height
    $("input[name='data[crop]']").val ''
    $("input[name='data[id]']").val data.id
    $("input[name='data[class]']").val data.class
    $("input[name='data[alt]']").val data.alt

  renderThumbnail: (url) ->
    console.log 'ImageEditor.renderThumbnail()'
    image = new Image
    image.src = url
    image.className = 'original'
    $image = $ image

    $image.load =>
      @dropzone.hide()
      @preview.hide()
      @preview.html image

      @preview.fadeIn 100, =>
#        @dropzone.resizeTo @preview

        # Initialize crop tool
        $image.on 'crop:preview', (event, html) => @triggerRender html
        @crop = new CropTool $image
        @updateImageAttributes()
        @crop.resizePreview()

  removeThumbnail: ->
    console.log 'ImageEditor.removeThumbnail()'
    if @crop
      @crop.destroy()
    @preview.empty()
    @dropzone.show()
    @dropzone.dragStart()

  dimensions: ->
    w = parseInt(@widthField.val(), 10) or 0
    h = parseInt(@heightField.val(), 10) or 0
    [w, h]

  resizeImage: (event) =>
    [w, h] = @dimensions()

    if w and h
      keepRatio = @ratioButton.hasClass 'active'

      if keepRatio
        ratio = @ratioButton.data 'ratio'

        if $(event.target).attr('id') == 'field-width'
          h = Math.round w / ratio
          @heightField.val h
        else
          w = Math.round h * ratio
          @widthField.val w

      else
        ratio = w / h

      # Set new crop area
      image.crop.setAspectRatio ratio

      # Disable aspect ratio
      if not keepRatio
        image.crop.disableAspectRatio()

    @crop.resizePreview()
    @crop.cropPreview()
    @trigger 'node:resize'

  getHtmlFields: ->
    attrs = {}
    for attr in ['id', 'class', 'alt']
      attrs[attr] = $("input[name='data[#{attr}]']").val()
    attrs

  updateImageAttributes: ->
    @crop.setPreviewAttributes @getHtmlFields()
    @trigger 'node:resize'

  toggleAspectRatio: =>
    ratioInactive = @ratioButton.hasClass 'active'

    [w, h] = @dimensions()
    ratio = if w and h then w / h else 1

    @ratioButton.data 'ratio', ratio
    @crop.setAspectRatio if ratioInactive then 0 else ratio

  prepareUpload: =>
    $('input[name="data[width]"]').val ''
    $('input[name="data[height]"]').val ''
    @trigger 'form:change'

  uploadStart: (event, response) =>
    console.log 'ImageEditor.uploadStart()'
    @dropzone.dragDrop()
    @progressbar.show()
    @crop.destroy() if @crop

  uploadComplete: (event, response) =>
    console.log 'ImageEditor.uploadComplete()'
    @progressbar.hide()
    node = @setNode response.result
    @render node

  uploadError: (event, response) =>
    console.log 'ImageEditor.uploadError()'
    @progressbar.hide()
    @dropzone.dragError()
