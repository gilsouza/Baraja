/**
 * jquery.baraja.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2012, Codrops
 * http://www.codrops.com
 */
;
(function($, window, undefined) {

    'use strict';

    // global
    var Modernizr = window.Modernizr;

    jQuery.fn.reverse = [].reverse;

    $.Baraja = function(options, element) {

        this.$el = $(element);
        this._init(options);

    };

    // the options
    $.Baraja.defaults = {
        // if we want to specify a selector that triggers the next() function. example: '#baraja-nav-next'
        nextEl: '',
        // if we want to specify a selector that triggers the previous() function
        prevEl: '',
        // default transition speed
        speed: 300,
        // default transition easing
        easing: 'ease-in-out'
    };

    $.Baraja.prototype = {
        // Array to hold updatedStack callbacks
        _updatedStack: [],

        _init: function(options) {

            // options
            this.options = $.extend(true, {}, $.Baraja.defaults, options);

            var transEndEventNames = {
                'WebkitTransition': 'webkitTransitionEnd',
                'MozTransition': 'transitionend',
                'OTransition': 'oTransitionEnd',
                'msTransition': 'MSTransitionEnd',
                'transition': 'transitionend'
            };
            this.transEndEventName = transEndEventNames[Modernizr.prefixed('transition')];

            this._setDefaultFanSettings();

            this.$items = this.$el.children('li');
            this.itemsCount = this.$items.length;
            if (this.itemsCount === 0) {
                return false;
            }
            // support for CSS Transitions
            this.supportTransitions = Modernizr.csstransitions;
            // opened/closed deck
            this.closed = true;
            // lowest value for the z-index given to the items
            this.itemZIndexMin = 1000;
            // sets the item's z-index value
            this._setStack();
            // initialize some events
            this._initEvents();

        },
        _destroy: function() {

            this._close();
            this._finishEvents();
            this._resetTransition(this.$items);
            this._resetZindex(this.$items);

            this.$el = null;
            this.$items = null;
            this._updatedStack = null;

        },
        _setDefaultFanSettings: function() {

            this.fanSettings = {
                // speed for opening/closing
                speed: 500,
                // easing for opening/closing
                easing: 'ease-out',
                // difference/range of possible angles that the items will have
                // example: with range:90 and center:false the first item
                // will have 0deg and the last one 90deg;
                // if center:true, then the first one will have 45deg
                // and the last one -45deg; in both cases the difference is 90deg
                range: 90,
                // this defines the position of the first item 
                // (to the right, to the left)
                // and its angle (clockwise / counterclockwise)
                direction: 'right',
                // transform origin:
                // you can also pass a minX and maxX, meaning the left value 
                // will vary between minX and maxX 
                origin: {
                    x: 25,
                    y: 100
                },
                // additional translation of each item
                translation: 0,
                // if the cards should be centered after the transform 
                // is applied
                center: true,
                // add a random factor to the final transform
                scatter: false,
                // allow rotate card with retate(deg)
                rotate: true
            };

        },
        _validateDefaultFanSettings: function(settings) {

            if (!settings.origin) {
                settings.origin = this.fanSettings.origin;
            } else {
                settings.origin.x = settings.origin.x || this.fanSettings.origin.x;
                settings.origin.y = settings.origin.y || this.fanSettings.origin.y;
            }
            settings.speed = settings.speed || this.fanSettings.speed;
            settings.easing = settings.easing || this.fanSettings.easing;
            settings.direction = settings.direction || this.fanSettings.direction;
            settings.range = settings.range || this.fanSettings.range;
            settings.translation = settings.translation || this.fanSettings.translation;
            if (settings.rotate == undefined) {
                settings.rotate = this.fanSettings.rotate
            }
            if (settings.center == undefined) {
                settings.center = this.fanSettings.center
            }
            if (settings.scatter == undefined) {
                settings.scatter = this.fanSettings.scatter
            }

            this.direction = settings.direction;

            return settings;

        },
        _setStack: function($items) {

            var self = this;
            $items = $items || this.$items;

            $items.each(function(i) {

                $(this).css('z-index', self.itemZIndexMin + self.itemsCount - 1 - i);

            });

        },
        // Subscriber method for 'updatedStack' event
        _onUpdatedStack: function(callback) {

                if (typeof(callback) === 'function') {
                        this._updatedStack.push(callback);
                }

        },
        // Unscriber method for 'updatedStack' event
        _offUpdatedStack: function(callback) {

                if (typeof(callback) === 'function') {              
                        this._updatedStack.splice(this._updatedStack.indexOf(callback), 1);                                
                }

        },
        // By Default the function sort use id
        _orderStack: function(orderBy) {
            
            this._resetZindex(this.$items);

            if (typeof orderBy === 'function') {

                this.$items.detach().sort(orderBy).appendTo(this.$el);

            } else {

                this.$items.detach().sort(function(a, b) {

                    var ca = parseInt(/[\d]+/.exec(a.id)[0]);
                    var cb = parseInt(/[\d]+/.exec(b.id)[0]);
                    return ( ca === cb ) ? 0 : ( ca > cb ? 1 : -1 );

                }).appendTo(this.$el);

            }

            this._setStack();

        },
        _updateStack: function($el, dir) {

            var currZIndex = Number($el.css('z-index')),
                newZIndex = dir === 'next' ? this.itemZIndexMin - 1 : this.itemZIndexMin + this.itemsCount,
                extra = dir === 'next' ? '+=1' : '-=1';

            $el.css('z-index', newZIndex);

            this.$items.filter(function() {

                var zIdx = Number($(this).css('z-index')),
                    cond = dir === 'next' ? zIdx < currZIndex : zIdx > currZIndex

                return cond;

            }).css('z-index', extra);

            this._updatedStack.forEach(function(callback) {
                callback.call();
            });

        },
        // Returns the element at the top of the deck
        _getTopStackElement : function() {     

                var max = -999, $el;
                this.$items.each( function( i ) {
                        var zIndex = $( this ).css( 'z-index' ) - 0;
                        if (zIndex > max) {
                                max = zIndex;
                                $el = $( this );
                        }
                } );

                return $el;

        },
        _initEvents: function() {

            var self = this;

            if (this.options.nextEl !== '') {

                $(this.options.nextEl).on('click.baraja', function() {

                    self._navigate('next');
                    return false;

                });

            }

            if (this.options.prevEl !== '') {

                $(this.options.prevEl).on('click.baraja', function() {

                    self._navigate('prev');
                    return false;

                });

            }

            this.$el.on('click.baraja', 'li', function() {

                if (!self.isAnimating) {

                    self._move2front($(this));

                }

            });

        },
        _finishEvents: function() {

            $(this.options.nextEl).off('click.baraja');
            $(this.options.prevEl).off('click.baraja');
            this.$el.off('click.baraja', 'li');
            this.$items.off(this.transEndEventName);

        },
        // TODO: save z-index in data on init
        _resetZindex: function($items) {

            $items = $items || this.$items;

            $items.each(function() {

                $(this).css('z-index', 0);

            });

        },
        _resetTransition: function($el) {

            $el.css({
                '-webkit-transition': 'none',
                '-moz-transition': 'none',
                '-ms-transition': 'none',
                '-o-transition': 'none',
                'transition': 'none'
            });

        },
        _setOrigin: function($el, x, y) {

            $el.css('transform-origin', x + '% ' + y + '%');

        },
        _setTransition: function($el, prop, speed, easing, delay) {

            if (!this.supportTransitions) {
                return false;
            }
            if (!prop) {
                prop = 'all';
            }
            if (!speed) {
                speed = this.options.speed;
            }
            if (!easing) {
                easing = this.options.easing;
            }
            if (!delay) {
                delay = 0;
            }

            var styleCSS = '';

            prop === 'transform' ?
                styleCSS = {
                    '-webkit-transition': '-webkit-transform ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-moz-transition': '-moz-transform ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-ms-transition': '-ms-transform ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-o-transition': '-o-transform ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    'transition': 'transform ' + speed + 'ms ' + easing + ' ' + delay + 'ms'
            } :
                styleCSS = {
                    '-webkit-transition': prop + ' ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-moz-transition': prop + ' ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-ms-transition': prop + ' ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    '-o-transition': prop + ' ' + speed + 'ms ' + easing + ' ' + delay + 'ms',
                    'transition': prop + ' ' + speed + 'ms ' + easing + ' ' + delay + 'ms'
            }

            $el.css(styleCSS);

        },
        _applyTransition: function($el, styleCSS, fncomplete, force) {

            if (this.supportTransitions) {

                if (fncomplete) {

                    $el.on(this.transEndEventName, fncomplete);

                    if (force) {
                        fncomplete.call();
                    }

                }

                setTimeout(function() {
                    $el.css(styleCSS);
                }, 25);

            } else {

                $el.css(styleCSS);

                if (fncomplete) {

                    fncomplete.call();

                }

            }

        },
        _navigate: function(dir) {

            this.closed = false;

            var self = this,
                extra = 15,
                cond = dir === 'next' ? self.itemZIndexMin + self.itemsCount - 1 : self.itemZIndexMin,
                $item = this.$items.filter(function() {

                    return Number($(this).css('z-index')) === cond;

                }),
                translation = dir === 'next' ? $item.outerWidth(true) + extra : $item.outerWidth(true) * -1 - extra,
                rotation = dir === 'next' ? 5 : 5 * -1;

            this._setTransition($item, 'transform', this.options.speed, this.options.easing);

            this._applyTransition($item, {
                transform: 'translate(' + translation + 'px) rotate(' + rotation + 'deg)'
            }, function() {

                $item.off(self.transEndEventName);
                self._updateStack($item, dir);

                self._applyTransition($item, {
                    transform: 'translate(0px) rotate(0deg)'
                }, function() {

                    $item.off(self.transEndEventName);
                    self.isAnimating = false;
                    self.closed = true;

                });

            });

        },
        _move2front: function($item) {

            this.isAnimating = true;

            var self = this,
                isTop = Number($item.css('z-index')) === this.itemZIndexMin + this.itemsCount - 1,
                callback = isTop ? function() {
                    self.isAnimating = false;
                } : function() {
                    return false;
                },
                $item = isTop ? null : $item;

            // if it's the one with higher z-index, just close the baraja
            if (!this.closed) {

                this._close(callback, $item);

            } else {

                this._fan();

            }

            if (isTop) {
                return false;
            }

            this._resetTransition($item);
            this._setOrigin($item, 50, 50);

            $item.css({
                opacity: 0,
                transform: 'scale(2) translate(100px) rotate(20deg)'
            });

            this._updateStack($item, 'prev');

            setTimeout(function() {

                self._setTransition($item, 'all', self.options.speed, 'ease-in');
                self._applyTransition($item, {
                    transform: 'none',
                    opacity: 1
                }, function() {

                    $item.off(self.transEndEventName);
                    self.isAnimating = false;

                });

            }, this.options.speed / 2);

        },
        _close: function(callback, $item) {

            var self = this,
                $items = self.$items,
                force = this.closed ? true : false;

            if ($item) {
                $items = $items.not($item);
            }

            this._applyTransition($items, {
                transform: 'none'
            }, function() {

                self.closed = true;
                $items.off(self.transEndEventName);
                self._resetTransition($items);
                setTimeout(function() {

                    self._setOrigin($items, 50, 50);

                    if (callback) {
                        callback.call();
                    }

                }, 25);

            }, force);

        },
        _fan: function(settings) {

            var self = this;

            this.closed = false;

            settings = this._validateDefaultFanSettings(settings || {});

            // set transform origins
            // if settings.rotate = true
            if (settings.rotate) {

                // set transform origins
                // if minX and maxX are passed:
                if (settings.origin.minX && settings.origin.maxX) {

                    var max = settings.origin.maxX,
                        min = settings.origin.minX,
                        stepOrigin = (max - min) / this.itemsCount;

                    this.$items.each(function(i) {

                        var $el = $(this),
                            pos = self.itemsCount - 1 - (Number($el.css('z-index')) - self.itemZIndexMin),
                            originX = pos * (max - min + stepOrigin) / self.itemsCount + min;

                        if (settings.direction === 'left') {

                            originX = max + min - originX;

                        }

                        self._setOrigin($(this), originX, settings.origin.y);

                    });

                } else {

                    this._setOrigin(this.$items, settings.origin.x, settings.origin.y);

                }
            }

            this._setTransition(this.$items, 'transform', settings.speed, settings.easing);

            var stepBase = settings.range / (this.itemsCount - 1),
                stepTranslation = settings.translation / (this.itemsCount - 1),
                cnt = 0;

            this.$items.each(function(i) {

                var $el = $(this),
                    pos = self.itemsCount - 1 - (Number($el.css('z-index')) - self.itemZIndexMin),
                    val = settings.center ? settings.range / 2 : settings.range,
                    step = val - stepBase * pos,
                    position = stepTranslation * (self.itemsCount - pos - 1);

                if (settings.direction === 'left') {

                    step *= -1;
                    position *= -1;

                }

                if (settings.scatter) {

                    var extraStep = Math.floor(Math.random() * stepBase),
                        extraPosition = Math.floor(Math.random() * stepTranslation);

                    // not for the first item..
                    if (pos !== self.itemsCount - 1) {

                        step = settings.direction === 'left' ? step + extraStep : step - extraStep;
                        position = settings.direction === 'left' ? position - extraPosition : position + extraPosition;

                    }

                }

                // save..
                $el.data({
                    translation: position,
                    step: step
                });

                self._applyTransition($el, {
                    // transform: 'translate(' + position + 'px) rotate(' + angle + 'deg)'
                    transform: settings.rotate ? 'translate(' + position + 'px) rotate(' + step + 'deg)' : 'translate(' + position + 'px,' + step + 'px)'
                }, function() {

                    ++cnt;
                    $el.off(self.transEndEventName);

                    if (cnt === self.itemsCount - 1) {
                        self.isAnimating = false;
                    }

                });

            });

        },
        // adds new elements to the deck
        _add: function($elems, transform) {

            var self = this,
                newElemsCount = $elems.length,
                cnt = 0;

            $elems.css('opacity', 0).appendTo(this.$el);

            // reset
            this.$items = this.$el.children('li');
            this.itemsCount = this.$items.length;

            // set z-indexes
            this._setStack($elems);

            // animate new items
            $elems.css('transform', !!transform ? transform : 'scale(1.8) translate(200px) rotate(15deg)').reverse().each(function(i) {

                var $el = $(this);

                self._setTransition($el, 'all', 500, 'ease-out', i * 200);
                self._applyTransition($el, {
                    transform: 'none',
                    opacity: 1
                }, function() {

                    ++cnt;

                    $el.off(self.transEndEventName);
                    self._resetTransition($el);

                    if (cnt === newElemsCount) {
                        self.isAnimating = false;
                    }

                });

            });

        },
        // remove elements in the deck
        _remove: function($elems, transform) {

            var self = this,
                removeElemsCount = $elems.length,
                cnt = 0;

            // displays elements to animate remove
            $elems.css('opacity', 1);
            // on top!
            $elems.css('z-index', 3000);

            // reset
            this.$items = this.$el.children('li');
            this.itemsCount = this.$items.length;

            // animate removed items
            $elems.css('transform', !!transform ? transform : 'scale(1.8) translate(200px) rotate(15deg)').each(function(i) {

                var $el = $(this);
                
                self._setTransition($el, 'all', 500, 'ease-out', i * 200);
                self._applyTransition($el, {
                    opacity: 0
                }, function() {

                    ++cnt;

                    $el.off(self.transEndEventName);
                    self._resetTransition($el);
                    
                    // use detach to keeps all jQuery data associated with the element
                    $el.detach();

                    if (cnt === removeElemsCount) {
                        self.isAnimating = false;
                        self._setStack(); 
                    }

                });

            });

        },
        _allowAction: function() {

            return this.itemsCount > 1;

        },
        _prepare: function(callback) {

            var self = this;

            if (!this.closed) {

                this._close(function() {

                    callback.call();

                });

            } else {

                callback.call();

            }

        },
        _dispatch: function(action, args, noPrepare) {

            var self = this;

            if (((action === this._fan || action === this._navigate) && !this._allowAction()) || this.isAnimating) {
                return false;
            }

            this.isAnimating = true;

            if (!noPrepare)
                this._prepare(function() {

                    action.call(self, args);

                });
            else
                action.call(self, args);                

        },
        // public method: closes the deck
        close: function(settings) {

            if (this.isAnimating) {
                return false;
            }
            this._close();

        },
        // public method: shows next item
        next: function() {

            this._dispatch(this._navigate, 'next');

        },
        // public method: shows previous item
        previous: function() {

            this._dispatch(this._navigate, 'prev');

        },
        // public method: opens the deck
        fan: function(settings) {

            this._dispatch(this._fan, settings);

        },
        // public method: adds new elements
        add: function($elems, transform) {

            this._dispatch(this._add, $elems, transform, true);

        },
        // public method: remove elements
        remove: function($elems, transform) {

            this._dispatch(this._remove, $elems, transform, true);

        },
        // public method: bring the element in front of the stack
        move2front : function( $elem ) {

                this._dispatch( this._move2front, $elem);

        },
        // public method: events subscriber
        on : function (eventName, callback) {

                if (eventName === 'updateStack') {
                        this._dispatch( this._onUpdatedStack, callback);
                }

        },
        // public method: events unscriber
        off : function (eventName, callback) {

                if (eventName === 'updateStack') {
                        this._dispatch( this._offUpdatedStack, callback);
                }

        },
        // public method: returns the jQuery element at the top of the stack
        getTopStackElement : function() {

                return this._getTopStackElement();

        },
        orderStack: function(orderBy) {

            this._dispatch(this._orderStack, orderBy);

        }

    };

    var logError = function(message) {

        if (window.console) {

            window.console.error(message);

        }

    };

    $.fn.baraja = function(options) {

        var instance = $.data(this, 'baraja');

        if (typeof options === 'string') {

            var args = Array.prototype.slice.call(arguments, 1);

            this.each(function() {

                if (!instance) {

                    logError("cannot call methods on baraja prior to initialization; " +
                        "attempted to call method '" + options + "'");
                    return;

                }

                if (!$.isFunction(instance[options]) || options.charAt(0) === "_") {

                    logError("no such method '" + options + "' for baraja instance");
                    return;

                }

                instance[options].apply(instance, args);

            });

        } else {

            this.each(function() {

                if (instance) {

                    instance._init();

                } else {

                    instance = $.data(this, 'baraja', new $.Baraja(options, this));

                }

            });

        }

        return instance;

    };

})(jQuery, window);