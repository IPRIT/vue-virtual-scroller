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

var VirtualScroller = { render: function render() {
    var _vm = this;var _h = _vm.$createElement;var _c = _vm._self._c || _h;return _c(_vm.mainTag, { directives: [{ name: "observe-visibility", rawName: "v-observe-visibility", value: _vm.handleVisibilityChange, expression: "handleVisibilityChange" }], tag: "component", staticClass: "virtual-scroller", class: _vm.cssClass, on: { "&scroll": function scroll($event) {
          _vm.handleScroll($event);
        } } }, [_vm._t("before-container"), _vm._v(" "), _c(_vm.containerTag, { ref: "itemContainer", tag: "component", staticClass: "virtual-scroller__item-container", class: _vm.containerClass, style: _vm.itemContainerStyle }, [_vm._t("before-content"), _vm._v(" "), _c(_vm.contentTag, { ref: "items", tag: "component", staticClass: "virtual-scroller__items", class: _vm.contentClass, style: _vm.itemsStyle }, [_vm.renderers ? _vm._l(_vm.visibleItems, function (item, index) {
      return _c(_vm.renderers[item[_vm.typeField]], { key: _vm.keysEnabled && item[_vm.keyField] || undefined, tag: "component", staticClass: "virtual-scroller__item", attrs: { "item": item, "item-index": _vm.$_startIndex + index } });
    }) : [_vm._l(_vm.visibleItems, function (item, index) {
      return _vm._t("default", null, { item: item, itemIndex: _vm.$_startIndex + index, itemKey: _vm.keysEnabled && item[_vm.keyField] || undefined });
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
    heights: function heights() {
      if (this.isFloatingItemHeight) {
        var heights = {};
        var field = this.heightField;
        var accumulator = 0;
        for (var i = 0, length = this.items.length; i < length; i++) {
          accumulator += this.items[i][field] || 50;
          heights[i] = accumulator;
        }
        return heights;
      }
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

            console.info('[Container Height]:', _this2.$_height);

            if (_this2.isFloatingItemHeight) {
              _this2.$nextTick(function () {
                var isEqual = _this2.checkEqualHeights();
                if (!isEqual) {
                  _this2.updateDynamicItemsHeights();
                  _this2.updateVisibleItems(force);
                }
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

      // Variable height mode
      if (this.isFloatingItemHeight) {
        var heights = this.heights;
        var h = void 0;
        var a = 0;
        var b = l - 1;
        var i = ~~(l / 2);
        var oldI = void 0;

        // Searching for startIndex
        do {
          oldI = i;
          h = heights[i];
          if (h < scrollTop) {
            a = i;
          } else if (i < l && heights[i + 1] > scrollTop) {
            b = i;
          }
          i = ~~((a + b) / 2);
        } while (i !== oldI);
        i < 0 && (i = 0);
        startIndex = i;

        // Searching for endIndex
        for (endIndex = i; endIndex < l && heights[endIndex] < scrollBottom; endIndex++) {}

        if (endIndex === -1) {
          endIndex = this.items.length - 1;
        } else {
          endIndex++;
          // Bounds
          endIndex > l && (endIndex = l);
        }

        // For containers style
        offsetTop = i > 0 ? heights[i - 1] : 0;
        containerHeight = heights[l - 1];
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
    checkEqualHeights: function checkEqualHeights() {
      var _this3 = this;

      var children = this.$refs.items.children;
      return this.visibleItems.every(function (item, index) {
        if (children && children[index]) {
          var realItemHeight = children[index].offsetHeight;
          return item[_this3.heightField] === realItemHeight;
        }
      });
    },
    updateDynamicItemsHeights: function updateDynamicItemsHeights() {
      var children = this.$refs.items.children;
      for (var i = 0, length = this.visibleItems.length; i < length; ++i) {
        if (!children || !children[i]) {
          continue;
        }
        var realItemHeight = children[i].offsetHeight;
        var globalIndex = this.$_startIndex + i;
        if (this.items[globalIndex]) {
          if (typeof this.items[globalIndex][this.heightField] !== 'undefined') {
            this.items[globalIndex][this.heightField] = realItemHeight;
          } else {
            // create reactive property if not exist
            this.$set(this.items[globalIndex], this.heightField, realItemHeight);
          }
        }
      }
    },
    scrollToItem: function scrollToItem(index) {
      var scrollTop = void 0;
      if (this.isFloatingItemHeight) {
        scrollTop = index > 0 ? this.heights[index - 1] : 0;
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
      var _this4 = this;

      if (!this.$_scrollDirty) {
        this.$_scrollDirty = true;
        requestAnimationFrame(function () {
          _this4.$_scrollDirty = false;
          _this4.updateVisibleItems();
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
      var _this5 = this;

      if (this.$_ready && (isVisible || entry.boundingClientRect.width !== 0 || entry.boundingClientRect.height !== 0)) {
        this.$emit('visible');
        this.$nextTick(function () {
          _this5.updateVisibleItems();
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
  version: "1.0.1",
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

var GlobalVue$2 = null;
if (typeof window !== 'undefined') {
  GlobalVue$2 = window.Vue;
} else if (typeof global !== 'undefined') {
  GlobalVue$2 = global.Vue;
}
if (GlobalVue$2) {
  GlobalVue$2.use(plugin$4);
}

export default plugin$4;
export { VirtualScroller };
