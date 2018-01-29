(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global['vue-virtual-repeater'] = {})));
}(this, (function (exports) { 'use strict';

/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the W3C SOFTWARE AND DOCUMENT NOTICE AND LICENSE.
 *
 *  https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 */

if (typeof window !== 'undefined') {
    (function(window, document) {
        if ('IntersectionObserver' in window &&
            'IntersectionObserverEntry' in window &&
            'intersectionRatio' in window.IntersectionObserverEntry.prototype) {

            // Minimal polyfill for Edge 15's lack of `isIntersecting`
            // See: https://github.com/w3c/IntersectionObserver/issues/211
            if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
                Object.defineProperty(window.IntersectionObserverEntry.prototype,
                    'isIntersecting', {
                        get: function () {
                            return this.intersectionRatio > 0;
                        }
                    });
            }
            return;
        }


        /**
         * An IntersectionObserver registry. This registry exists to hold a strong
         * reference to IntersectionObserver instances currently observering a target
         * element. Without this registry, instances without another reference may be
         * garbage collected.
         */
        var registry = [];


        /**
         * Creates the global IntersectionObserverEntry constructor.
         * https://w3c.github.io/IntersectionObserver/#intersection-observer-entry
         * @param {Object} entry A dictionary of instance properties.
         * @constructor
         */
        function IntersectionObserverEntry(entry) {
            this.time = entry.time;
            this.target = entry.target;
            this.rootBounds = entry.rootBounds;
            this.boundingClientRect = entry.boundingClientRect;
            this.intersectionRect = entry.intersectionRect || getEmptyRect();
            this.isIntersecting = !!entry.intersectionRect;

            // Calculates the intersection ratio.
            var targetRect = this.boundingClientRect;
            var targetArea = targetRect.width * targetRect.height;
            var intersectionRect = this.intersectionRect;
            var intersectionArea = intersectionRect.width * intersectionRect.height;

            // Sets intersection ratio.
            if (targetArea) {
                this.intersectionRatio = intersectionArea / targetArea;
            } else {
                // If area is zero and is intersecting, sets to 1, otherwise to 0
                this.intersectionRatio = this.isIntersecting ? 1 : 0;
            }
        }


        /**
         * Creates the global IntersectionObserver constructor.
         * https://w3c.github.io/IntersectionObserver/#intersection-observer-interface
         * @param {Function} callback The function to be invoked after intersection
         *     changes have queued. The function is not invoked if the queue has
         *     been emptied by calling the `takeRecords` method.
         * @param {Object=} opt_options Optional configuration options.
         * @constructor
         */
        function IntersectionObserver(callback, opt_options) {

            var options = opt_options || {};

            if (typeof callback != 'function') {
                throw new Error('callback must be a function');
            }

            if (options.root && options.root.nodeType != 1) {
                throw new Error('root must be an Element');
            }

            // Binds and throttles `this._checkForIntersections`.
            this._checkForIntersections = throttle(
                this._checkForIntersections.bind(this), this.THROTTLE_TIMEOUT);

            // Private properties.
            this._callback = callback;
            this._observationTargets = [];
            this._queuedEntries = [];
            this._rootMarginValues = this._parseRootMargin(options.rootMargin);

            // Public properties.
            this.thresholds = this._initThresholds(options.threshold);
            this.root = options.root || null;
            this.rootMargin = this._rootMarginValues.map(function(margin) {
                return margin.value + margin.unit;
            }).join(' ');
        }


        /**
         * The minimum interval within which the document will be checked for
         * intersection changes.
         */
        IntersectionObserver.prototype.THROTTLE_TIMEOUT = 100;


        /**
         * The frequency in which the polyfill polls for intersection changes.
         * this can be updated on a per instance basis and must be set prior to
         * calling `observe` on the first target.
         */
        IntersectionObserver.prototype.POLL_INTERVAL = null;

        /**
         * Use a mutation observer on the root element
         * to detect intersection changes.
         */
        IntersectionObserver.prototype.USE_MUTATION_OBSERVER = true;


        /**
         * Starts observing a target element for intersection changes based on
         * the thresholds values.
         * @param {Element} target The DOM element to observe.
         */
        IntersectionObserver.prototype.observe = function(target) {
            var isTargetAlreadyObserved = this._observationTargets.some(function(item) {
                return item.element == target;
            });

            if (isTargetAlreadyObserved) {
                return;
            }

            if (!(target && target.nodeType == 1)) {
                throw new Error('target must be an Element');
            }

            this._registerInstance();
            this._observationTargets.push({element: target, entry: null});
            this._monitorIntersections();
            this._checkForIntersections();
        };


        /**
         * Stops observing a target element for intersection changes.
         * @param {Element} target The DOM element to observe.
         */
        IntersectionObserver.prototype.unobserve = function(target) {
            this._observationTargets =
                this._observationTargets.filter(function(item) {

                    return item.element != target;
                });
            if (!this._observationTargets.length) {
                this._unmonitorIntersections();
                this._unregisterInstance();
            }
        };


        /**
         * Stops observing all target elements for intersection changes.
         */
        IntersectionObserver.prototype.disconnect = function() {
            this._observationTargets = [];
            this._unmonitorIntersections();
            this._unregisterInstance();
        };


        /**
         * Returns any queue entries that have not yet been reported to the
         * callback and clears the queue. This can be used in conjunction with the
         * callback to obtain the absolute most up-to-date intersection information.
         * @return {Array} The currently queued entries.
         */
        IntersectionObserver.prototype.takeRecords = function() {
            var records = this._queuedEntries.slice();
            this._queuedEntries = [];
            return records;
        };


        /**
         * Accepts the threshold value from the user configuration object and
         * returns a sorted array of unique threshold values. If a value is not
         * between 0 and 1 and error is thrown.
         * @private
         * @param {Array|number=} opt_threshold An optional threshold value or
         *     a list of threshold values, defaulting to [0].
         * @return {Array} A sorted list of unique and valid threshold values.
         */
        IntersectionObserver.prototype._initThresholds = function(opt_threshold) {
            var threshold = opt_threshold || [0];
            if (!Array.isArray(threshold)) threshold = [threshold];

            return threshold.sort().filter(function(t, i, a) {
                if (typeof t != 'number' || isNaN(t) || t < 0 || t > 1) {
                    throw new Error('threshold must be a number between 0 and 1 inclusively');
                }
                return t !== a[i - 1];
            });
        };


        /**
         * Accepts the rootMargin value from the user configuration object
         * and returns an array of the four margin values as an object containing
         * the value and unit properties. If any of the values are not properly
         * formatted or use a unit other than px or %, and error is thrown.
         * @private
         * @param {string=} opt_rootMargin An optional rootMargin value,
         *     defaulting to '0px'.
         * @return {Array<Object>} An array of margin objects with the keys
         *     value and unit.
         */
        IntersectionObserver.prototype._parseRootMargin = function(opt_rootMargin) {
            var marginString = opt_rootMargin || '0px';
            var margins = marginString.split(/\s+/).map(function(margin) {
                var parts = /^(-?\d*\.?\d+)(px|%)$/.exec(margin);
                if (!parts) {
                    throw new Error('rootMargin must be specified in pixels or percent');
                }
                return {value: parseFloat(parts[1]), unit: parts[2]};
            });

            // Handles shorthand.
            margins[1] = margins[1] || margins[0];
            margins[2] = margins[2] || margins[0];
            margins[3] = margins[3] || margins[1];

            return margins;
        };


        /**
         * Starts polling for intersection changes if the polling is not already
         * happening, and if the page's visibilty state is visible.
         * @private
         */
        IntersectionObserver.prototype._monitorIntersections = function() {
            if (!this._monitoringIntersections) {
                this._monitoringIntersections = true;

                // If a poll interval is set, use polling instead of listening to
                // resize and scroll events or DOM mutations.
                if (this.POLL_INTERVAL) {
                    this._monitoringInterval = setInterval(
                        this._checkForIntersections, this.POLL_INTERVAL);
                }
                else {
                    addEvent(window, 'resize', this._checkForIntersections, true);
                    addEvent(document, 'scroll', this._checkForIntersections, true);

                    if (this.USE_MUTATION_OBSERVER && 'MutationObserver' in window) {
                        this._domObserver = new MutationObserver(this._checkForIntersections);
                        this._domObserver.observe(document, {
                            attributes: true,
                            childList: true,
                            characterData: true,
                            subtree: true
                        });
                    }
                }
            }
        };


        /**
         * Stops polling for intersection changes.
         * @private
         */
        IntersectionObserver.prototype._unmonitorIntersections = function() {
            if (this._monitoringIntersections) {
                this._monitoringIntersections = false;

                clearInterval(this._monitoringInterval);
                this._monitoringInterval = null;

                removeEvent(window, 'resize', this._checkForIntersections, true);
                removeEvent(document, 'scroll', this._checkForIntersections, true);

                if (this._domObserver) {
                    this._domObserver.disconnect();
                    this._domObserver = null;
                }
            }
        };


        /**
         * Scans each observation target for intersection changes and adds them
         * to the internal entries queue. If new entries are found, it
         * schedules the callback to be invoked.
         * @private
         */
        IntersectionObserver.prototype._checkForIntersections = function() {
            var rootIsInDom = this._rootIsInDom();
            var rootRect = rootIsInDom ? this._getRootRect() : getEmptyRect();

            this._observationTargets.forEach(function(item) {
                var target = item.element;
                var targetRect = getBoundingClientRect(target);
                var rootContainsTarget = this._rootContainsTarget(target);
                var oldEntry = item.entry;
                var intersectionRect = rootIsInDom && rootContainsTarget &&
                    this._computeTargetAndRootIntersection(target, rootRect);

                var newEntry = item.entry = new IntersectionObserverEntry({
                    time: now(),
                    target: target,
                    boundingClientRect: targetRect,
                    rootBounds: rootRect,
                    intersectionRect: intersectionRect
                });

                if (!oldEntry) {
                    this._queuedEntries.push(newEntry);
                } else if (rootIsInDom && rootContainsTarget) {
                    // If the new entry intersection ratio has crossed any of the
                    // thresholds, add a new entry.
                    if (this._hasCrossedThreshold(oldEntry, newEntry)) {
                        this._queuedEntries.push(newEntry);
                    }
                } else {
                    // If the root is not in the DOM or target is not contained within
                    // root but the previous entry for this target had an intersection,
                    // add a new record indicating removal.
                    if (oldEntry && oldEntry.isIntersecting) {
                        this._queuedEntries.push(newEntry);
                    }
                }
            }, this);

            if (this._queuedEntries.length) {
                this._callback(this.takeRecords(), this);
            }
        };


        /**
         * Accepts a target and root rect computes the intersection between then
         * following the algorithm in the spec.
         * TODO(philipwalton): at this time clip-path is not considered.
         * https://w3c.github.io/IntersectionObserver/#calculate-intersection-rect-algo
         * @param {Element} target The target DOM element
         * @param {Object} rootRect The bounding rect of the root after being
         *     expanded by the rootMargin value.
         * @return {?Object} The final intersection rect object or undefined if no
         *     intersection is found.
         * @private
         */
        IntersectionObserver.prototype._computeTargetAndRootIntersection =
            function(target, rootRect) {

                // If the element isn't displayed, an intersection can't happen.
                if (window.getComputedStyle(target).display == 'none') return;

                var targetRect = getBoundingClientRect(target);
                var intersectionRect = targetRect;
                var parent = getParentNode(target);
                var atRoot = false;

                while (!atRoot) {
                    var parentRect = null;
                    var parentComputedStyle = parent.nodeType == 1 ?
                        window.getComputedStyle(parent) : {};

                    // If the parent isn't displayed, an intersection can't happen.
                    if (parentComputedStyle.display == 'none') return;

                    if (parent == this.root || parent == document) {
                        atRoot = true;
                        parentRect = rootRect;
                    } else {
                        // If the element has a non-visible overflow, and it's not the <body>
                        // or <html> element, update the intersection rect.
                        // Note: <body> and <html> cannot be clipped to a rect that's not also
                        // the document rect, so no need to compute a new intersection.
                        if (parent != document.body &&
                            parent != document.documentElement &&
                            parentComputedStyle.overflow != 'visible') {
                            parentRect = getBoundingClientRect(parent);
                        }
                    }

                    // If either of the above conditionals set a new parentRect,
                    // calculate new intersection data.
                    if (parentRect) {
                        intersectionRect = computeRectIntersection(parentRect, intersectionRect);

                        if (!intersectionRect) break;
                    }
                    parent = getParentNode(parent);
                }
                return intersectionRect;
            };


        /**
         * Returns the root rect after being expanded by the rootMargin value.
         * @return {Object} The expanded root rect.
         * @private
         */
        IntersectionObserver.prototype._getRootRect = function() {
            var rootRect;
            if (this.root) {
                rootRect = getBoundingClientRect(this.root);
            } else {
                // Use <html>/<body> instead of window since scroll bars affect size.
                var html = document.documentElement;
                var body = document.body;
                rootRect = {
                    top: 0,
                    left: 0,
                    right: html.clientWidth || body.clientWidth,
                    width: html.clientWidth || body.clientWidth,
                    bottom: html.clientHeight || body.clientHeight,
                    height: html.clientHeight || body.clientHeight
                };
            }
            return this._expandRectByRootMargin(rootRect);
        };


        /**
         * Accepts a rect and expands it by the rootMargin value.
         * @param {Object} rect The rect object to expand.
         * @return {Object} The expanded rect.
         * @private
         */
        IntersectionObserver.prototype._expandRectByRootMargin = function(rect) {
            var margins = this._rootMarginValues.map(function(margin, i) {
                return margin.unit == 'px' ? margin.value :
                    margin.value * (i % 2 ? rect.width : rect.height) / 100;
            });
            var newRect = {
                top: rect.top - margins[0],
                right: rect.right + margins[1],
                bottom: rect.bottom + margins[2],
                left: rect.left - margins[3]
            };
            newRect.width = newRect.right - newRect.left;
            newRect.height = newRect.bottom - newRect.top;

            return newRect;
        };


        /**
         * Accepts an old and new entry and returns true if at least one of the
         * threshold values has been crossed.
         * @param {?IntersectionObserverEntry} oldEntry The previous entry for a
         *    particular target element or null if no previous entry exists.
         * @param {IntersectionObserverEntry} newEntry The current entry for a
         *    particular target element.
         * @return {boolean} Returns true if a any threshold has been crossed.
         * @private
         */
        IntersectionObserver.prototype._hasCrossedThreshold =
            function(oldEntry, newEntry) {

                // To make comparing easier, an entry that has a ratio of 0
                // but does not actually intersect is given a value of -1
                var oldRatio = oldEntry && oldEntry.isIntersecting ?
                    oldEntry.intersectionRatio || 0 : -1;
                var newRatio = newEntry.isIntersecting ?
                    newEntry.intersectionRatio || 0 : -1;

                // Ignore unchanged ratios
                if (oldRatio === newRatio) return;

                for (var i = 0; i < this.thresholds.length; i++) {
                    var threshold = this.thresholds[i];

                    // Return true if an entry matches a threshold or if the new ratio
                    // and the old ratio are on the opposite sides of a threshold.
                    if (threshold == oldRatio || threshold == newRatio ||
                        threshold < oldRatio !== threshold < newRatio) {
                        return true;
                    }
                }
            };


        /**
         * Returns whether or not the root element is an element and is in the DOM.
         * @return {boolean} True if the root element is an element and is in the DOM.
         * @private
         */
        IntersectionObserver.prototype._rootIsInDom = function() {
            return !this.root || containsDeep(document, this.root);
        };


        /**
         * Returns whether or not the target element is a child of root.
         * @param {Element} target The target element to check.
         * @return {boolean} True if the target element is a child of root.
         * @private
         */
        IntersectionObserver.prototype._rootContainsTarget = function(target) {
            return containsDeep(this.root || document, target);
        };


        /**
         * Adds the instance to the global IntersectionObserver registry if it isn't
         * already present.
         * @private
         */
        IntersectionObserver.prototype._registerInstance = function() {
            if (registry.indexOf(this) < 0) {
                registry.push(this);
            }
        };


        /**
         * Removes the instance from the global IntersectionObserver registry.
         * @private
         */
        IntersectionObserver.prototype._unregisterInstance = function() {
            var index = registry.indexOf(this);
            if (index != -1) registry.splice(index, 1);
        };


        /**
         * Returns the result of the performance.now() method or null in browsers
         * that don't support the API.
         * @return {number} The elapsed time since the page was requested.
         */
        function now() {
            return window.performance && performance.now && performance.now();
        }


        /**
         * Throttles a function and delays its executiong, so it's only called at most
         * once within a given time period.
         * @param {Function} fn The function to throttle.
         * @param {number} timeout The amount of time that must pass before the
         *     function can be called again.
         * @return {Function} The throttled function.
         */
        function throttle(fn, timeout) {
            var timer = null;
            return function () {
                if (!timer) {
                    timer = setTimeout(function() {
                        fn();
                        timer = null;
                    }, timeout);
                }
            };
        }


        /**
         * Adds an event handler to a DOM node ensuring cross-browser compatibility.
         * @param {Node} node The DOM node to add the event handler to.
         * @param {string} event The event name.
         * @param {Function} fn The event handler to add.
         * @param {boolean} opt_useCapture Optionally adds the even to the capture
         *     phase. Note: this only works in modern browsers.
         */
        function addEvent(node, event, fn, opt_useCapture) {
            if (typeof node.addEventListener == 'function') {
                node.addEventListener(event, fn, opt_useCapture || false);
            }
            else if (typeof node.attachEvent == 'function') {
                node.attachEvent('on' + event, fn);
            }
        }


        /**
         * Removes a previously added event handler from a DOM node.
         * @param {Node} node The DOM node to remove the event handler from.
         * @param {string} event The event name.
         * @param {Function} fn The event handler to remove.
         * @param {boolean} opt_useCapture If the event handler was added with this
         *     flag set to true, it should be set to true here in order to remove it.
         */
        function removeEvent(node, event, fn, opt_useCapture) {
            if (typeof node.removeEventListener == 'function') {
                node.removeEventListener(event, fn, opt_useCapture || false);
            }
            else if (typeof node.detatchEvent == 'function') {
                node.detatchEvent('on' + event, fn);
            }
        }


        /**
         * Returns the intersection between two rect objects.
         * @param {Object} rect1 The first rect.
         * @param {Object} rect2 The second rect.
         * @return {?Object} The intersection rect or undefined if no intersection
         *     is found.
         */
        function computeRectIntersection(rect1, rect2) {
            var top = Math.max(rect1.top, rect2.top);
            var bottom = Math.min(rect1.bottom, rect2.bottom);
            var left = Math.max(rect1.left, rect2.left);
            var right = Math.min(rect1.right, rect2.right);
            var width = right - left;
            var height = bottom - top;

            return (width >= 0 && height >= 0) && {
                top: top,
                bottom: bottom,
                left: left,
                right: right,
                width: width,
                height: height
            };
        }


        /**
         * Shims the native getBoundingClientRect for compatibility with older IE.
         * @param {Element} el The element whose bounding rect to get.
         * @return {Object} The (possibly shimmed) rect of the element.
         */
        function getBoundingClientRect(el) {
            var rect;

            try {
                rect = el.getBoundingClientRect();
            } catch (err) {
                // Ignore Windows 7 IE11 "Unspecified error"
                // https://github.com/w3c/IntersectionObserver/pull/205
            }

            if (!rect) return getEmptyRect();

            // Older IE
            if (!(rect.width && rect.height)) {
                rect = {
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top
                };
            }
            return rect;
        }


        /**
         * Returns an empty rect object. An empty rect is returned when an element
         * is not in the DOM.
         * @return {Object} The empty rect.
         */
        function getEmptyRect() {
            return {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                width: 0,
                height: 0
            };
        }

        /**
         * Checks to see if a parent element contains a child elemnt (including inside
         * shadow DOM).
         * @param {Node} parent The parent element.
         * @param {Node} child The child element.
         * @return {boolean} True if the parent node contains the child node.
         */
        function containsDeep(parent, child) {
            var node = child;
            while (node) {
                if (node == parent) return true;

                node = getParentNode(node);
            }
            return false;
        }


        /**
         * Gets the parent node of an element or its host element if the parent node
         * is a shadow root.
         * @param {Node} node The node whose parent to get.
         * @return {Node|null} The parent node or null if no parent exists.
         */
        function getParentNode(node) {
            var parent = node.parentNode;

            if (parent && parent.nodeType == 11 && parent.host) {
                // If the parent is a shadow root, return the host element.
                return parent.host;
            }
            return parent;
        }


        // Exposes the constructors globally.
        window.IntersectionObserver = IntersectionObserver;
        window.IntersectionObserverEntry = IntersectionObserverEntry;

    }(window, document));
}

function getInternetExplorerVersion() {
	var ua = window.navigator.userAgent;

	var msie = ua.indexOf('MSIE ');
	if (msie > 0) {
		// IE 10 or older => return version number
		return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
	}

	var trident = ua.indexOf('Trident/');
	if (trident > 0) {
		// IE 11 => return version number
		var rv = ua.indexOf('rv:');
		return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
	}

	var edge = ua.indexOf('Edge/');
	if (edge > 0) {
		// Edge (IE 12+) => return version number
		return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
	}

	// other browser
	return -1;
}

var isIE = void 0;

function initCompat() {
	if (!initCompat.init) {
		initCompat.init = true;
		isIE = getInternetExplorerVersion() !== -1;
	}
}

var ResizeObserver = { render: function render() {
		var _vm = this;var _h = _vm.$createElement;var _c = _vm._self._c || _h;return _c('div', { staticClass: "resize-observer", attrs: { "tabindex": "-1" } });
	}, staticRenderFns: [], _scopeId: 'data-v-b329ee4c',
	name: 'resize-observer',

	methods: {
		notify: function notify() {
			this.$emit('notify');
		},
		addResizeHandlers: function addResizeHandlers() {
			this._resizeObject.contentDocument.defaultView.addEventListener('resize', this.notify);
			if (this._w !== this.$el.offsetWidth || this._h !== this.$el.offsetHeight) {
				this.notify();
			}
		},
		removeResizeHandlers: function removeResizeHandlers() {
			if (this._resizeObject && this._resizeObject.onload) {
				if (!isIE && this._resizeObject.contentDocument) {
					this._resizeObject.contentDocument.defaultView.removeEventListener('resize', this.notify);
				}
				delete this._resizeObject.onload;
			}
		}
	},

	mounted: function mounted() {
		var _this = this;

		initCompat();
		this.$nextTick(function () {
			_this._w = _this.$el.offsetWidth;
			_this._h = _this.$el.offsetHeight;
		});
		var object = document.createElement('object');
		this._resizeObject = object;
		object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
		object.setAttribute('aria-hidden', 'true');
		object.onload = this.addResizeHandlers;
		object.type = 'text/html';
		if (isIE) {
			this.$el.appendChild(object);
		}
		object.data = 'about:blank';
		if (!isIE) {
			this.$el.appendChild(object);
		}
	},
	beforeDestroy: function beforeDestroy() {
		this.removeResizeHandlers();
	}
};

// Install the components
function install(Vue) {
	Vue.component('resize-observer', ResizeObserver);
	/* -- Add more components here -- */
}

/* -- Plugin definition & Auto-install -- */
/* You shouldn't have to modify the code below */

// Plugin
var plugin = {
	// eslint-disable-next-line no-undef
	version: "0.4.3",
	install: install
};

// Auto-install
var GlobalVue = null;
if (typeof window !== 'undefined') {
	GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
	GlobalVue = global.Vue;
}
if (GlobalVue) {
	GlobalVue.use(plugin);
}

function throwValueError(value) {
	if (value !== null && typeof value !== 'function') {
		throw new Error('observe-visibility directive expects a function as the value');
	}
}

var ObserveVisibility = {
	bind: function bind(el, _ref, vnode) {
		var value = _ref.value;

		if (typeof IntersectionObserver === 'undefined') {
			console.warn('[vue-observe-visibility] IntersectionObserver API is not available in your browser. Please install this polyfill: https://github.com/WICG/IntersectionObserver/tree/gh-pages/polyfill');
		} else {
			throwValueError(value);
			el._vue_visibilityCallback = value;
			var observer = el._vue_intersectionObserver = new IntersectionObserver(function (entries) {
				var entry = entries[0];
				if (el._vue_visibilityCallback) {
					el._vue_visibilityCallback.call(null, entry.intersectionRatio > 0, entry);
				}
			});
			// Wait for the element to be in document
			vnode.context.$nextTick(function () {
				observer.observe(el);
			});
		}
	},
	update: function update(el, _ref2) {
		var value = _ref2.value;

		throwValueError(value);
		el._vue_visibilityCallback = value;
	},
	unbind: function unbind(el) {
		if (el._vue_intersectionObserver) {
			el._vue_intersectionObserver.disconnect();
			delete el._vue_intersectionObserver;
			delete el._vue_visibilityCallback;
		}
	}
};

// Install the components
function install$1(Vue) {
	Vue.directive('observe-visibility', ObserveVisibility);
	/* -- Add more components here -- */
}

/* -- Plugin definition & Auto-install -- */
/* You shouldn't have to modify the code below */

// Plugin
var plugin$2 = {
	// eslint-disable-next-line no-undef
	version: "0.3.1",
	install: install$1
};

// Auto-install
var GlobalVue$1 = null;
if (typeof window !== 'undefined') {
	GlobalVue$1 = window.Vue;
} else if (typeof global !== 'undefined') {
	GlobalVue$1 = global.Vue;
}
if (GlobalVue$1) {
	GlobalVue$1.use(plugin$2);
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var consoleInfo = false;

function consoleLog() {
  var _console;

  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  consoleInfo && (_console = console).log.apply(_console, ['[Virtual Scroller]:'].concat(args));
}

var SumTree = function () {
  function SumTree() {
    classCallCheck(this, SumTree);

    this._tree = [];
    this._revertedTree = true;
  }

  /**
   * Allows to iterate over the instance
   * @return {{next: Function}}
   */


  createClass(SumTree, [{
    key: Symbol.iterator,
    value: function value() {
      var index = 0;
      return {
        next: function next() {
          return {
            value: this.sumAt(index++),
            done: index >= this._tree.length
          };
        }
      };
    }

    /**
     * Updating the tree between `from` and `to`
     * elements with custom values
     * @param {number[]} values
     * @param {number} from
     * @param {number} to
     */

  }, {
    key: 'update',
    value: function update(_ref) {
      var _ref$values = _ref.values,
          values = _ref$values === undefined ? [] : _ref$values,
          _ref$from = _ref.from,
          from = _ref$from === undefined ? 0 : _ref$from,
          _ref$to = _ref.to,
          to = _ref$to === undefined ? values.length - 1 : _ref$to;

      this._assertEqual(to - from + 1, values.length, 'Received lengths must be equal');
      this._assertEqual(values.length <= this._tree.length, true, 'Sub array must be less than original tree');
      this._assertEqual(to - from >= 0, true, '`From` must be less than `to`');

      consoleLog(from, to, values, 'length:', values.length);
      consoleLog('original tree:', this._tree.slice());

      if (this._revertedTree) {
        // updating reverted tree
        var prevValue = this._tree[to + 1];
        var diffValue = 0;
        var accumulator = prevValue || 0;
        for (var index = to, valuesIndex = values.length - 1; index >= from; --index) {
          accumulator += values[valuesIndex--];
          if (index === from) {
            diffValue = accumulator - this._tree[from];
          }
          this._tree[index] = accumulator;
        }
        // update the rest array before `from` index
        for (var _index = from - 1; _index >= 0; --_index) {
          this._tree[_index] += diffValue;
        }
      } else {
        // updating normal tree
        var _prevValue = this._tree[from - 1];
        var _diffValue = 0;
        var _accumulator = _prevValue || 0;
        for (var _index2 = from, _valuesIndex = 0; _index2 <= to; ++_index2) {
          _accumulator += values[_valuesIndex++];
          if (_index2 === to) {
            _diffValue = _accumulator - this._tree[to];
          }
          this._tree[_index2] = _accumulator;
        }
        // update the rest array after `to` index
        for (var _index3 = to + 1; _index3 < this._tree.length; ++_index3) {
          this._tree[_index3] += _diffValue;
        }
      }
      consoleLog('modified tree:', this._tree.slice());
    }

    /**
     * Returns sum of the element with specified index
     * @param {number} elementIndex
     * @return {number}
     */

  }, {
    key: 'sumAt',
    value: function sumAt(elementIndex) {
      return this.sumBetween(0, elementIndex);
    }

    /**
     * Returns sum between two elements with specified indexes
     * @param {number} fromIndex
     * @param {number} endIndex
     * @return {number}
     */

  }, {
    key: 'sumBetween',
    value: function sumBetween() {
      var fromIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var endIndex = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this._tree.length - 1;

      return this._revertedTree ? this._tree[fromIndex] - (this._tree[endIndex + 1] || 0) : this._tree[endIndex] - (this._tree[fromIndex - 1] || 0);
    }

    /**
     * Extends tree by `number` with pad `value`
     * @param {number} number
     * @param {number} value
     */

  }, {
    key: 'extendBy',
    value: function extendBy(number) {
      var value = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      consoleLog('adding ' + number + ' elements');
      this._tree = this._tree.concat(Array(number).fill(0));
      var newItems = Array(number).fill(value);
      this.update({
        from: this._tree.length - number,
        to: this._tree.length - 1,
        values: newItems
      });
    }

    /**
     * Reduce tree by `number`
     * @param number
     */

  }, {
    key: 'reduceBy',
    value: function reduceBy(number) {
      consoleLog('reducing by ' + number + ' elements');
      if (this._revertedTree) {
        var deletedSum = this._tree[this._tree.length - number];
        for (var index = this._tree.length - number - 1; index >= 0; --index) {
          this._tree[index] -= deletedSum;
        }
      }
      this._tree.splice(-number);
    }

    /**
     * Performance mode
     * `descending` - start is the most powerful for CPU but reduced to the end
     * other modes - start is the most expensive for CPU but better to the end
     * @default descending
     * @param {*} mode
     */

  }, {
    key: 'setPerformanceMode',
    value: function setPerformanceMode() {
      var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : SumTree.descending;

      // todo: fix wrong height with ascending mode (needs investigation)
      // although descending mode is more useful for us in most cases
      this._revertedTree = mode === SumTree.descending;
    }

    /**
     * Free memory by removing the tree
     */

  }, {
    key: 'clear',
    value: function clear() {
      this._tree = [];
    }

    /**
     * Assert that two values are identically with strict equal
     * @param {*} value1
     * @param {*} value2
     * @param {string} message
     * @private
     */

  }, {
    key: '_assertEqual',
    value: function _assertEqual(value1, value2, message) {
      if (value1 !== value2) {
        // throw new Error(message);
        console.error(value1, value2, message);
      }
    }
  }]);
  return SumTree;
}();

SumTree.descending = 1;
SumTree.ascending = 2;

var VirtualScroller = { render: function render() {
    var _vm = this;var _h = _vm.$createElement;var _c = _vm._self._c || _h;return _c(_vm.mainTag, { directives: [{ name: "observe-visibility", rawName: "v-observe-visibility", value: _vm.handleVisibilityChange, expression: "handleVisibilityChange" }], tag: "component", staticClass: "virtual-scroller", class: _vm.cssClass, style: _vm.itemContentStyle, on: { "&scroll": function scroll($event) {
          _vm.handleScroll($event);
        } } }, [_vm._t("before-container"), _vm._v(" "), _c(_vm.containerTag, { ref: "itemContainer", tag: "component", staticClass: "virtual-scroller__item-container", class: _vm.containerClass, style: _vm.itemContainerStyle }, [_vm._t("before-content"), _vm._v(" "), _c(_vm.contentTag, { ref: "items", tag: "component", staticClass: "virtual-scroller__items", class: _vm.contentClass, style: _vm.itemsStyle }, [_vm.renderers ? _vm._l(_vm.visibleItems, function (item, index) {
      return _c(_vm.renderers[item[_vm.typeField]], { key: _vm.keysEnabled && item[_vm.keyField] || undefined, tag: "component", staticClass: "virtual-scroller__item", attrs: { "item": item, "item-index": _vm.$_startIndex + index } });
    }) : [_vm._l(_vm.visibleItems, function (item, index) {
      return _vm._t("item", null, { item: item, itemIndex: _vm.$_startIndex + index, itemKey: _vm.keysEnabled && item[_vm.keyField] || undefined });
    })]], 2), _vm._v(" "), _vm._t("after-content")], 2), _vm._v(" "), _vm._t("after-container"), _vm._v(" "), _c('resize-observer', { on: { "notify": _vm.handleResize } })], 2);
  }, staticRenderFns: [],
  name: 'virtual-scroller',

  components: {
    ResizeObserver: ResizeObserver
  },

  directives: {
    ObserveVisibility: ObserveVisibility
  },

  props: {
    items: {
      type: Array,
      required: true
    },
    renderers: {
      default: null
    },
    itemHeight: {
      type: Number,
      default: null
    },
    maxContentHeight: {
      type: [Number, String],
      default: 500
    },
    anyHeight: {
      type: Boolean,
      default: false
    },
    typeField: {
      type: String,
      default: 'type'
    },
    keyField: {
      type: String,
      default: 'id'
    },
    heightField: {
      type: String,
      default: 'height'
    },
    mainTag: {
      type: String,
      default: 'div'
    },
    containerTag: {
      type: String,
      default: 'div'
    },
    containerClass: {
      default: null
    },
    contentTag: {
      type: String,
      default: 'div'
    },
    contentClass: {
      default: null
    },
    pageMode: {
      type: Boolean,
      default: false
    },
    buffer: {
      type: [Number, String],
      default: 200
    },
    poolSize: {
      type: [Number, String],
      default: 2000
    },
    prerender: {
      type: [Number, String],
      default: 0
    },
    emitUpdate: {
      type: Boolean,
      default: false
    },
    delayPreviousItems: {
      type: Boolean,
      default: false
    }
  },

  data: function data() {
    return {
      visibleItems: [],
      itemContainerStyle: null,
      itemsStyle: null,
      keysEnabled: true
    };
  },


  computed: {
    cssClass: function cssClass() {
      return {
        'virtual-scroller_mode_page': this.pageMode
      };
    },
    itemContentStyle: function itemContentStyle() {
      return {
        maxHeight: typeof this.maxContentHeight === 'number' ? this.maxContentHeight + 'px' : this.maxContentHeight
      };
    },
    isFloatingItemHeight: function isFloatingItemHeight() {
      return this.itemHeight === null || this.anyHeight;
    }
  },

  watch: {
    items: {
      handler: function handler() {
        this.updateVisibleItems(true);
      },

      deep: true
    },
    pageMode: function pageMode() {
      this.applyPageMode();
      this.updateVisibleItems(true);
    },

    itemHeight: 'setDirty'
  },

  created: function created() {
    this.$_ready = false;
    this.$_startIndex = 0;
    this.$_oldScrollTop = null;
    this.$_oldScrollBottom = null;
    this.$_offsetTop = 0;
    this.$_height = 0;
    this.$_scrollDirty = false;
    this.$_updateDirty = false;
    this.$_heights = [];
    this.$_sumTree = new SumTree();
    this.$_sumTree.setPerformanceMode(SumTree.descending);

    var prerender = parseInt(this.prerender);
    if (prerender > 0) {
      this.visibleItems = this.items.slice(0, prerender);
      this.$_length = this.visibleItems.length;
      this.$_endIndex = this.$_length - 1;
      this.$_skip = true;
    } else {
      this.$_endIndex = 0;
      this.$_length = 0;
      this.$_skip = false;
    }
  },
  mounted: function mounted() {
    var _this = this;

    this.applyPageMode();
    this.$nextTick(function () {
      _this.updateVisibleItems(true);
      _this.$_ready = true;
    });
  },
  beforeDestroy: function beforeDestroy() {
    this.removeWindowScroll();
    this.$_heights = [];
    this.$_sumTree.clear();
  },


  methods: {
    getScroll: function getScroll() {
      var el = this.$el;
      var scroll = void 0;

      if (this.pageMode) {
        var rect = el.getBoundingClientRect();
        var top = -rect.top;
        var height = window.innerHeight;
        if (top < 0) {
          height += top;
          top = 0;
        }
        if (top + height > rect.height) {
          height = rect.height - top;
        }
        scroll = {
          top: top,
          bottom: top + height
        };
      } else {
        scroll = {
          top: el.scrollTop,
          bottom: el.scrollTop + el.clientHeight
        };
      }

      if (scroll.bottom >= 0 && scroll.top <= scroll.bottom) {
        return scroll;
      } else {
        return null;
      }
    },
    updateVisibleItems: function updateVisibleItems() {
      var _this2 = this;

      var force = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

      if (!this.$_updateDirty) {
        this.$_updateDirty = true;
        this.$nextTick(function () {
          _this2.$_updateDirty = false;

          var l = _this2.items.length;
          var scroll = _this2.getScroll();
          var items = _this2.items;
          var containerHeight = void 0,
              offsetTop = void 0;

          if (!scroll) {
            return;
          }

          var startIndex = -1;
          var endIndex = -1;

          var buffer = parseInt(_this2.buffer);
          var poolSize = parseInt(_this2.poolSize);
          var scrollTop = ~~(scroll.top / poolSize) * poolSize - buffer;
          var scrollBottom = Math.ceil(scroll.bottom / poolSize) * poolSize + buffer;

          if (!force && (scrollTop === _this2.$_oldScrollTop && scrollBottom === _this2.$_oldScrollBottom || _this2.$_skip)) {
            _this2.$_skip = false;
            return;
          }

          _this2.$_oldScrollTop = scrollTop;
          _this2.$_oldScrollBottom = scrollBottom;

          var _computeFrameOptions = _this2.computeFrameOptions({ scrollTop: scrollTop, scrollBottom: scrollBottom });

          startIndex = _computeFrameOptions.startIndex;
          endIndex = _computeFrameOptions.endIndex;
          offsetTop = _computeFrameOptions.offsetTop;
          containerHeight = _computeFrameOptions.containerHeight;


          if (force || _this2.$_startIndex !== startIndex || _this2.$_endIndex !== endIndex || _this2.$_offsetTop !== offsetTop || _this2.$_height !== containerHeight || _this2.$_length !== l) {
            _this2.keysEnabled = !(startIndex > _this2.$_endIndex || endIndex < _this2.$_startIndex);

            _this2.itemContainerStyle = {
              height: containerHeight + 'px'
            };
            _this2.itemsStyle = {
              marginTop: offsetTop + 'px'
            };

            if (_this2.delayPreviousItems) {
              // Add next items
              _this2.visibleItems = items.slice(_this2.$_startIndex, endIndex);
              // Remove previous items
              _this2.$nextTick(function () {
                _this2.visibleItems = items.slice(startIndex, endIndex);
              });
            } else {
              _this2.visibleItems = items.slice(startIndex, endIndex);
            }

            _this2.emitUpdate && _this2.$emit('update', startIndex, endIndex);

            _this2.$_startIndex = startIndex;
            _this2.$_endIndex = endIndex;
            _this2.$_length = l;
            _this2.$_offsetTop = offsetTop;
            _this2.$_height = containerHeight;

            if (_this2.isFloatingItemHeight) {
              _this2.$nextTick(function () {
                _this2.updateDynamicItemsHeights();
              });
            }
          }
        });
      }
    },
    computeFrameOptions: function computeFrameOptions(_ref) {
      var scrollTop = _ref.scrollTop,
          scrollBottom = _ref.scrollBottom;

      var l = this.items.length;

      var offsetTop = void 0,
          containerHeight = void 0;
      var startIndex = -1;
      var endIndex = -1;

      // Dynamic height mode
      if (this.isFloatingItemHeight) {
        if (this.$_heights.length !== this.items.length) {
          this.updateHeightsLength();
        }
        var h = void 0;
        var a = 0;
        var b = l - 1;
        var i = ~~(l / 2);
        var oldI = void 0;

        // Searching for startIndex
        do {
          oldI = i;
          h = this.$_sumTree.sumAt(i); // heights[i];
          if (h < scrollTop) {
            a = i;
          } else if (i < l && this.$_sumTree.sumAt(i + 1) > scrollTop) {
            b = i;
          }
          i = ~~((a + b) / 2);
        } while (i !== oldI);
        i < 0 && (i = 0);
        startIndex = i;

        // Searching for endIndex
        for (endIndex = i; endIndex < l && this.$_sumTree.sumAt(endIndex) < scrollBottom; endIndex++) {}

        if (endIndex === -1) {
          endIndex = this.items.length - 1;
        } else {
          endIndex++;
          // Bounds
          endIndex > l && (endIndex = l);
        }

        // For containers style
        offsetTop = this.$_sumTree.sumAt(i - 1);
        containerHeight = this.$_sumTree.sumAt(l - 1);
      } else {
        // Fixed height mode
        startIndex = ~~(scrollTop / this.itemHeight);
        endIndex = Math.ceil(scrollBottom / this.itemHeight);

        // Bounds
        startIndex < 0 && (startIndex = 0);
        endIndex > l && (endIndex = l);

        offsetTop = startIndex * this.itemHeight;
        containerHeight = l * this.itemHeight;
      }

      return {
        startIndex: startIndex,
        endIndex: endIndex,
        offsetTop: offsetTop,
        containerHeight: containerHeight
      };
    },
    updateHeightsLength: function updateHeightsLength() {
      var diffIndexes = this.items.length - this.$_heights.length;
      if (diffIndexes > 0) {
        var tailItems = Array(diffIndexes).fill(this.itemHeight || 50);
        this.$_heights = this.$_heights.concat(tailItems);
        this.$_sumTree.extendBy(diffIndexes, this.itemHeight || 50);
      } else {
        this.$_heights.splice(diffIndexes);
        this.$_sumTree.reduceBy(Math.abs(diffIndexes));
      }
    },
    updateDynamicItemsHeights: function updateDynamicItemsHeights() {
      var children = this.$refs.items.children;
      var needTreeUpdate = false;

      for (var i = 0, length = this.visibleItems.length; i < length; ++i) {
        if (!children || !children[i]) {
          continue;
        }
        var realItemHeight = children[i].offsetHeight;
        var globalIndex = this.$_startIndex + i;
        if (this.$_heights[globalIndex] !== realItemHeight) {
          needTreeUpdate = true;
          this.$_heights[globalIndex] = realItemHeight;
        }
      }

      var _ref2 = [this.$_startIndex, this.$_startIndex + this.visibleItems.length - 1],
          from = _ref2[0],
          to = _ref2[1];

      if (needTreeUpdate && from < to) {
        this.$_sumTree.update({
          from: from,
          to: to,
          values: this.$_heights.slice(from, to + 1)
        });
      }
    },
    scrollToItem: function scrollToItem(index) {
      var scrollTop = void 0;
      if (this.isFloatingItemHeight) {
        scrollTop = this.$_sumTree.sumAt(index - 1);
      } else {
        scrollTop = index * this.itemHeight;
      }
      this.$el.scrollTop = scrollTop;
    },
    setDirty: function setDirty() {
      this.$_oldScrollTop = null;
      this.$_oldScrollBottom = null;
    },
    applyPageMode: function applyPageMode() {
      if (this.pageMode) {
        this.addWindowScroll();
      } else {
        this.removeWindowScroll();
      }
    },
    addWindowScroll: function addWindowScroll() {
      window.addEventListener('scroll', this.handleScroll, true);
      window.addEventListener('resize', this.handleResize);
    },
    removeWindowScroll: function removeWindowScroll() {
      window.removeEventListener('scroll', this.handleScroll, true);
      window.removeEventListener('resize', this.handleResize);
    },
    handleScroll: function handleScroll() {
      var _this3 = this;

      if (!this.$_scrollDirty) {
        this.$_scrollDirty = true;
        requestAnimationFrame(function () {
          _this3.$_scrollDirty = false;
          _this3.updateVisibleItems();
        });
      }
    },
    handleResize: function handleResize() {
      this.$emit('resize');
      if (this.$_ready) {
        this.updateVisibleItems();
      }
    },
    handleVisibilityChange: function handleVisibilityChange(isVisible, entry) {
      var _this4 = this;

      if (this.$_ready && (isVisible || entry.boundingClientRect.width !== 0 || entry.boundingClientRect.height !== 0)) {
        this.$emit('visible');
        this.$nextTick(function () {
          _this4.updateVisibleItems();
        });
      }
    }
  }
};

function registerComponents(Vue, prefix) {
  Vue.component(prefix + 'virtual-scroller', VirtualScroller);
}

var plugin$4 = {
  // eslint-disable-next-line no-undef
  version: "1.1.7",
  install: function install(Vue, options) {
    var finalOptions = Object.assign({}, {
      installComponents: true,
      componentsPrefix: ''
    }, options);

    if (finalOptions.installComponents) {
      registerComponents(Vue, finalOptions.componentsPrefix);
    }
  }
};

// Auto-install
var GlobalVue$2 = null;
if (typeof window !== 'undefined') {
  GlobalVue$2 = window.Vue;
} else if (typeof global !== 'undefined') {
  GlobalVue$2 = global.Vue;
}
if (GlobalVue$2) {
  GlobalVue$2.use(plugin$4);
}

exports.VirtualScroller = VirtualScroller;
exports.default = plugin$4;

Object.defineProperty(exports, '__esModule', { value: true });

})));
