define(['app', 'models/base', 'underscore', 'models/user', 'models/message'],
function(app, Base, _, User, Message){
    'use strict';

    /**
     * @class SegmentModel
     */
    var SegmentModel = Base.Model.extend({

        /**
         * @init
         */
        initialize: function(){
            if( this.attributes.created ){
                this.attributes.creationDate = this.attributes.created;
            }

            if( ! this.get('creationDate') ){
                this.set( 'creationDate', app.getCurrentTime() );
            }

            var ranges = this.attributes.ranges,
                _serializedRange = [],
                _ranges = [];

            _.each(ranges, function(range, index){

                if( !(range instanceof Range.SerializedRange) ){
                    ranges[index] = new Range.SerializedRange(range);
                }

                _ranges[index] = ranges[index];

            });

            // We need to create a copy 'cause annotator destroy all ranges
            // once it creates the highlight
            this.attributes._ranges = _ranges;
            var that = this;
            this.listenTo(this,"change:idIdea", function(){
                var previousIdea, 
                    idea;
                if(that.previous("idIdea") !== null) {
                    
                    previousIdea = app.ideaList.ideas.get(that.previous("idIdea"));
                    //console.log("Segment:initialize:triggering idea change (previous idea)");
                    previousIdea.trigger('change');
                }
                if(that.get('idIdea') !== null) {
                    
                    idea = app.ideaList.ideas.get(that.get('idIdea'));
                    //console.log("Segment:initialize:triggering idea change (new idea)");
                    idea.trigger('change');
                }
            })

            // cleaning
            delete this.attributes.highlights;
        },

        /**
         * @type {string}
         */
        urlRoot: app.getApiUrl("extracts"),

        /**
         * @type {Object}
         */
        defaults: {
            text: '',
            quote: '',
            idPost: null,
            idIdea: null,
            creationDate: null,
            idCreator: null,
            ranges: [],
            target: null
        },

        /**
         * Validation
         */
        validate: function(attrs, options){
            var currentUser = app.getCurrentUser(),
                id = currentUser.getId();

            if( !id ){
                return i18n.gettext('You must be logged in to create segments');
            }
        },

        /**
         * @return {Idea} The Post the segments is associated to, if any
         * 
         * FIXME:  Once proper lazy loading is implemented, this must be changed
         * to use it.  As it is, it will leak memory
         * 
         */
        getAssociatedPost: function(){
            var post = null,
                idPost = this.attributes.idPost;

            if (idPost) {
                if(app.segmentPostCache[idPost]) {
                    return app.segmentPostCache[idPost];
                }
                post = app.messageList.messages.get(idPost);
                if( !post ){
                    post = new Message.Model({'@id': idPost});
                    post.fetch({async:false});
                }
                app.segmentPostCache[idPost] = post;
            }
            return post;
        },

        /**
         * Return the html markup to the icon
         * @return {string}
         */
        getTypeIcon: function(){
            var cls = 'icon-',
                target = this.get('target'),
                idPost = this.idPost;

            // todo(Marc-Antonie): review this `type` because `idPost`
            // is a string and doesn't have `@type` attribute

            if (target != null) {
                switch(target['@type']){
                    case 'Webpage':
                        cls += 'link';
                        break;

                    case 'Email':
                    case 'Post':
                    case 'AssemblPost':
                    case 'SynthesisPost':
                    case 'ImportedPost':
                    default:
                        cls += 'mail';
                }
            } else if (idPost != null) {
                cls += 'mail';
            }


            return app.format("<i class='{0}'></i>", cls);
        },

        /**
         * Returns the segent's creator
         * @return {User}
         */
        getCreator: function(){
            var creatorId = this.get('idCreator');
            return app.users.getById(creatorId);
        },

        /**
         * Alias for `.get('quote') || .get('text')`
         * @return {String}
         */
        getQuote: function(){
            return this.get('quote') || this.get('text');
        }
    });

    /**
     * @class SegmentColleciton
     */
    var SegmentCollection = Base.Collection.extend({

        /**
         * @type {String}
         */
        url: app.getApiUrl("extracts"),

        /**
         * @type {IdeaModel}
         */
        model: SegmentModel,

        /**
         * @init
         */
        initialize: function(){
            this.listenTo(this,"add remove", function(segment){
                var idea;
                if(segment.get('idIdea') !== null) {
                    idea = app.ideaList.ideas.get(segment.get('idIdea'));
                    //console.log("SegmentCollection:initialize:triggering idea change (new idea)");
                    idea.trigger('change');
                }
            });
        },
        
        /**
         * Return the segments to compose the clipboard
         * @return {Array<Segment>}
         */
        getClipboard: function(){
            var currentUser = app.getCurrentUser(),
                segments;

            return this.filter(function(item){
                if( item.get('idIdea') !== null ){
                    return false;
                }

                return item.getCreator().getId() == currentUser.getId();
            });
        },

        /**
         * Returns the segment related to the annotation
         * @param  {annotation} annotation
         * @return {Segment}
         */
        getByAnnotation: function(annotation){
            return this.get(annotation['@id']);
        }
    });

    return {
        Model: SegmentModel,
        Collection: SegmentCollection
    };

});
