'use strict';

var objectTreeRenderVisitor = require('./visitors/objectTreeRenderVisitor.js'),
    Raven = require('raven-js'),
    _ = require('../shims/underscore.js'),
    $ = require('../shims/jquery.js'),
    Assembl = require('../app.js'),
    Ctx = require('../common/context.js'),
    MessageModel = require('../models/message.js'),
    Synthesis = require('../models/synthesis.js'),
    Idea = require('../models/idea.js'),
    Permissions = require('../utils/permissions.js'),
    IdeaFamilyView = require('./ideaFamily.js'),
    IdeaInSynthesisView = require('./ideaInSynthesis.js'),
    PanelSpecTypes = require('../utils/panelSpecTypes.js'),
    AssemblPanel = require('./assemblPanel.js'),
    i18n = require('../utils/i18n.js'),
    EditableField = require('./editableField.js'),
    CKEditorField = require('./ckeditorField.js'),
    CollectionManager = require('../common/collectionManager.js'),
    Promise = require('bluebird');


var SynthesisPanel = AssemblPanel.extend({
    template: '#tmpl-synthesisPanel',
    panelType: PanelSpecTypes.SYNTHESIS_EDITOR,
    className: 'synthesisPanel',
    gridSize: AssemblPanel.prototype.SYNTHESIS_PANEL_GRID_SIZE,
    /**
     * @init
     */
    initialize: function (obj) {
        Object.getPrototypeOf(Object.getPrototypeOf(this)).initialize.apply(this, arguments);
        var that = this,
            collectionManager = new CollectionManager();

        //This is used if the panel is displayed as part of a message
        // that publishes this synthesis
        this.messageListView = obj.messageListView;
        this.ideas = new Idea.Collection();
        Promise.join(collectionManager.getAllSynthesisCollectionPromise(),
                    collectionManager.getAllIdeasCollectionPromise(),
            function (synthesisCollection, allIdeasCollection) {
                var rootIdea = allIdeasCollection.getRootIdea(),
                    raw_ideas;

                if (!that.model) {
                    //If unspecified, we find the next_synthesis
                    that.model = _.find(synthesisCollection.models, function (model) {
                        return model.get('is_next_synthesis');
                    });
                }
                raw_ideas = that.model.get('ideas');
                //console.log("Raw Ideas from model: ", raw_ideas)
                if (raw_ideas) {
                    var ideas = [];
                    _.each(raw_ideas, function (raw_idea) {
                        //console.log(raw_idea);
                        var idea = allIdeasCollection.get(raw_idea['@id']);
                        if (idea) {
                            ideas.push(idea);
                        }
                        else {
                            console.log("synthesisPanel:render():  This shoudn't happen, fix toombstone support?")
                        }
                    });
                    that.ideas.reset(ideas);
                }
                that.listenTo(that.ideas, 'add remove reset', that.render);

                //modelEvents should handler this
                //that.listenTo(that.model, 'reset change', that.render);
            });


        Assembl.commands.setHandler('synthesisPanel:render', this.render);
    },

    events: {
        'click .synthesisPanel-publishButton': 'publish'
    },

    modelEvents:{
      'reset change':'render'
    },

    getTitle: function () {
        return i18n.gettext('Synthesis');
    },

    /**
     * The model
     * @type {Synthesis}
     */
    model: null,

    /**
     * Flag
     * @type {Boolean}
     */
    collapsed: false,

    serializeData: function () {
        var currentUser = Ctx.getCurrentUser(),
            canSend = currentUser.can(Permissions.SEND_SYNTHESIS),
            canEdit = currentUser.can(Permissions.EDIT_SYNTHESIS),
            data = {
                canSend: canSend,
                canEdit: canEdit,
                Ctx: Ctx
            };

        if (this.model)
            data = _.extend(this.model.toJSON(), data);

        return data;
    },

    /**
     * The render
     * @return {SynthesisPanel}
     */
    onRender: function () {
        if (Ctx.debugRender) {
            console.log("synthesisPanel:onRender() is firing");
        }
        var that = this,
            view_data = {},
            order_lookup_table = [],
            roots = [],
            collectionManager = new CollectionManager(),
            canEdit = Ctx.getCurrentUser().can(Permissions.EDIT_SYNTHESIS);

        Ctx.removeCurrentlyDisplayedTooltips(this.$el);

        Promise.join(collectionManager.getAllSynthesisCollectionPromise(),
            collectionManager.getAllIdeasCollectionPromise(),
            function (synthesisCollection, allIdeasCollection) {
                // Getting the scroll position
                if (!that.model) {
                    window.setTimeout(function () {
                        that.render();
                    }, 30);
                    return;
                }
                var body = that.$('.body-synthesis'),
                    y = body.get(0) ? body.get(0).scrollTop : 0,
                    synthesis_is_published = that.model.get("published_in_post"),
                    rootIdea = allIdeasCollection.getRootIdea();

                Ctx.initTooltips(that.$el);
                function inSynthesis(idea) {
                    if (idea.hidden) {
                        return false;
                    }
                    var retval;
                    if (that.model.get('is_next_synthesis')) {
                        //This special case is so we get instant feedback before
                        //the socket sends changes
                        retval = idea != rootIdea && idea.get('inNextSynthesis')
                    }
                    else {
                        retval = idea != rootIdea && that.ideas.contains(idea)
                    }
                    //console.log("Checking",idea,"returning:", retval, "synthesis is next synthesis:", that.model.get('is_next_synthesis'));
                    return retval
                };
                if (rootIdea) {
                    rootIdea.visitDepthFirst(objectTreeRenderVisitor(view_data, order_lookup_table, roots, inSynthesis));
                }
                _.each(roots, function append_recursive(idea) {
                    var rendered_idea_view = new IdeaFamilyView({
                            model: idea,
                            innerViewClass: IdeaInSynthesisView,
                            innerViewClassInitializeParams: {
                                synthesis: that.model,
                                messageListView: that.messageListView
                            }
                        }
                        , view_data);
                    that.$('.synthesisPanel-ideas').append(rendered_idea_view.render().el);
                });
                that.$('.body-synthesis').get(0).scrollTop = y;
                if (canEdit && !synthesis_is_published) {
                    var titleField = new EditableField({
                        model: that.model,
                        modelProp: 'subject'
                    });
                    titleField.renderTo(that.$('.synthesisPanel-title'));

                    var introductionField = new CKEditorField({
                        model: that.model,
                        modelProp: 'introduction'
                    });
                    introductionField.renderTo(that.$('.synthesisPanel-introduction'));

                    var conclusionField = new CKEditorField({
                        model: that.model,
                        modelProp: 'conclusion'
                    });
                    conclusionField.renderTo(that.$('.synthesisPanel-conclusion'));
                }
                else {
                    that.$('.synthesisPanel-title').html(that.model.get('subject'));
                    that.$('.synthesisPanel-introduction').html(that.model.get('introduction'));
                    that.$('.synthesisPanel-conclusion').html(that.model.get('conclusion'));
                }
            });

        return this;
    },

    /**
     * Publish the synthesis
     */
    publish: function () {
        var ok = confirm(i18n.gettext("Do you want to publish the synthesis?"));
        if (ok) {
            this._publish();
        }
    },

    /**
     * Publishes the synthesis
     */
    _publish: function () {
        this.blockPanel();

        var publishes_synthesis_id = this.model.id,
            that = this;

        var synthesisMessage = new MessageModel.Model({
            publishes_synthesis_id: publishes_synthesis_id,
            subject: "Not used",
            message: "Not used"
        });

        synthesisMessage.save(null, {
            success: function (model, resp) {
                alert(i18n.gettext("Synthesis has been successfully published!"));
                that.model = new Synthesis.Model({'@id': 'next_synthesis'});
                that.model.fetch();
                that.unblockPanel();
            },
            error: function (model, resp) {
                Raven.captureMessage('Failed publishing synthesis!');
                alert(i18n.gettext("Failed publishing synthesis!"));
                that.model = new Synthesis.Model({'@id': 'next_synthesis'});
                that.model.fetch();
                that.unblockPanel();
            }
        });

    }

});


module.exports = SynthesisPanel;

