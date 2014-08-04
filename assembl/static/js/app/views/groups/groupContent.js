define(function (require) {

    var Marionette = require('marionette'),
           Storage = require('objects/storage'),
         GroupItem = require('views/groups/groupItem');

    var groupContent = Marionette.CompositeView.extend({
        template: "#tmpl-groupContent",
        className: "groupItem",
        childView: GroupItem,
        childViewContainer: ".groupBody",
        /*childViewOptions: {
            groupManager: this
        },*/
        initialize: function(options){

            this.collection = new Backbone.Collection(_.toArray(this.model.attributes.group));
        },
        events:{
            'click .add-group':'addGroup',
            'click .close-group':'closeGroup',
            'click .lock-group':'lockGroup'
        },
        addGroup: function(){
            var self = this;

            var Modal = Backbone.Modal.extend({
                template: _.template($('#tmpl-create-group').html()),
                cancelEl:'.btn-cancel',
                initialize: function(){
                    this.$el.addClass('group-modal');
                },
                events:{
                    'click .js_selectItemGroup':'selectItemGroup',
                    'click .js_createGroup':'createGroup'
                },
                selectItemGroup: function(e){
                    var elm  = $(e.target).parent();

                    if(elm.hasClass('ideas')){
                        if($('.itemGroup.synthesis').hasClass('is-selected')){
                            $('.itemGroup.synthesis').removeClass('is-selected');
                        }
                        elm.addClass('is-selected');

                    } else if(elm.hasClass('synthesis')){
                        if($('.itemGroup.ideas').hasClass('is-selected')){
                            $('.itemGroup.ideas').removeClass('is-selected')
                        }
                        elm.addClass('is-selected');

                    } else {
                        if(elm.hasClass('is-selected')){
                            elm.removeClass('is-selected');
                        } else {
                            elm.addClass('is-selected');
                        }
                    }
                },
                createGroup: function(){
                    var items = [];

                    $('.itemGroup.is-selected').each(function(){
                        var item = $(this).children('a').attr('data-item');
                        items.push(item);
                    });

                    Storage.createGroupItem(items);

                    this.$el.unbind();
                    this.$el.remove();
                }

            });

            var modalView = new Modal();

            $('.modal').html(modalView.render().el);
        },

        closeGroup: function(){

            //TODO: delete reference to localStorage
            this.unbind();
            this.remove();
        },

        lockGroup: function(e){
            //that.stateButton = $(e.target).children('i');
            //that.toggleLock();
        }


    });

    return groupContent;
});