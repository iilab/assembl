define(['backbone', 'underscore', 'jquery', 'app', 'models/segment', 'types', 'i18n', 'permissions'],
function(Backbone, _, $, app, Segment, Types, i18n, Permissions){
    'use strict';

    var SegmentList = Backbone.View.extend({
        /**
         * @init
         */
        initialize: function(obj){
            var that = this;

            if( obj && obj.button ){
                this.button = $(obj.button).on('click', app.togglePanel.bind(window, 'segmentList'));
            }

            this.listenTo(this.segments, 'invalid', function(model, error){
                alert(error);
            });

            app.users.on('reset', this.render, app.segmentList);

            this.listenTo(this.segments, 'add remove change reset', this.render);

            this.listenTo(this.segments, 'add', function(segment){
                that.highlightSegment(segment);
            });
        },

        /**
         * The template
         * @type {_.template}
         */
        template: app.loadTemplate('segmentList'),

        /**
         * The collection
         * @type {SegmentCollection}
         */
        segments: new Segment.Collection(),

        /**
         * The panel element
         * @type {jQuery}
         */
        panel: null,

        /**
         * The render
         * @return {segmentList}
         */
        render: function(){
            if(app.debugRender) {
                console.log("segmentList:render() is firing");
            }
            app.trigger('render');
            app.cleanTooltips(this.$el);
            
            var segments = this.segments.getClipboard(),
                currentUser = app.getCurrentUser(),
                data = {segments:segments,
                        canEditExtracts:currentUser.can(Permissions.EDIT_EXTRACT),
                        canEditMyExtracts:currentUser.can(Permissions.EDIT_MY_EXTRACT)
                       },
                top = 0;
            if( this.panel ){
                top = this.panel.find('.panel-body')[0].scrollTop;
            }

            this.$el.html(this.template(data));
            app.initTooltips(this.$el);
            this.panel = this.$('.panel');

            if( top > 0 ){
                this.panel.find('.panel-body')[0].scrollTop = top;
            }

            return this;
        },

        /**
         * Add a segment to the clipboard.  If the segment exists, it will be 
         * unlinked from it's idea (if any).
         * @param {Segment} segment
         */
        addSegment: function(segment){
            delete segment.attributes.highlights;

            this.segments.add(segment, {merge: true});
            segment.save('idIdea', null);
        },

        /**
         * Transform an annotator annotation as a segment. 
         * The segment isn't saved.
         * @param {annotation} annotation
         * @param {Number} [idIdea=null] 
         * @return {Segment}
         */
        addAnnotationAsSegment: function(annotation, idIdea){
            var post = app.getPostFromAnnotation(annotation),
                idPost = post.getId();

            var segment = new Segment.Model({
                target: { "@id": idPost, "@type": Types.EMAIL },
                text: annotation.text,
                quote: annotation.quote,
                idCreator: app.getCurrentUser().getId(),
                ranges: annotation.ranges,
                idPost: idPost,
                idIdea: idIdea
            });

            if( segment.isValid() ){
                delete segment.attributes.highlights;

                this.segments.add(segment);
            } else {
                alert( segment.validationError );
            }

            return segment;
        },

        /**
         * Creates a segment with the given text and adds it to the segmentList
         * @param  {string} text
         * @param  {string} [post=null] The origin post
         * @return {Segment}
         */
        addTextAsSegment: function(text, post){
            var idPost = null;

            if( post ){
                idPost = post.getId();
            }

            var segment = new Segment.Model({
                target: { "@id": idPost, "@type": Types.EMAIL },
                text: text,
                quote: text,
                idCreator: app.getCurrentUser().getId(),
                idPost: idPost
            });

            if( segment.isValid() ){
                this.addSegment(segment);
                segment.save();
            }
        },

        /**
         * Removes a segment by its cid
         * @param  {String} cid
         */
        removeSegmentByCid: function(cid){
            var model = this.segments.get(cid);

            if(model){
                model.destroy();
            }
        },

        /**
         * Remove the given segment
         * @param {Segment} segment
         */
        removeSegment: function(segment){
            this.segments.remove(segment);
        },


        /**
         * Shows the given segment
         * @param {Segment} segment
         */
        showSegment: function(segment){
            app.openPanel(app.segmentList);
            this.highlightSegment(segment);
        },
        
        /**
         * Highlight the given segment with an small fx
         * @param {Segment} segment
         */
        highlightSegment: function(segment){
            var selector = app.format('.box[data-segmentid={0}]', segment.cid),
                box = this.$(selector);

            if( box.length ){
                var panelBody = this.$('.panel-body');
                var panelOffset = panelBody.offset().top;
                var offset = box.offset().top;
                // Scrolling to the element
                var target = offset - panelOffset + panelBody.scrollTop();
                panelBody.animate({ scrollTop: target });
                box.highlight();
            }
        },

        
        /**
         * Closes the panel
         */
        closePanel: function(){
            console.log("closePanel");
            if( this.button ){
                this.button.trigger('click');
            }
        },

        /**
         * The events
         * @type {Object}
         */
        events: {
            'dragstart .postit': "onDragStart",
            'dragend .postit': "onDragEnd",
            'dragover .panel': 'onDragOver',
            'dragleave .panel': 'onDragLeave',
            'drop .panel': 'onDrop',

            'click .closebutton': "onCloseButtonClick",
            'click #segmentList-clear': "onClearButtonClick",
            'click #segmentList-closeButton': "closePanel",

            'click .segment-link': "onSegmentLinkClick"
        },

        /**
         * @event
         */
        onDragStart: function(ev){
            ev.currentTarget.style.opacity = 0.4;

            var cid = ev.currentTarget.getAttribute('data-segmentid'),
                segment = this.segments.get(cid);

            app.showDragbox(ev, segment.getQuote());
            app.draggedSegment = segment;
        },

        /**
         * @event
         */
        onDragEnd: function(ev){
            if( ev ){
                ev.preventDefault();
                ev.stopPropagation();
            }

            ev.currentTarget.style.opacity = '';
            app.draggedSegment = null;
        },

        /**
         * @event
         */
        onDragOver: function(ev){
            ev.preventDefault();

            var isText = false;
            if( ev.dataTransfer && ev.dataTransfer.types && ev.dataTransfer.types.indexOf('text/plain') > -1 ){
                isText = app.draggedIdea ? false : true;
            }

            if( app.draggedSegment !== null || isText ){
                this.panel.addClass("is-dragover");
            }

            if( app.draggedAnnotation !== null ){
                this.panel.addClass("is-dragover");
            }
        },

        /**
         * @event
         */
        onDragLeave: function(){
            this.panel.removeClass('is-dragover');
        },

        /**
         * @event
         */
        onDrop: function(ev){
            if( ev ){
                ev.preventDefault();
                ev.stopPropagation();
            }

            this.panel.trigger('dragleave');

            var idea = app.getDraggedIdea();
            if( idea ){
                return; // Do nothing
            }

            var segment = app.getDraggedSegment();
            if( segment ){
                this.addSegment(segment);
                return;
            }

            var annotation = app.getDraggedAnnotation();
            if( annotation ){
                app.saveCurrentAnnotationAsExtract();
                return;
            }

            var text = ev.dataTransfer.getData("Text");
            if( text ){
                this.addTextAsSegment(text);
                return;
            }
        },

        /**
         * @event
         */
        onCloseButtonClick: function(ev){
            var cid = ev.currentTarget.getAttribute('data-segmentid');
            this.removeSegmentByCid(cid);
        },

        /**
         * @event
         */
        onClearButtonClick: function(ev){
            var ok = confirm( i18n.gettext('Are you sure you want to empty your entire clipboard?') );
            if( ok ){
                var segments = this.segments.getClipboard();
                _.each(segments, function(segment){
                    segment.destroy();
                });
            }
        },

        /**
         * @event
         */
        onSegmentLinkClick: function(ev){
            var cid = ev.currentTarget.getAttribute('data-segmentid'),
                segment = this.segments.get(cid);

            app.showTargetBySegment(segment);
        }

    });

    return SegmentList;
});