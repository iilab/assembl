'use strict';

define(['underscore', 'jquery', 'app', 'common/context', 'models/base'],
    function (_, $, Assembl, Ctx, Base) {

        /**
         * @class MessageModel
         */
        var MessageModel = Base.Model.extend({
            /**
             * The url
             * @type {String}
             */
            urlRoot: Ctx.getApiUrl('posts'),

            /**
             * Default values
             * @type {Object}
             */
            defaults: {
                collapsed: true,
                checked: false,
                read: false,
                parentId: null,
                subject: null,
                hidden: false,
                body: null,
                idCreator: null,
                avatarUrl: null,
                date: null,
                bodyMimeType: null
            },

            /**
             * @return {Number} the quantity of all descendants
             */
            getDescendantsCount: function () {
                var children = this.getChildren(),
                    count = children.length;

                _.each(children, function (child) {
                    count += child.getDescendantsCount();
                });

                return count;
            },

            visitDepthFirst: function (visitor) {
                var ancestry = [this];
                this.collection.visitDepthFirst(visitor, this, ancestry);
            },

            /**
             * Return all children
             * @return {MessageModel[]}
             */
            getChildren: function () {
                return this.collection.where({ parentId: this.getId() });
            },

            /**
             * Return the parent idea
             * @return {MessageModel}
             */
            getParent: function () {
                return this.collection.findWhere({ '@id': this.get('parentId') });
            },

            /**
             * Return all segments in the annotator format
             * @return {Object[]}
             */
            getAnnotationsPromise: function () {
                var that = this,
                    deferred = $.Deferred();
                this.getExtractsPromise().done(
                    function (extracts) {
                        var ret = [];

                        _.each(extracts, function (extract) {
                            //Why this next line?  Benoitg-2014-10-03
                            extract.attributes.ranges = extract.attributes._ranges;
                            ret.push(_.clone(extract.attributes));
                        });

                        deferred.resolve(ret);
                    }
                );
                return deferred.promise();
            },

            /**
             * Return all segments in the annotator format
             * @return {Object[]}
             */
            getExtractsPromise: function () {
                var that = this,
                    deferred = $.Deferred();
                this.collection.collectionManager.getAllExtractsCollectionPromise().done(
                    function (allExtractsCollection) {
                        var extracts = allExtractsCollection.where({ idPost: that.getId() });
                        deferred.resolve(extracts);
                    }
                );
                return deferred.promise();
            },

            /**
             * Returns the toppest parent
             * @return {MessageModel}
             */
            getRootParent: function () {
                if (this.get('parentId') === null) {
                    return null;
                }

                var parent = this.getParent(),
                    current = null;

                do {

                    if (parent) {
                        current = parent;
                        parent = parent.get('parentId') !== null ? parent.getParent() : null;
                    } else {
                        parent = null;
                    }

                } while (parent !== null);

                return current;

            },

            /** Return a promise for the post's creator
             * @return {$.Defered.Promise}
             */
            getCreatorPromise: function () {
                var that = this,
                    deferred = $.Deferred();
                this.collection.collectionManager.getAllUsersCollectionPromise().done(
                    function (allUsersCollection) {
                        var creatorId = that.get('idCreator');
                        deferred.resolve(allUsersCollection.getById(creatorId));
                    }
                );
                return deferred.promise();
            },

            /**
             * @event
             */
            onAttrChange: function () {
                this.save(null, {
                    success: function (model, resp) {
                    },
                    error: function (model, resp) {
                        console.error('ERROR: onAttrChange', resp);
                    }
                });
            },

            /**
             * Set the `read` property
             * @param {Boolean} value
             */
            setRead: function (value) {
                var user = Ctx.getCurrentUser();

                if (user.isUnknownUser()) {
                    // Unknown User can't mark as read
                    return;
                }

                var isRead = this.get('read');
                if (value === isRead) {
                    return; // Nothing to do
                }

                this.set('read', value, { silent: true });

                var that = this,
                    url = Ctx.getApiUrl('post_read/') + this.getId(),
                    ajax;

                ajax = $.ajax(url, {
                    method: 'PUT',
                    data: JSON.stringify({ 'read': value }),
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function (data) {
                        that.trigger('change:read', [value]);
                        that.trigger('change', that);
                        //So the unread count is updated in the ideaList
                        Assembl.reqres.request('ideas:update', data.ideas);
                    }
                });
            }
        });


        var MessageCollection = Base.Collection.extend({
            /**
             * The url
             * @type {String}
             */
            url: Ctx.getApiUrl("posts?view=id_only"),

            /**
             * The model
             * @type {MessageModel}
             */
            model: MessageModel,

            /** Our data is inside the posts array */
            parse: function (response) {
                return response.posts;
            },

            /**
             * Traversal function.
             * @param visitor visitor function.  If visitor returns true, traversal continues
             * @return {Object[]}
             */
            visitDepthFirst: function (visitor, message, ancestry) {
                if (ancestry === undefined) {
                    ancestry = [];
                }
                if (message === undefined) {
                    var rootMessages = this.where({ parentId: null });
                    for (var i in rootMessages) {
                        this.visitDepthFirst(visitor, rootMessages[i], ancestry);
                    }
                    return;
                }
                if (visitor(message, ancestry)) {
                    //Copy ancestry
                    ancestry = ancestry.slice(0);
                    ancestry.push(message);
                    var children = _.sortBy(message.getChildren(), function (child) {
                        return child.get('date');
                    });
                    for (var i in children) {
                        this.visitDepthFirst(visitor, children[i], ancestry);
                    }
                }
            }


        });

        return {
            Model: MessageModel,
            Collection: MessageCollection
        };

    });
