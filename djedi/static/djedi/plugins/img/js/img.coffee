delay = (ms, func) ->
  setTimeout func, ms

# We have a button that can lock the aspect ratio of both the crop tool, and the
# width/height fields (changing the width automatically updates the height, and
# vice versa). That’s cool, but it’s not clear if its useful to the user. I
# think that 99% of the time you want to crop into a new aspect ratio, but when
# resizing you always want keep the aspect ratio. By setting this variable to
# `false`, the aspect ratio button is hidden and the described behavior is
# enabled.
ENABLE_ASPECT_RATIO_BUTTON = no


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

    # Original image width/height.
    @imageSize =
      width: @$img.prop 'naturalWidth'
      height: @$img.prop 'naturalHeight'

    # Resized image width/height.
    @previewSize =
      width: @imageSize.width
      height: @imageSize.height

    # The area to crop.
    @crop =
      width: @imageSize.width
      height: @imageSize.height
      left: 0
      top: 0

    # A canvas is used to resize and crop the image, but the canvas itself is
    # never shown. Instead, it is turned into a URL that is used for the <img> tag.
    @canvas = document.createElement 'canvas'
    @canvas.width = @previewSize.width
    @canvas.height = @previewSize.height
    @canvas.toBlob ?= @canvas.msToBlob # IE and Edge.
    @ctx = @canvas.getContext '2d'
    @redrawing = false
    @queuedRedraw = false

    # Select the entire image by default. This makes it more obvious that we
    # have a crop tool.
    @api.setSelect [0, 0, @bounds...]

  destroy: ->
    @api.ui.holder.hide()
    @api.destroy()

  getCropAspectRatio: ->
    @crop.width / @crop.height

  setAspectRatio: (ratio) ->
    @api.setOptions aspectRatio: ratio

  setPreviewAttributes: (attrs) ->
    if not @preview?
      @redraw()
    @preview.attr attr, value for attr, value of attrs

  resizePreview: (@previewSize) =>
    @redraw()

  redraw: ->
    # If already drawing, wait for it to finish before drawing again. Otherwise
    # the preview gets very laggy.
    if @redrawing
      @queuedRedraw = true
      return

    @redrawing = true

    # The `window` of the actual page. The sidebar itself is an iframe, and the
    # image editor is a nested iframe. The preview `<img>` element must be
    # constructed from the window it is going to be inserted into, and the `URL`
    # object from the same window must be used to construct its `src`, otherwise
    # browsers will complain about not being able to load a "local resource" if
    # the actual page and the sidebar have different origins (domains).
    # Cross-frame security stuff.
    win = window.parent.parent

    hasPreview = @preview?
    @preview = $ new win.Image unless hasPreview

    # For images with transparent background it is important to clear the canvas
    # between renders.
    @ctx.clearRect 0, 0, @canvas.width, @canvas.height

    # Disallow upscaling the image. The user might of course type in crazy sizes.
    width = Math.min @crop.width, @previewSize.width
    height = Math.min @crop.height, @previewSize.height

    # Keep the aspect ratio of the crop area.
    unless ENABLE_ASPECT_RATIO_BUTTON
      ratio = @getCropAspectRatio()
      height2 = width / ratio
      width2 = height * ratio
      if height2 <= height
        height = height2
      else
        width = width2

    @canvas.width = width unless @canvas.width == width
    @canvas.height = height unless @canvas.height == height

    img = @preview[0]

    # If the image needs neither cropping nor resizing, don’t bother with
    # drawing on the canvas. It’s faster to just use the image as-is.
    if width >= @imageSize.width and height >= @imageSize.height and
       @crop.left <= 0 and @crop.top <= 0
      img.src = @$img[0].src
      @$img.trigger 'crop:preview', @preview unless hasPreview
      @$img.trigger 'crop:attributes'
      @redrawing = false
      return

    @ctx.drawImage @$img[0],
      # Source area (of the original image).
      @crop.left, @crop.top,
      @crop.width, @crop.height,
      # Destination area (one the canvas).
      0, 0,
      width, height

    @canvas.toBlob (blob) =>
      url = win.URL.createObjectURL blob
      img.src = url
      img.onload = =>
        img.onload = undefined
        win.URL.revokeObjectURL url
        queued = @queuedRedraw
        @redrawing = false
        @queuedRedraw = false
        @$img.trigger 'crop:preview', @preview unless hasPreview
        @$img.trigger 'crop:attributes'
        if queued
          @redraw()

  release: =>
    @crop =
      width: @imageSize.width
      height: @imageSize.height
      left: 0
      top: 0
    @redraw()

  cropPreview: (coords) ->
    # Fetch crop area if not given.
    if not coords
      coords = @api.tellSelect()

    # When just starting to drag, the first couple of events file with 0 width
    # or height – ignore those. The canvas can't even draw that.
    if coords.w <= 0 or coords.h <= 0
      return

    # `@bounds`  is an array (`[width, height]`) describing the CSS pixel size
    # of the thumbnail. `coords` contain values for the chosen crop area, in
    # terms of the `@bounds` size. If cropping the entire area, `@bounds[0] ==
    # coords.w` and `@bounds[1] == coords.h`. `@imageSize` is the real size of
    # the image (usually much larger). Calculate `@crop` in terms of
    # `@imageSize`.
    @crop =
      width: Math.round coords.w / @bounds[0] * @imageSize.width
      height: Math.round coords.h / @bounds[1] * @imageSize.height
      left: Math.round coords.x / @bounds[0] * @imageSize.width
      top: Math.round coords.y / @bounds[1] * @imageSize.height

    @redraw()

  cropHandler: (coords) =>
    @cropPreview coords

    # Update the "crop" hidden form field (so the values can be sent to backend).
    $crop = $ '#field-crop'
    oldVal = $crop.val()

    newVal =
      if @crop.width >= @imageSize.width and @crop.height >= @imageSize.height and
         @crop.left <= 0 and @crop.top <= 0
        ''
      else
        [
          @crop.left
          @crop.top
          @crop.left + @crop.width
          @crop.top + @crop.height
        ].join ','

    if newVal != oldVal
      $crop.val newVal
      # Trigger "dirty" state.
      $crop.trigger('change')


################################################[  DROPZONE  ]##########################################################
class Dropzone

  constructor: (config) ->
    @field = config.field
    @el = config.el
    @$el = $ config.el
    @$span = @$el.find 'span'

    # Listen both in the editor iframe, as well as the full sidebar iframe. This
    # allows disabling native browser file drop on the header at the top.
    $windows = $(window).add(window.parent)
    $windows.on 'dragenter dragleave drop', @dragHandler

    # Disable native browser file drop.
    $windows.on 'drop dragover', (event) -> event.preventDefault()

    @$el.on 'click', =>
      if @hasError()
        # Allow hiding the error message.
        @$el.removeClass 'error'
        @hide()
      else
        # Allow clicking the area to upload.
        @field.trigger('click')

  hide: (animate = false) ->
    console.log 'Dropzone.hide(), hasError:', @hasError()
    if not @hasError()
      @$el.removeAttr('data-shown')
      if animate
        @$el.finish().fadeOut('fast')
      else
        @$el.hide()

  show: (animate = false) ->
    @$el.attr('data-shown', '')
    if animate
      @$el.finish().fadeIn('fast')
    else
      @$el.show()

  hasError: ->
    @$el.hasClass 'error'

  dragStart: ->
    @$el.removeClass().addClass('drag')
    @$span.html '<i class="icon-circle-arrow-down"></i> Drop your image here'

  dragOver: ->
    @$el.removeClass().addClass('drag-over')
    @$span.html '<i class="icon-cloud-upload"></i> Release to upload'

  dragDrop: ->
    @$el.removeClass().addClass('drop')
    @$span.html '<i class="icon-spinner icon-spin icon-large"></i>'

  dragError: ->
    @$el.removeClass().addClass('error')
    @$span.html '<i class="icon-warning-sign"></i> Failed to upload image'
    @show()

  dragHandler: (event) =>
    onTarget = event.target == @$el[0]

    # Usually, a 'dragenter' event is dispatched (for the element we enter)
    # immediately followed by a 'dragleave' (for the element we just left). When
    # a 'dragenter' event _isn't_ fired just before a 'dragleave', it means that
    # we've left the iframe. If so (and only then) we want to hide the dropzone.
    justEntered = @timeoutId?
    if justEntered
      clearTimeout @timeoutId
      @timeoutId = undefined

    if event.type == 'dragenter'
      @show true
      if onTarget
        @dragOver()
      else
        @dragStart()
      @timeoutId = delay 0, => @timeoutId = undefined
    else
      # Hide the dropzone when dropping the file (but only when dropped outside
      # the dropzone, letting the file upload show progress and errors), or when
      # leaving the iframe.
      if (event.type == 'drop' and not onTarget) or
         (event.type == 'dragleave' and not justEntered)
        @dragStart()
        @hide false


################################################[  EDITOR  ]############################################################
class window.ImageEditor extends window.Editor

  initialize: (config) ->
    console.log 'ImageEditor.initialize', @

    super config

    @firstRender = true

    @field = $ config.field
    @preview = $ config.preview

    @dropzone = new Dropzone
      field: @field
      el: config.dropzone

    # Initialize fileupload
    @field.fileupload
      # acceptFileTypes: /(\.|\/)(jpg)$/i,  # TODO: Restrict image file types
      dropZone: @dropzone.el
      drop: @prepareUpload
      send: @uploadStart
      done: @uploadComplete
      fail: @uploadError
      progressall: (event, data) => @progressbar.update data

    @widthField = $ '#field-width'
    @heightField = $ '#field-height'
    @ratioButton = $ '#ar-lock'

    # Field events
    $('#html-pane input').on 'input', => @updateImageAttributes()
    @widthField.on 'input', =>
      @resizeImage keepWidth: true, keepRatio: @ratioButton.hasClass 'active'
    @widthField.on 'blur', =>
      @widthField.val @crop.canvas.width if @crop
    @heightField.on 'input', =>
      @resizeImage keepWidth: false, keepRatio: @ratioButton.hasClass 'active'
    @heightField.on 'blur', =>
      @heightField.val @crop.canvas.height if @crop
    @ratioButton.on 'click', @toggleAspectRatio
    @ratioButton.tooltip()

    unless ENABLE_ASPECT_RATIO_BUTTON
      # Turn the button into a spacer between the width and height fields.
      @ratioButton.css
        visibility: 'hidden'
        padding: 0
        width: 10

  render: (node) ->
    console.log 'ImageEditor.render()', {@firstRender, node}
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

    @firstRender = false

  updateForm: (data) ->
    # Hardcoded fields
    $("input[name='data[filename]']").val data.filename
    $("input[name='data[crop]']").val ''
    $("input[name='data[width]']").val data.width
    $("input[name='data[height]']").val data.height
    delete data.filename
    delete data.width
    delete data.height

    # Form fields
    for k, v of data
        $("input[name='data[#{k}]']").val v

    @ratioButton.removeClass 'active'

  renderThumbnail: (url) ->
    # There's no need to redraw the first time. The image is already in place on
    # the page. Redrawing just causes unnecessary blinking. We _do_ need to
    # draw, however, after droppping a file or after discarding a file. For the
    # case of having an unpublished draft, `Editor` re-renders so this gets
    # called two times.
    needsRedraw = not @firstRender
    console.log 'ImageEditor.renderThumbnail()', {needsRedraw}

    image = new Image
    image.src = url
    image.className = 'original'
    $image = $ image

    $image.on 'load', =>
      @dropzone.hide()
      @preview.hide()
      @preview.html image

      @preview.fadeIn 100, =>
        $image.on 'crop:preview', (event, html) =>
          @crop?.setPreviewAttributes @getHtmlFields()
          # This replaces the image on the page with the preview image.
          @triggerRender html
        $image.on 'crop:attributes', =>
          @updateImageAttributes()
          if @crop
            @widthField.val @crop.canvas.width unless @widthField.is ':focus'
            @heightField.val @crop.canvas.height unless @heightField.is ':focus'
        @crop = new CropTool $image
        @crop.redraw() if needsRedraw

  removeThumbnail: ->
    console.log 'ImageEditor.removeThumbnail()'
    @crop?.destroy()
    @preview.empty()
    @dropzone.show()
    @dropzone.dragStart()

  dimensions: ->
    w = parseInt(@widthField.val(), 10) or 0
    h = parseInt(@heightField.val(), 10) or 0
    [w, h]

  resizeImage: ({ keepWidth, keepRatio }) =>
    return unless @crop
    [w, h] = @dimensions()

    if keepRatio or not ENABLE_ASPECT_RATIO_BUTTON
      ratio = @crop.getCropAspectRatio()

      if keepWidth
        h = Math.round w / ratio
        @heightField.val h
      else
        w = Math.round h * ratio
        @widthField.val w

    @crop.resizePreview
      width: w
      height: h
    @updateImageAttributes()

  getHtmlFields: ->
    attrs = {}
    for attr in ['id', 'class', 'alt']
      value = $("input[name='data[#{attr}]']").val()
      # Don't render empty strings, except for alt to match the backend.
      attrs[attr] = if not value and attr != 'alt' then null else value
    if @crop
      for attr in ['width', 'height']
        attrs[attr] = @crop.canvas[attr]
    attrs

  updateImageAttributes: =>
    return unless @crop
    @crop.setPreviewAttributes @getHtmlFields()
    @trigger 'node:resize'

  toggleAspectRatio: =>
    return unless @crop
    ratioInactive = @ratioButton.hasClass 'active'
    ratio = @crop.getCropAspectRatio()
    @crop.setAspectRatio if ratioInactive then 0 else ratio
    unless ratioInactive
      @resizeImage keepWidth: true, keepRatio: true

  prepareUpload: =>
    $('input[name="data[width]"]').val ''
    $('input[name="data[height]"]').val ''
    @trigger 'form:change'

  uploadStart: (event, response) =>
    console.log 'ImageEditor.uploadStart()'
    @dropzone.dragDrop()
    @progressbar.show()
    @crop?.destroy()

  uploadComplete: (event, response) =>
    console.log 'ImageEditor.uploadComplete()'
    @progressbar.hide()
    node = @setNode response.result
    @render node

  uploadError: (event, response) =>
    console.log 'ImageEditor.uploadError()'
    @progressbar.hide()
    @dropzone.dragError()
