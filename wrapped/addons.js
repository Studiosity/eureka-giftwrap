(function(){
var define, requireModule, require, requirejs;

(function() {

  var _isArray;
  if (!Array.isArray) {
    _isArray = function (x) {
      return Object.prototype.toString.call(x) === "[object Array]";
    };
  } else {
    _isArray = Array.isArray;
  }

  var registry = {}, seen = {};
  var FAILED = false;

  var uuid = 0;

  function tryFinally(tryable, finalizer) {
    try {
      return tryable();
    } finally {
      finalizer();
    }
  }

  function unsupportedModule(length) {
    throw new Error("an unsupported module was defined, expected `define(name, deps, module)` instead got: `" + length + "` arguments to define`");
  }

  var defaultDeps = ['require', 'exports', 'module'];

  function Module(name, deps, callback, exports) {
    this.id       = uuid++;
    this.name     = name;
    this.deps     = !deps.length && callback.length ? defaultDeps : deps;
    this.exports  = exports || { };
    this.callback = callback;
    this.state    = undefined;
    this._require  = undefined;
  }


  Module.prototype.makeRequire = function() {
    var name = this.name;

    return this._require || (this._require = function(dep) {
      return require(resolve(dep, name));
    });
  }

  define = function(name, deps, callback) {
    if (arguments.length < 2) {
      unsupportedModule(arguments.length);
    }

    if (!_isArray(deps)) {
      callback = deps;
      deps     =  [];
    }

    registry[name] = new Module(name, deps, callback);
  };

  // we don't support all of AMD
  // define.amd = {};
  // we will support petals...
  define.petal = { };

  function Alias(path) {
    this.name = path;
  }

  define.alias = function(path) {
    return new Alias(path);
  };

  function reify(mod, name, seen) {
    var deps = mod.deps;
    var length = deps.length;
    var reified = new Array(length);
    var dep;
    // TODO: new Module
    // TODO: seen refactor
    var module = { };

    for (var i = 0, l = length; i < l; i++) {
      dep = deps[i];
      if (dep === 'exports') {
        module.exports = reified[i] = seen;
      } else if (dep === 'require') {
        reified[i] = mod.makeRequire();
      } else if (dep === 'module') {
        mod.exports = seen;
        module = reified[i] = mod;
      } else {
        reified[i] = requireFrom(resolve(dep, name), name);
      }
    }

    return {
      deps: reified,
      module: module
    };
  }

  function requireFrom(name, origin) {
    var mod = registry[name];
    if (!mod) {
      throw new Error('Could not find module `' + name + '` imported from `' + origin + '`');
    }
    return require(name);
  }

  function missingModule(name) {
    throw new Error('Could not find module ' + name);
  }
  requirejs = require = requireModule = function(name) {
    var mod = registry[name];


    if (mod && mod.callback instanceof Alias) {
      mod = registry[mod.callback.name];
    }

    if (!mod) { missingModule(name); }

    if (mod.state !== FAILED &&
        seen.hasOwnProperty(name)) {
      return seen[name];
    }

    var reified;
    var module;
    var loaded = false;

    seen[name] = { }; // placeholder for run-time cycles

    tryFinally(function() {
      reified = reify(mod, name, seen[name]);
      module = mod.callback.apply(this, reified.deps);
      loaded = true;
    }, function() {
      if (!loaded) {
        mod.state = FAILED;
      }
    });

    var obj;
    if (module === undefined && reified.module.exports) {
      obj = reified.module.exports;
    } else {
      obj = seen[name] = module;
    }

    if (obj !== null &&
        (typeof obj === 'object' || typeof obj === 'function') &&
          obj['default'] === undefined) {
      obj['default'] = obj;
    }

    return (seen[name] = obj);
  };

  function resolve(child, name) {
    if (child.charAt(0) !== '.') { return child; }

    var parts = child.split('/');
    var nameParts = name.split('/');
    var parentBase = nameParts.slice(0, -1);

    for (var i = 0, l = parts.length; i < l; i++) {
      var part = parts[i];

      if (part === '..') {
        if (parentBase.length === 0) {
          throw new Error('Cannot access parent module of root');
        }
        parentBase.pop();
      } else if (part === '.') { continue; }
      else { parentBase.push(part); }
    }

    return parentBase.join('/');
  }

  requirejs.entries = requirejs._eak_seen = registry;
  requirejs.clear = function(){
    requirejs.entries = requirejs._eak_seen = registry = {};
    seen = state = {};
  };
})();

define("dom-ruler", 
  ["dom-ruler/layout","dom-ruler/text","dom-ruler/styles","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var getLayout = __dependency1__.getLayout;
    var measureText = __dependency2__.measureText;
    var getStyles = __dependency3__.getStyles;

    __exports__.getLayout = getLayout;
    __exports__.measureText = measureText;
    __exports__.getStyles = getStyles;
  });
;define("dom-ruler/layout", 
  ["dom-ruler/styles","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var getStyles = __dependency1__.getStyles;
    var detectBoxSizing = __dependency1__.detectBoxSizing;

    /**
      Normalizes margins to return 'auto' or a number
     */
    var normalizeMargin = function (margin) {
      if (margin !== 'auto') {
        return parseInt(margin, 10);
      }
      return margin;
    };

    var getWindowLayout = function (window) {
      var width = window.innerWidth;
      var height = window.innerHeight;

      // IE<8 doesn't support window.innerWidth / window.outerWidth
      return {
        width:     width,
        height:    height,
        boxSizing: null,
        content:   { width: width, height: height },
        borders:   { width: width, height: height },
        margins:   {
          width:  window.outerWidth,
          height: window.outerHeight
        }
      };
    };

    var getDocumentLayout = function (document) {
      var width = Math.max(
        document.body.scrollWidth, document.documentElement.scrollWidth,
        document.body.offsetWidth, document.documentElement.offsetWidth,
        document.body.clientWidth, document.documentElement.clientWidth
      );
      var height = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      );

      // The document has no chrome
      return {
        width:    width,
        height:   height,
        boxSizing: null,
        content: { width: width, height: height },
        borders: { width: width, height: height },
        margins: { width: width, height: height }
      };
    };

    /**
      Computes the layout of an element that matches
      the inspector properties of the DOM element.
     */
    function getLayout(element) {
      // Handle window
      if ((window.Window && element instanceof Window) || // Standards
          element === window) {                           // Safari 5.1
        return getWindowLayout(element);
      }

      // Handle document
      if ((window.Document && element instanceof Document) || // Standards
          element === document) {                             // old IE
        return getDocumentLayout(element);
      }

      var boxSizing = detectBoxSizing(element);
      var content = {
        width:  element.offsetWidth,
        height: element.offsetHeight
      };
      var styles = getStyles(element);
      var layout = {
        width:     null,
        height:    null,
        boxSizing: boxSizing,
        content:   {},
        padding:   {},
        borders:   {},
        margins:   {}
      };
      var padding = {
        top:    parseInt(styles.paddingTop,        10),
        right:  parseInt(styles.paddingRight,      10),
        bottom: parseInt(styles.paddingBottom,     10),
        left:   parseInt(styles.paddingLeft,       10)
      };
      var borders = {
        top:    parseInt(styles.borderTopWidth,    10),
        right:  parseInt(styles.borderRightWidth,  10),
        bottom: parseInt(styles.borderBottomWidth, 10),
        left:   parseInt(styles.borderLeftWidth,   10)
      };
      var margins = {
        top:    normalizeMargin(styles.marginTop),
        right:  normalizeMargin(styles.marginRight),
        bottom: normalizeMargin(styles.marginBottom),
        left:   normalizeMargin(styles.marginLeft)
      };

      // Normalize the width and height so
      // they refer to the content
      content.width  -= borders.right + borders.left +
                        padding.right + padding.left;
      content.height -= borders.top + borders.bottom +
                        padding.top + padding.bottom;
      layout.content = content;

      padding.width  = content.width +
                       padding.left + padding.right;
      padding.height = content.height +
                       padding.top + padding.bottom;
      layout.padding = padding;

      borders.width  = padding.width +
                       borders.left + borders.right;
      borders.height = padding.height +
                       borders.top + borders.bottom;
      layout.borders = borders;

      // Provide the "true" width and height
      // of the box in terms of the current box model
      switch (boxSizing) {
      case 'border-box':
        layout.width  = borders.width;
        layout.height = borders.height;
        break;
      case 'padding-box':
        layout.width  = padding.width;
        layout.height = padding.height;
        break;
      default:
        layout.width  = content.width;
        layout.height = content.height;
      }

      if (margins.left !== 'auto' && margins.right !== 'auto') {
        margins.width = borders.width +
                        margins.left + margins.right;
      } else {
        margins.width = 'auto';
      }

      if (margins.top !== 'auto' && margins.bottom !== 'auto') {
        margins.height = borders.height +
                         margins.top + margins.bottom;
      } else {
        margins.height = 'auto';
      }
      layout.margins = margins;

      return layout;
    }

    __exports__.getLayout = getLayout;
  });
;define("dom-ruler/styles", 
  ["dom-ruler/utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var pluck = __dependency1__.pluck;
    var merge = __dependency1__.merge;

    // A list of all of the style properties
    // to copy over to our example element
    var LAYOUT_STYLES = [
      'maxWidth',
      'maxHeight',
      'paddingLeft',
      'paddingRight',
      'paddingTop',
      'paddingBottom',
      'borderLeftStyle',
      'borderRightStyle',
      'borderTopStyle',
      'borderBottomStyle',
      'borderLeftWidth',
      'borderRightWidth',
      'borderTopWidth',
      'borderBottomWidth',
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontVariant',
      'lineHeight',
      'whiteSpace',
      'letterSpacing',
      'wordWrap',
      'boxSizing',
      'MozBoxSizing',
      'textTransform',
      'textRendering',
      // Font feature settings
      'webkitFontFeatureSettings',
      'mozFontFeatureSettings',
      'msFontFeatureSettings',
      'oFontFeatureSettings',
      'fontFeatureSettings'
    ];

    var DEFAULT_BOX_SIZING;

    // Retrieve the computed style of the element
    var getStyles = function (element) {
      if (document.defaultView && document.defaultView.getComputedStyle) {
        return document.defaultView.getComputedStyle(element, null);
      }
      return element.currentStyle;
    };

    var copyStyles = function (element, targetElement) {
      var styles = pluck(getStyles(element), LAYOUT_STYLES);
      merge(targetElement.style, styles);
    };

    /**
      Detect the browser's default box sizing.
      This should detect old IE quirks and then
      provide the correct box model when detecting
      per-element box-sizing.

      @private
     */
    var detectDefaultBoxSizing = function () {
      var tester = document.createElement('div');
      var boxSizing;

      document.body.appendChild(tester);
      tester.style.cssText = 'width:24px; padding:10px; border:2px solid #000;' +
                             'box-sizing:content-box; -moz-box-sizing:content-box;';

      switch (tester.offsetWidth) {
      case 24:
        boxSizing = 'border-box';
        break;
      case 44:
        boxSizing = 'padding-box';
        break;
      case 48:
        boxSizing = 'content-box';
        break;
      }

      document.body.removeChild(tester);
      return boxSizing;
    };

    var detectBoxSizing = function (element) {
      // Detect the browser's default box sizing model
      if (DEFAULT_BOX_SIZING == null) {
        DEFAULT_BOX_SIZING = detectDefaultBoxSizing();
      }

      var styles = getStyles(element);
      return styles.boxSizing       ||
             styles.webkitBoxSizing ||
             styles.MozBoxSizing    ||
             styles.msBoxSizing     ||
             styles.oBoxSizing      ||
             DEFAULT_BOX_SIZING;
    };


    __exports__.getStyles = getStyles;
    __exports__.copyStyles = copyStyles;
    __exports__.detectBoxSizing = detectBoxSizing;
  });
;define("dom-ruler/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    // modified from
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
    var keys = Object.keys || (function () {
      var hasOwnProperty = Object.prototype.hasOwnProperty,
          hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
          dontEnums = [
            'toString',
            'toLocaleString',
            'valueOf',
            'hasOwnProperty',
            'isPrototypeOf',
            'propertyIsEnumerable',
            'constructor'
          ],
          dontEnumsLength = dontEnums.length;

      return function keys(obj) {
        if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
          throw new TypeError('Object.keys called on non-object');
        }

        var result = [], i;
        if (hasDontEnumBug) {
          for (i = 0; i < dontEnumsLength; i++) {
            if (hasOwnProperty.call(obj, dontEnums[i])) {
              result.push(dontEnums[i]);
            }
          }
        }
        return result;
      };
    }());

    var slice = Array.prototype.slice;

    var merge = function (target) {
      var mixins = slice.call(arguments, 1);
      for (var i = 0, len = mixins.length; i < len; i++) {
        var mixin = mixins[i] || {};
        var mixinKeys = keys(mixin);
        for (var j = 0, jLen = mixinKeys.length; j < jLen; j++) {
          var key = mixinKeys[j];
          target[key] = mixin[key];
        }
      }
      return target;
    };

    var pluck = function (object, array) {
      var pluckedProperties = {};
      for (var i = 0, len = array.length; i < len; i++) {
        var property = array[i];
        pluckedProperties[property] = object[property];
      }
      return pluckedProperties;
    };

    __exports__.keys = keys;
    __exports__.merge = merge;
    __exports__.pluck = pluck;
  });
;define("dom-ruler/text", 
  ["dom-ruler/styles","dom-ruler/utils","dom-ruler/layout","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var getStyles = __dependency1__.getStyles;
    var copyStyles = __dependency1__.copyStyles;
    var merge = __dependency2__.merge;
    var getLayout = __dependency3__.getLayout;

    var metricsCalculationElement = null;

    /**
      Prepare for measuring the layout of a string.
     */
    function prepareTextMeasurement(exampleElement, additionalStyles) {
      var element = metricsCalculationElement;
      additionalStyles = additionalStyles || {};

      if (metricsCalculationElement == null) {
        var parent = document.createElement('div');
        parent.id = "dom_ruler-text_measurer";
        parent.style.cssText = "position:absolute; left:-10010px; top:-10px;" +
                               "width:10000px; height:0px; overflow:hidden;" +
                               "visibility:hidden;";

        element = metricsCalculationElement = document.createElement('div');

        parent.appendChild(metricsCalculationElement);
        document.body.insertBefore(parent, null);
      }

      var styles = getStyles(exampleElement);
      copyStyles(exampleElement, element);

      // Explicitly set the `font` property for Mozilla
      var font = "";
      if (styles.font === "") {
        if (styles.fontStyle)   { font += styles.fontStyle   + " "; }
        if (styles.fontVariant) { font += styles.fontVariant + " "; }
        if (styles.fontWeight)  { font += styles.fontWeight  + " "; }
        if (styles.fontSize)    { font += styles.fontSize    + " "; }
        else                    { font += "10px";                   }
        if (styles.lineHeight)  { font += "/" + styles.lineHeight;  }

        font += " ";
        if (styles.fontFamily)  { font += styles.fontFamily; }
        else                    { font += "sans-serif";      }

        element.style.font = font;
      }

      merge(element.style, {
        position: "absolute",
        top:    "0px",
        right:  "auto",
        bottom: "auto",
        left:   "0px",
        width:  "auto",
        height: "auto"
      }, additionalStyles);

      return element;
    }

    /**
      Cleanup properties used by `measureString`
      setup in `prepareStringMeasurement`.
     */
    function teardownTextMeasurement() {
      // Remove any leftover styling from string measurements
      if (metricsCalculationElement) {
        metricsCalculationElement.innerHTML = "";
        metricsCalculationElement.className = "";
        metricsCalculationElement.setAttribute('style', '');
      }
    }

    function setText(string, escape) {
      var element = metricsCalculationElement;
      if (!escape) {
        element.innerHTML = string;

      // Escape the string by entering it as
      // a text node to the DOM element
      } else if (typeof element.innerText !== "undefined") {
        element.innerText = string;
      } else {
        element.textContent = string;
      }

      // Trigger a repaint so the height and width are correct
      // Webkit / Blink needs this to trigger a reflow
      element.style.overflow = 'visible';
      element.style.overflow = 'hidden';
    }

    /**
      Measures a string given the styles applied
      when setting up string measurements.

      @param string {String} The string to measure
      @param options {Object} A hash of values (whether to escape the value or not)
      @return {Object} The layout of the string passed in.
     */
    function measureText(string, styles, options) {
      if (options == null) {
        options = styles;
        styles = {};
      }
      merge({ escape: true, template: null, lines: false }, options);

      if (options.template == null) {
        throw new Error("A template element is required to measure text.");
      }

      prepareTextMeasurement(options.template, styles);

      var element = metricsCalculationElement;
      setText(string, options.escape);
      var metrics = getLayout(element);
      teardownTextMeasurement();

      return metrics;
    }

    __exports__.prepareTextMeasurement = prepareTextMeasurement;
    __exports__.setText = setText;
    __exports__.teardownTextMeasurement = teardownTextMeasurement;
    __exports__.measureText = measureText;
  });
define("ic-ajax",
  ["ember","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*!
     * ic-ajax
     *
     * - (c) 2013 Instructure, Inc
     * - please see license at https://github.com/instructure/ic-ajax/blob/master/LICENSE
     * - inspired by discourse ajax: https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/mixins/ajax.js#L19
     */

    var Ember = __dependency1__["default"] || __dependency1__;

    /*
     * jQuery.ajax wrapper, supports the same signature except providing
     * `success` and `error` handlers will throw an error (use promises instead)
     * and it resolves only the response (no access to jqXHR or textStatus).
     */

    function request() {
      return raw.apply(null, arguments).then(function(result) {
        return result.response;
      }, null, 'ic-ajax: unwrap raw ajax response');
    }

    __exports__.request = request;__exports__["default"] = request;

    /*
     * Same as `request` except it resolves an object with `{response, textStatus,
     * jqXHR}`, useful if you need access to the jqXHR object for headers, etc.
     */

    function raw() {
      return makePromise(parseArgs.apply(null, arguments));
    }

    __exports__.raw = raw;var __fixtures__ = {};
    __exports__.__fixtures__ = __fixtures__;
    /*
     * Defines a fixture that will be used instead of an actual ajax
     * request to a given url. This is useful for testing, allowing you to
     * stub out responses your application will send without requiring
     * libraries like sinon or mockjax, etc.
     *
     * For example:
     *
     *    defineFixture('/self', {
     *      response: { firstName: 'Ryan', lastName: 'Florence' },
     *      textStatus: 'success'
     *      jqXHR: {}
     *    });
     *
     * @param {String} url
     * @param {Object} fixture
     */

    function defineFixture(url, fixture) {
      if (fixture.response) {
        fixture.response = JSON.parse(JSON.stringify(fixture.response));
      }
      __fixtures__[url] = fixture;
    }

    __exports__.defineFixture = defineFixture;/*
     * Looks up a fixture by url.
     *
     * @param {String} url
     */

    function lookupFixture (url) {
      return __fixtures__ && __fixtures__[url];
    }

    __exports__.lookupFixture = lookupFixture;function makePromise(settings) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        var fixture = lookupFixture(settings.url);
        if (fixture) {
          if (fixture.textStatus === 'success' || fixture.textStatus == null) {
            return Ember.run.later(null, resolve, fixture);
          } else {
            return Ember.run.later(null, reject, fixture);
          }
        }
        settings.success = makeSuccess(resolve);
        settings.error = makeError(reject);
        Ember.$.ajax(settings);
      }, 'ic-ajax: ' + (settings.type || 'GET') + ' to ' + settings.url);
    };

    function parseArgs() {
      var settings = {};
      if (arguments.length === 1) {
        if (typeof arguments[0] === "string") {
          settings.url = arguments[0];
        } else {
          settings = arguments[0];
        }
      } else if (arguments.length === 2) {
        settings = arguments[1];
        settings.url = arguments[0];
      }
      if (settings.success || settings.error) {
        throw new Ember.Error("ajax should use promises, received 'success' or 'error' callback");
      }
      return settings;
    }

    function makeSuccess(resolve) {
      return function(response, textStatus, jqXHR) {
        Ember.run(null, resolve, {
          response: response,
          textStatus: textStatus,
          jqXHR: jqXHR
        });
      }
    }

    function makeError(reject) {
      return function(jqXHR, textStatus, errorThrown) {
        Ember.run(null, reject, {
          jqXHR: jqXHR,
          textStatus: textStatus,
          errorThrown: errorThrown
        });
      };
    }
  });
(function() {
    "use strict";
    var ember$data$lib$system$model$errors$invalid$$create = Ember.create;
    var ember$data$lib$system$model$errors$invalid$$EmberError = Ember.Error;

    /**
      A `DS.InvalidError` is used by an adapter to signal the external API
      was unable to process a request because the content was not
      semantically correct or meaningful per the API. Usually this means a
      record failed some form of server side validation. When a promise
      from an adapter is rejected with a `DS.InvalidError` the record will
      transition to the `invalid` state and the errors will be set to the
      `errors` property on the record.

      For Ember Data to correctly map errors to their corresponding
      properties on the model, Ember Data expects each error to be
      namespaced under a key that matches the property name. For example
      if you had a Post model that looked like this.

      ```js
      App.Post = DS.Model.extend({
        title: DS.attr('string'),
        content: DS.attr('string')
      });
      ```

      To show an error from the server related to the `title` and
      `content` properties your adapter could return a promise that
      rejects with a `DS.InvalidError` object that looks like this:

      ```js
      App.PostAdapter = DS.RESTAdapter.extend({
        updateRecord: function() {
          // Fictional adapter that always rejects
          return Ember.RSVP.reject(new DS.InvalidError({
            title: ['Must be unique'],
            content: ['Must not be blank'],
          }));
        }
      });
      ```

      Your backend may use different property names for your records the
      store will attempt extract and normalize the errors using the
      serializer's `extractErrors` method before the errors get added to
      the the model. As a result, it is safe for the `InvalidError` to
      wrap the error payload unaltered.

      Example

      ```javascript
      App.ApplicationAdapter = DS.RESTAdapter.extend({
        ajaxError: function(jqXHR) {
          var error = this._super(jqXHR);

          // 422 is used by this fictional server to signal a validation error
          if (jqXHR && jqXHR.status === 422) {
            var jsonErrors = Ember.$.parseJSON(jqXHR.responseText);
            return new DS.InvalidError(jsonErrors);
          } else {
            // The ajax request failed however it is not a result of this
            // record being in an invalid state so we do not return a
            // `InvalidError` object.
            return error;
          }
        }
      });
      ```

      @class InvalidError
      @namespace DS
    */
    function ember$data$lib$system$model$errors$invalid$$InvalidError(errors) {
      ember$data$lib$system$model$errors$invalid$$EmberError.call(this, "The backend rejected the commit because it was invalid: " + Ember.inspect(errors));
      this.errors = errors;
    }

    ember$data$lib$system$model$errors$invalid$$InvalidError.prototype = ember$data$lib$system$model$errors$invalid$$create(ember$data$lib$system$model$errors$invalid$$EmberError.prototype);

    var ember$data$lib$system$model$errors$invalid$$default = ember$data$lib$system$model$errors$invalid$$InvalidError;

    /**
      @module ember-data
    */

    var ember$data$lib$system$adapter$$get = Ember.get;

    /**
      An adapter is an object that receives requests from a store and
      translates them into the appropriate action to take against your
      persistence layer. The persistence layer is usually an HTTP API, but
      may be anything, such as the browser's local storage. Typically the
      adapter is not invoked directly instead its functionality is accessed
      through the `store`.

      ### Creating an Adapter

      Create a new subclass of `DS.Adapter`, then assign
      it to the `ApplicationAdapter` property of the application.

      ```javascript
      var MyAdapter = DS.Adapter.extend({
        // ...your code here
      });

      App.ApplicationAdapter = MyAdapter;
      ```

      Model-specific adapters can be created by assigning your adapter
      class to the `ModelName` + `Adapter` property of the application.

      ```javascript
      var MyPostAdapter = DS.Adapter.extend({
        // ...Post-specific adapter code goes here
      });

      App.PostAdapter = MyPostAdapter;
      ```

      `DS.Adapter` is an abstract base class that you should override in your
      application to customize it for your backend. The minimum set of methods
      that you should implement is:

        * `find()`
        * `createRecord()`
        * `updateRecord()`
        * `deleteRecord()`
        * `findAll()`
        * `findQuery()`

      To improve the network performance of your application, you can optimize
      your adapter by overriding these lower-level methods:

        * `findMany()`


      For an example implementation, see `DS.RESTAdapter`, the
      included REST adapter.

      @class Adapter
      @namespace DS
      @extends Ember.Object
    */

    var ember$data$lib$system$adapter$$Adapter = Ember.Object.extend({

      /**
        If you would like your adapter to use a custom serializer you can
        set the `defaultSerializer` property to be the name of the custom
        serializer.

        Note the `defaultSerializer` serializer has a lower priority than
        a model specific serializer (i.e. `PostSerializer`) or the
        `application` serializer.

        ```javascript
        var DjangoAdapter = DS.Adapter.extend({
          defaultSerializer: 'django'
        });
        ```

        @property defaultSerializer
        @type {String}
      */

      /**
        The `find()` method is invoked when the store is asked for a record that
        has not previously been loaded. In response to `find()` being called, you
        should query your persistence layer for a record with the given ID. Once
        found, you can asynchronously call the store's `push()` method to push
        the record into the store.

        Here is an example `find` implementation:

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          find: function(store, type, id, snapshot) {
            var url = [type.typeKey, id].join('/');

            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.getJSON(url).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @method find
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {String} id
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      find: null,

      /**
        The `findAll()` method is called when you call `find` on the store
        without an ID (i.e. `store.find('post')`).

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          findAll: function(store, type, sinceToken) {
            var url = type;
            var query = { since: sinceToken };
            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.getJSON(url, query).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @private
        @method findAll
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {String} sinceToken
        @return {Promise} promise
      */
      findAll: null,

      /**
        This method is called when you call `find` on the store with a
        query object as the second parameter (i.e. `store.find('person', {
        page: 1 })`).

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          findQuery: function(store, type, query) {
            var url = type;
            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.getJSON(url, query).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @private
        @method findQuery
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {Object} query
        @param {DS.AdapterPopulatedRecordArray} recordArray
        @return {Promise} promise
      */
      findQuery: null,

      /**
        If the globally unique IDs for your records should be generated on the client,
        implement the `generateIdForRecord()` method. This method will be invoked
        each time you create a new record, and the value returned from it will be
        assigned to the record's `primaryKey`.

        Most traditional REST-like HTTP APIs will not use this method. Instead, the ID
        of the record will be set by the server, and your adapter will update the store
        with the new ID when it calls `didCreateRecord()`. Only implement this method if
        you intend to generate record IDs on the client-side.

        The `generateIdForRecord()` method will be invoked with the requesting store as
        the first parameter and the newly created record as the second parameter:

        ```javascript
        generateIdForRecord: function(store, inputProperties) {
          var uuid = App.generateUUIDWithStatisticallyLowOddsOfCollision();
          return uuid;
        }
        ```

        @method generateIdForRecord
        @param {DS.Store} store
        @param {Object} inputProperties a hash of properties to set on the
          newly created record.
        @return {String|Number} id
      */
      generateIdForRecord: null,

      /**
        Proxies to the serializer's `serialize` method.

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          createRecord: function(store, type, snapshot) {
            var data = this.serialize(snapshot, { includeId: true });
            var url = type;

            // ...
          }
        });
        ```

        @method serialize
        @param {DS.Snapshot} snapshot
        @param {Object}   options
        @return {Object} serialized snapshot
      */
      serialize: function(snapshot, options) {
        return ember$data$lib$system$adapter$$get(snapshot.record, 'store').serializerFor(snapshot.typeKey).serialize(snapshot, options);
      },

      /**
        Implement this method in a subclass to handle the creation of
        new records.

        Serializes the record and send it to the server.

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          createRecord: function(store, type, snapshot) {
            var data = this.serialize(snapshot, { includeId: true });
            var url = type;

            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.ajax({
                type: 'POST',
                url: url,
                dataType: 'json',
                data: data
              }).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @method createRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type   the DS.Model class of the record
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      createRecord: null,

      /**
        Implement this method in a subclass to handle the updating of
        a record.

        Serializes the record update and send it to the server.

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          updateRecord: function(store, type, snapshot) {
            var data = this.serialize(snapshot, { includeId: true });
            var id = snapshot.id;
            var url = [type, id].join('/');

            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.ajax({
                type: 'PUT',
                url: url,
                dataType: 'json',
                data: data
              }).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @method updateRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type   the DS.Model class of the record
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      updateRecord: null,

      /**
        Implement this method in a subclass to handle the deletion of
        a record.

        Sends a delete request for the record to the server.

        Example

        ```javascript
        App.ApplicationAdapter = DS.Adapter.extend({
          deleteRecord: function(store, type, snapshot) {
            var data = this.serialize(snapshot, { includeId: true });
            var id = snapshot.id;
            var url = [type, id].join('/');

            return new Ember.RSVP.Promise(function(resolve, reject) {
              jQuery.ajax({
                type: 'DELETE',
                url: url,
                dataType: 'json',
                data: data
              }).then(function(data) {
                Ember.run(null, resolve, data);
              }, function(jqXHR) {
                jqXHR.then = null; // tame jQuery's ill mannered promises
                Ember.run(null, reject, jqXHR);
              });
            });
          }
        });
        ```

        @method deleteRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type   the DS.Model class of the record
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      deleteRecord: null,

      /**
        By default the store will try to coalesce all `fetchRecord` calls within the same runloop
        into as few requests as possible by calling groupRecordsForFindMany and passing it into a findMany call.
        You can opt out of this behaviour by either not implementing the findMany hook or by setting
        coalesceFindRequests to false

        @property coalesceFindRequests
        @type {boolean}
      */
      coalesceFindRequests: true,

      /**
        Find multiple records at once if coalesceFindRequests is true

        @method findMany
        @param {DS.Store} store
        @param {subclass of DS.Model} type   the DS.Model class of the records
        @param {Array}    ids
        @param {Array} snapshots
        @return {Promise} promise
      */

      /**
        Organize records into groups, each of which is to be passed to separate
        calls to `findMany`.

        For example, if your api has nested URLs that depend on the parent, you will
        want to group records by their parent.

        The default implementation returns the records as a single group.

        @method groupRecordsForFindMany
        @param {DS.Store} store
        @param {Array} snapshots
        @return {Array}  an array of arrays of records, each of which is to be
                          loaded separately by `findMany`.
      */
      groupRecordsForFindMany: function(store, snapshots) {
        return [snapshots];
      }
    });

    var ember$data$lib$system$adapter$$default = ember$data$lib$system$adapter$$Adapter;
    var ember$data$lib$adapters$fixture$adapter$$get = Ember.get;
    var ember$data$lib$adapters$fixture$adapter$$fmt = Ember.String.fmt;
    var ember$data$lib$adapters$fixture$adapter$$indexOf = Ember.EnumerableUtils.indexOf;

    var ember$data$lib$adapters$fixture$adapter$$counter = 0;

    var ember$data$lib$adapters$fixture$adapter$$default = ember$data$lib$system$adapter$$default.extend({
      // by default, fixtures are already in normalized form
      serializer: null,
      // The fixture adapter does not support coalesceFindRequests
      coalesceFindRequests: false,

      /**
        If `simulateRemoteResponse` is `true` the `FixtureAdapter` will
        wait a number of milliseconds before resolving promises with the
        fixture values. The wait time can be configured via the `latency`
        property.

        @property simulateRemoteResponse
        @type {Boolean}
        @default true
      */
      simulateRemoteResponse: true,

      /**
        By default the `FixtureAdapter` will simulate a wait of the
        `latency` milliseconds before resolving promises with the fixture
        values. This behavior can be turned off via the
        `simulateRemoteResponse` property.

        @property latency
        @type {Number}
        @default 50
      */
      latency: 50,

      /**
        Implement this method in order to provide data associated with a type

        @method fixturesForType
        @param {Subclass of DS.Model} typeClass
        @return {Array}
      */
      fixturesForType: function(typeClass) {
        if (typeClass.FIXTURES) {
          var fixtures = Ember.A(typeClass.FIXTURES);
          return fixtures.map(function(fixture) {
            var fixtureIdType = typeof fixture.id;
            if (fixtureIdType !== "number" && fixtureIdType !== "string") {
              throw new Error(ember$data$lib$adapters$fixture$adapter$$fmt('the id property must be defined as a number or string for fixture %@', [fixture]));
            }
            fixture.id = fixture.id + '';
            return fixture;
          });
        }
        return null;
      },

      /**
        Implement this method in order to query fixtures data

        @method queryFixtures
        @param {Array} fixture
        @param {Object} query
        @param {Subclass of DS.Model} typeClass
        @return {Promise|Array}
      */
      queryFixtures: function(fixtures, query, typeClass) {
        Ember.assert('Not implemented: You must override the DS.FixtureAdapter::queryFixtures method to support querying the fixture store.');
      },

      /**
        @method updateFixtures
        @param {Subclass of DS.Model} typeClass
        @param {Array} fixture
      */
      updateFixtures: function(typeClass, fixture) {
        if (!typeClass.FIXTURES) {
          typeClass.FIXTURES = [];
        }

        var fixtures = typeClass.FIXTURES;

        this.deleteLoadedFixture(typeClass, fixture);

        fixtures.push(fixture);
      },

      /**
        Implement this method in order to provide json for CRUD methods

        @method mockJSON
        @param {DS.Store} store
        @param {Subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
      */
      mockJSON: function(store, typeClass, snapshot) {
        return store.serializerFor(snapshot.typeKey).serialize(snapshot, { includeId: true });
      },

      /**
        @method generateIdForRecord
        @param {DS.Store} store
        @param {DS.Model} record
        @return {String} id
      */
      generateIdForRecord: function(store) {
        return "fixture-" + ember$data$lib$adapters$fixture$adapter$$counter++;
      },

      /**
        @method find
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {String} id
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      find: function(store, typeClass, id, snapshot) {
        var fixtures = this.fixturesForType(typeClass);
        var fixture;

        Ember.assert("Unable to find fixtures for model type "+typeClass.toString() +". If you're defining your fixtures using `Model.FIXTURES = ...`, please change it to `Model.reopenClass({ FIXTURES: ... })`.", fixtures);

        if (fixtures) {
          fixture = Ember.A(fixtures).findBy('id', id);
        }

        if (fixture) {
          return this.simulateRemoteCall(function() {
            return fixture;
          }, this);
        }
      },

      /**
        @method findMany
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Array} ids
        @param {Array} snapshots
        @return {Promise} promise
      */
      findMany: function(store, typeClass, ids, snapshots) {
        var fixtures = this.fixturesForType(typeClass);

        Ember.assert("Unable to find fixtures for model type "+typeClass.toString(), fixtures);

        if (fixtures) {
          fixtures = fixtures.filter(function(item) {
            return ember$data$lib$adapters$fixture$adapter$$indexOf(ids, item.id) !== -1;
          });
        }

        if (fixtures) {
          return this.simulateRemoteCall(function() {
            return fixtures;
          }, this);
        }
      },

      /**
        @private
        @method findAll
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {String} sinceToken
        @return {Promise} promise
      */
      findAll: function(store, typeClass) {
        var fixtures = this.fixturesForType(typeClass);

        Ember.assert("Unable to find fixtures for model type "+typeClass.toString(), fixtures);

        return this.simulateRemoteCall(function() {
          return fixtures;
        }, this);
      },

      /**
        @private
        @method findQuery
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} query
        @param {DS.AdapterPopulatedRecordArray} recordArray
        @return {Promise} promise
      */
      findQuery: function(store, typeClass, query, array) {
        var fixtures = this.fixturesForType(typeClass);

        Ember.assert("Unable to find fixtures for model type " + typeClass.toString(), fixtures);

        fixtures = this.queryFixtures(fixtures, query, typeClass);

        if (fixtures) {
          return this.simulateRemoteCall(function() {
            return fixtures;
          }, this);
        }
      },

      /**
        @method createRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      createRecord: function(store, typeClass, snapshot) {
        var fixture = this.mockJSON(store, typeClass, snapshot);

        this.updateFixtures(typeClass, fixture);

        return this.simulateRemoteCall(function() {
          return fixture;
        }, this);
      },

      /**
        @method updateRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      updateRecord: function(store, typeClass, snapshot) {
        var fixture = this.mockJSON(store, typeClass, snapshot);

        this.updateFixtures(typeClass, fixture);

        return this.simulateRemoteCall(function() {
          return fixture;
        }, this);
      },

      /**
        @method deleteRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      deleteRecord: function(store, typeClass, snapshot) {
        this.deleteLoadedFixture(typeClass, snapshot);

        return this.simulateRemoteCall(function() {
          // no payload in a deletion
          return null;
        });
      },

      /*
        @method deleteLoadedFixture
        @private
        @param typeClass
        @param snapshot
      */
      deleteLoadedFixture: function(typeClass, snapshot) {
        var existingFixture = this.findExistingFixture(typeClass, snapshot);

        if (existingFixture) {
          var index = ember$data$lib$adapters$fixture$adapter$$indexOf(typeClass.FIXTURES, existingFixture);
          typeClass.FIXTURES.splice(index, 1);
          return true;
        }
      },

      /*
        @method findExistingFixture
        @private
        @param typeClass
        @param snapshot
      */
      findExistingFixture: function(typeClass, snapshot) {
        var fixtures = this.fixturesForType(typeClass);
        var id = snapshot.id;

        return this.findFixtureById(fixtures, id);
      },

      /*
        @method findFixtureById
        @private
        @param fixtures
        @param id
      */
      findFixtureById: function(fixtures, id) {
        return Ember.A(fixtures).find(function(r) {
          if (''+ember$data$lib$adapters$fixture$adapter$$get(r, 'id') === ''+id) {
            return true;
          } else {
            return false;
          }
        });
      },

      /*
        @method simulateRemoteCall
        @private
        @param callback
        @param context
      */
      simulateRemoteCall: function(callback, context) {
        var adapter = this;

        return new Ember.RSVP.Promise(function(resolve) {
          var value = Ember.copy(callback.call(context), true);
          if (ember$data$lib$adapters$fixture$adapter$$get(adapter, 'simulateRemoteResponse')) {
            // Schedule with setTimeout
            Ember.run.later(function() {
              resolve(value);
            }, ember$data$lib$adapters$fixture$adapter$$get(adapter, 'latency'));
          } else {
            // Asynchronous, but at the of the runloop with zero latency
            Ember.run.schedule('actions', null, function() {
              resolve(value);
            });
          }
        }, "DS: FixtureAdapter#simulateRemoteCall");
      }
    });

    var ember$data$lib$system$map$$Map            = Ember.Map;
    var ember$data$lib$system$map$$MapWithDefault = Ember.MapWithDefault;

    var ember$data$lib$system$map$$default = ember$data$lib$system$map$$Map;
    var ember$data$lib$adapters$build$url$mixin$$get = Ember.get;

    var ember$data$lib$adapters$build$url$mixin$$default = Ember.Mixin.create({
      /**
        Builds a URL for a given type and optional ID.

        By default, it pluralizes the type's name (for example, 'post'
        becomes 'posts' and 'person' becomes 'people'). To override the
        pluralization see [pathForType](#method_pathForType).

        If an ID is specified, it adds the ID to the path generated
        for the type, separated by a `/`.

        When called by RESTAdapter.findMany() the `id` and `snapshot` parameters
        will be arrays of ids and snapshots.

        @method buildURL
        @param {String} typeKey
        @param {String|Array|Object} id single id or array of ids or query
        @param {DS.Snapshot|Array} snapshot single snapshot or array of snapshots
        @param {String} requestType
        @return {String} url
      */
      buildURL: function(typeKey, id, snapshot, requestType) {
        switch (requestType) {
          case 'find':
            return this.urlForFind(id, typeKey, snapshot);
          case 'findAll':
            return this.urlForFindAll(typeKey);
          case 'findQuery':
            return this.urlForFindQuery(id, typeKey);
          case 'findMany':
            return this.urlForFindMany(id, typeKey, snapshot);
          case 'findHasMany':
            return this.urlForFindHasMany(id, typeKey);
          case 'findBelongsTo':
            return this.urlForFindBelongsTo(id, typeKey);
          case 'createRecord':
            return this.urlForCreateRecord(typeKey, snapshot);
          case 'updateRecord':
            return this.urlForUpdateRecord(id, typeKey, snapshot);
          case 'deleteRecord':
            return this.urlForDeleteRecord(id, typeKey, snapshot);
          default:
            return this._buildURL(typeKey, id);
        }
      },

      /**
        @method _buildURL
        @private
        @param {String} typeKey
        @param {String} id
        @return {String} url
      */
      _buildURL: function(typeKey, id) {
        var url = [];
        var host = ember$data$lib$adapters$build$url$mixin$$get(this, 'host');
        var prefix = this.urlPrefix();
        var path;

        if (typeKey) {
          path = this.pathForType(typeKey);
          if (path) { url.push(path); }
        }

        if (id) { url.push(encodeURIComponent(id)); }
        if (prefix) { url.unshift(prefix); }

        url = url.join('/');
        if (!host && url && url.charAt(0) !== '/') {
          url = '/' + url;
        }

        return url;
      },

      /**
       * @method urlForFind
       * @param {String} id
       * @param {String} typeKey
       * @param {DS.Snapshot} snapshot
       * @return {String} url
       */
      urlForFind: function(id, typeKey, snapshot) {
        return this._buildURL(typeKey, id);
      },

      /**
       * @method urlForFindAll
       * @param {String} typeKey
       * @return {String} url
       */
      urlForFindAll: function(typeKey) {
        return this._buildURL(typeKey);
      },

      /**
       * @method urlForFindQuery
       * @param {Object} query
       * @param {String} typeKey
       * @return {String} url
       */
      urlForFindQuery: function(query, typeKey) {
        return this._buildURL(typeKey);
      },

      /**
       * @method urlForFindMany
       * @param {Array} ids
       * @param {String} type
       * @param {Array} snapshots
       * @return {String} url
       */
      urlForFindMany: function(ids, typeKey, snapshots) {
        return this._buildURL(typeKey);
      },

      /**
       * @method urlForFindHasMany
       * @param {String} id
       * @param {String} typeKey
       * @return {String} url
       */
      urlForFindHasMany: function(id, typeKey) {
        return this._buildURL(typeKey, id);
      },

      /**
       * @method urlForFindBelongTo
       * @param {String} id
       * @param {String} typeKey
       * @return {String} url
       */
      urlForFindBelongsTo: function(id, typeKey) {
        return this._buildURL(typeKey, id);
      },

      /**
       * @method urlForCreateRecord
       * @param {String} typeKey
       * @param {DS.Snapshot} snapshot
       * @return {String} url
       */
      urlForCreateRecord: function(typeKey, snapshot) {
        return this._buildURL(typeKey);
      },

      /**
       * @method urlForUpdateRecord
       * @param {String} id
       * @param {String} typeKey
       * @param {DS.Snapshot} snapshot
       * @return {String} url
       */
      urlForUpdateRecord: function(id, typeKey, snapshot) {
        return this._buildURL(typeKey, id);
      },

      /**
       * @method urlForDeleteRecord
       * @param {String} id
       * @param {String} typeKey
       * @param {DS.Snapshot} snapshot
       * @return {String} url
       */
      urlForDeleteRecord: function(id, typeKey, snapshot) {
        return this._buildURL(typeKey, id);
      },

      /**
        @method urlPrefix
        @private
        @param {String} path
        @param {String} parentUrl
        @return {String} urlPrefix
      */
      urlPrefix: function(path, parentURL) {
        var host = ember$data$lib$adapters$build$url$mixin$$get(this, 'host');
        var namespace = ember$data$lib$adapters$build$url$mixin$$get(this, 'namespace');
        var url = [];

        if (path) {
          // Protocol relative url
          //jscs:disable disallowEmptyBlocks
          if (/^\/\//.test(path)) {
            // Do nothing, the full host is already included. This branch
            // avoids the absolute path logic and the relative path logic.

          // Absolute path
          } else if (path.charAt(0) === '/') {
            //jscs:enable disallowEmptyBlocks
            if (host) {
              path = path.slice(1);
              url.push(host);
            }
          // Relative path
          } else if (!/^http(s)?:\/\//.test(path)) {
            url.push(parentURL);
          }
        } else {
          if (host) { url.push(host); }
          if (namespace) { url.push(namespace); }
        }

        if (path) {
          url.push(path);
        }

        return url.join('/');
      },


      /**
        Determines the pathname for a given type.

        By default, it pluralizes the type's name (for example,
        'post' becomes 'posts' and 'person' becomes 'people').

        ### Pathname customization

        For example if you have an object LineItem with an
        endpoint of "/line_items/".

        ```js
        App.ApplicationAdapter = DS.RESTAdapter.extend({
          pathForType: function(typeKey) {
            var decamelized = Ember.String.decamelize(typeKey);
            return Ember.String.pluralize(decamelized);
          }
        });
        ```

        @method pathForType
        @param {String} typeKey
        @return {String} path
      **/
      pathForType: function(typeKey) {
        var camelized = Ember.String.camelize(typeKey);
        return Ember.String.pluralize(camelized);
      }
    });

    var ember$data$lib$adapters$rest$adapter$$get = Ember.get;
    var ember$data$lib$adapters$rest$adapter$$forEach = Ember.ArrayPolyfills.forEach;

    var ember$data$lib$adapters$rest$adapter$$default = ember$data$lib$system$adapter$$Adapter.extend(ember$data$lib$adapters$build$url$mixin$$default, {
      defaultSerializer: '-rest',

      /**
        By default, the RESTAdapter will send the query params sorted alphabetically to the
        server.

        For example:

        ```js
          store.find('posts', {sort: 'price', category: 'pets'});
        ```

        will generate a requests like this `/posts?category=pets&sort=price`, even if the
        parameters were specified in a different order.

        That way the generated URL will be deterministic and that simplifies caching mechanisms
        in the backend.

        Setting `sortQueryParams` to a falsey value will respect the original order.

        In case you want to sort the query parameters with a different criteria, set
        `sortQueryParams` to your custom sort function.

        ```js
        export default DS.RESTAdapter.extend({
          sortQueryParams: function(params) {
            var sortedKeys = Object.keys(params).sort().reverse();
            var len = sortedKeys.length, newParams = {};

            for (var i = 0; i < len; i++) {
              newParams[sortedKeys[i]] = params[sortedKeys[i]];
            }
            return newParams;
          }
        });
        ```

        @method sortQueryParams
        @param {Object} obj
        @return {Object}
      */
      sortQueryParams: function(obj) {
        var keys = Ember.keys(obj);
        var len = keys.length;
        if (len < 2) {
          return obj;
        }
        var newQueryParams = {};
        var sortedKeys = keys.sort();

        for (var i = 0; i < len; i++) {
          newQueryParams[sortedKeys[i]] = obj[sortedKeys[i]];
        }
        return newQueryParams;
      },

      /**
        By default the RESTAdapter will send each find request coming from a `store.find`
        or from accessing a relationship separately to the server. If your server supports passing
        ids as a query string, you can set coalesceFindRequests to true to coalesce all find requests
        within a single runloop.

        For example, if you have an initial payload of:

        ```javascript
        {
          post: {
            id: 1,
            comments: [1, 2]
          }
        }
        ```

        By default calling `post.get('comments')` will trigger the following requests(assuming the
        comments haven't been loaded before):

        ```
        GET /comments/1
        GET /comments/2
        ```

        If you set coalesceFindRequests to `true` it will instead trigger the following request:

        ```
        GET /comments?ids[]=1&ids[]=2
        ```

        Setting coalesceFindRequests to `true` also works for `store.find` requests and `belongsTo`
        relationships accessed within the same runloop. If you set `coalesceFindRequests: true`

        ```javascript
        store.find('comment', 1);
        store.find('comment', 2);
        ```

        will also send a request to: `GET /comments?ids[]=1&ids[]=2`

        Note: Requests coalescing rely on URL building strategy. So if you override `buildURL` in your app
        `groupRecordsForFindMany` more likely should be overridden as well in order for coalescing to work.

        @property coalesceFindRequests
        @type {boolean}
      */
      coalesceFindRequests: false,

      /**
        Endpoint paths can be prefixed with a `namespace` by setting the namespace
        property on the adapter:

        ```javascript
        DS.RESTAdapter.reopen({
          namespace: 'api/1'
        });
        ```

        Requests for `App.Post` would now target `/api/1/post/`.

        @property namespace
        @type {String}
      */

      /**
        An adapter can target other hosts by setting the `host` property.

        ```javascript
        DS.RESTAdapter.reopen({
          host: 'https://api.example.com'
        });
        ```

        Requests for `App.Post` would now target `https://api.example.com/post/`.

        @property host
        @type {String}
      */

      /**
        Some APIs require HTTP headers, e.g. to provide an API
        key. Arbitrary headers can be set as key/value pairs on the
        `RESTAdapter`'s `headers` object and Ember Data will send them
        along with each ajax request. For dynamic headers see [headers
        customization](/api/data/classes/DS.RESTAdapter.html#toc_headers-customization).

        ```javascript
        App.ApplicationAdapter = DS.RESTAdapter.extend({
          headers: {
            "API_KEY": "secret key",
            "ANOTHER_HEADER": "Some header value"
          }
        });
        ```

        @property headers
        @type {Object}
      */

      /**
        Called by the store in order to fetch the JSON for a given
        type and ID.

        The `find` method makes an Ajax request to a URL computed by `buildURL`, and returns a
        promise for the resulting payload.

        This method performs an HTTP `GET` request with the id provided as part of the query string.

        @method find
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {String} id
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      find: function(store, type, id, snapshot) {
        return this.ajax(this.buildURL(type.typeKey, id, snapshot, 'find'), 'GET');
      },

      /**
        Called by the store in order to fetch a JSON array for all
        of the records for a given type.

        The `findAll` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
        promise for the resulting payload.

        @private
        @method findAll
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {String} sinceToken
        @return {Promise} promise
      */
      findAll: function(store, type, sinceToken) {
        var query, url;

        if (sinceToken) {
          query = { since: sinceToken };
        }

        url = this.buildURL(type.typeKey, null, null, 'findAll');

        return this.ajax(url, 'GET', { data: query });
      },

      /**
        Called by the store in order to fetch a JSON array for
        the records that match a particular query.

        The `findQuery` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
        promise for the resulting payload.

        The `query` argument is a simple JavaScript object that will be passed directly
        to the server as parameters.

        @private
        @method findQuery
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {Object} query
        @return {Promise} promise
      */
      findQuery: function(store, type, query) {
        var url = this.buildURL(type.typeKey, query, null, 'findQuery');

        if (this.sortQueryParams) {
          query = this.sortQueryParams(query);
        }

        return this.ajax(url, 'GET', { data: query });
      },

      /**
        Called by the store in order to fetch several records together if `coalesceFindRequests` is true

        For example, if the original payload looks like:

        ```js
        {
          "id": 1,
          "title": "Rails is omakase",
          "comments": [ 1, 2, 3 ]
        }
        ```

        The IDs will be passed as a URL-encoded Array of IDs, in this form:

        ```
        ids[]=1&ids[]=2&ids[]=3
        ```

        Many servers, such as Rails and PHP, will automatically convert this URL-encoded array
        into an Array for you on the server-side. If you want to encode the
        IDs, differently, just override this (one-line) method.

        The `findMany` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
        promise for the resulting payload.

        @method findMany
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {Array} ids
        @param {Array} snapshots
        @return {Promise} promise
      */
      findMany: function(store, type, ids, snapshots) {
        var url = this.buildURL(type.typeKey, ids, snapshots, 'findMany');
        return this.ajax(url, 'GET', { data: { ids: ids } });
      },

      /**
        Called by the store in order to fetch a JSON array for
        the unloaded records in a has-many relationship that were originally
        specified as a URL (inside of `links`).

        For example, if your original payload looks like this:

        ```js
        {
          "post": {
            "id": 1,
            "title": "Rails is omakase",
            "links": { "comments": "/posts/1/comments" }
          }
        }
        ```

        This method will be called with the parent record and `/posts/1/comments`.

        The `findHasMany` method will make an Ajax (HTTP GET) request to the originally specified URL.

        @method findHasMany
        @param {DS.Store} store
        @param {DS.Snapshot} snapshot
        @param {String} url
        @return {Promise} promise
      */
      findHasMany: function(store, snapshot, url, relationship) {
        var id   = snapshot.id;
        var type = snapshot.typeKey;

        url = this.urlPrefix(url, this.buildURL(type, id, null, 'findHasMany'));

        return this.ajax(url, 'GET');
      },

      /**
        Called by the store in order to fetch a JSON array for
        the unloaded records in a belongs-to relationship that were originally
        specified as a URL (inside of `links`).

        For example, if your original payload looks like this:

        ```js
        {
          "person": {
            "id": 1,
            "name": "Tom Dale",
            "links": { "group": "/people/1/group" }
          }
        }
        ```

        This method will be called with the parent record and `/people/1/group`.

        The `findBelongsTo` method will make an Ajax (HTTP GET) request to the originally specified URL.

        @method findBelongsTo
        @param {DS.Store} store
        @param {DS.Snapshot} snapshot
        @param {String} url
        @return {Promise} promise
      */
      findBelongsTo: function(store, snapshot, url, relationship) {
        var id   = snapshot.id;
        var type = snapshot.typeKey;

        url = this.urlPrefix(url, this.buildURL(type, id, null, 'findBelongsTo'));
        return this.ajax(url, 'GET');
      },

      /**
        Called by the store when a newly created record is
        saved via the `save` method on a model record instance.

        The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
        to a URL computed by `buildURL`.

        See `serialize` for information on how to customize the serialized form
        of a record.

        @method createRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      createRecord: function(store, type, snapshot) {
        var data = {};
        var serializer = store.serializerFor(type.typeKey);
        var url = this.buildURL(type.typeKey, null, snapshot, 'createRecord');

        serializer.serializeIntoHash(data, type, snapshot, { includeId: true });

        return this.ajax(url, "POST", { data: data });
      },

      /**
        Called by the store when an existing record is saved
        via the `save` method on a model record instance.

        The `updateRecord` method serializes the record and makes an Ajax (HTTP PUT) request
        to a URL computed by `buildURL`.

        See `serialize` for information on how to customize the serialized form
        of a record.

        @method updateRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      updateRecord: function(store, type, snapshot) {
        var data = {};
        var serializer = store.serializerFor(type.typeKey);

        serializer.serializeIntoHash(data, type, snapshot);

        var id = snapshot.id;
        var url = this.buildURL(type.typeKey, id, snapshot, 'updateRecord');

        return this.ajax(url, "PUT", { data: data });
      },

      /**
        Called by the store when a record is deleted.

        The `deleteRecord` method  makes an Ajax (HTTP DELETE) request to a URL computed by `buildURL`.

        @method deleteRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {DS.Snapshot} snapshot
        @return {Promise} promise
      */
      deleteRecord: function(store, type, snapshot) {
        var id = snapshot.id;

        return this.ajax(this.buildURL(type.typeKey, id, snapshot, 'deleteRecord'), "DELETE");
      },

      _stripIDFromURL: function(store, snapshot) {
        var url = this.buildURL(snapshot.typeKey, snapshot.id, snapshot);

        var expandedURL = url.split('/');
        //Case when the url is of the format ...something/:id
        var lastSegment = expandedURL[expandedURL.length - 1];
        var id = snapshot.id;
        if (lastSegment === id) {
          expandedURL[expandedURL.length - 1] = "";
        } else if (ember$data$lib$adapters$rest$adapter$$endsWith(lastSegment, '?id=' + id)) {
          //Case when the url is of the format ...something?id=:id
          expandedURL[expandedURL.length - 1] = lastSegment.substring(0, lastSegment.length - id.length - 1);
        }

        return expandedURL.join('/');
      },

      // http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
      maxUrlLength: 2048,

      /**
        Organize records into groups, each of which is to be passed to separate
        calls to `findMany`.

        This implementation groups together records that have the same base URL but
        differing ids. For example `/comments/1` and `/comments/2` will be grouped together
        because we know findMany can coalesce them together as `/comments?ids[]=1&ids[]=2`

        It also supports urls where ids are passed as a query param, such as `/comments?id=1`
        but not those where there is more than 1 query param such as `/comments?id=2&name=David`
        Currently only the query param of `id` is supported. If you need to support others, please
        override this or the `_stripIDFromURL` method.

        It does not group records that have differing base urls, such as for example: `/posts/1/comments/2`
        and `/posts/2/comments/3`

        @method groupRecordsForFindMany
        @param {DS.Store} store
        @param {Array} snapshots
        @return {Array}  an array of arrays of records, each of which is to be
                          loaded separately by `findMany`.
      */
      groupRecordsForFindMany: function (store, snapshots) {
        var groups = ember$data$lib$system$map$$MapWithDefault.create({ defaultValue: function() { return []; } });
        var adapter = this;
        var maxUrlLength = this.maxUrlLength;

        ember$data$lib$adapters$rest$adapter$$forEach.call(snapshots, function(snapshot) {
          var baseUrl = adapter._stripIDFromURL(store, snapshot);
          groups.get(baseUrl).push(snapshot);
        });

        function splitGroupToFitInUrl(group, maxUrlLength, paramNameLength) {
          var baseUrl = adapter._stripIDFromURL(store, group[0]);
          var idsSize = 0;
          var splitGroups = [[]];

          ember$data$lib$adapters$rest$adapter$$forEach.call(group, function(snapshot) {
            var additionalLength = encodeURIComponent(snapshot.id).length + paramNameLength;
            if (baseUrl.length + idsSize + additionalLength >= maxUrlLength) {
              idsSize = 0;
              splitGroups.push([]);
            }

            idsSize += additionalLength;

            var lastGroupIndex = splitGroups.length - 1;
            splitGroups[lastGroupIndex].push(snapshot);
          });

          return splitGroups;
        }

        var groupsArray = [];
        groups.forEach(function(group, key) {
          var paramNameLength = '&ids%5B%5D='.length;
          var splitGroups = splitGroupToFitInUrl(group, maxUrlLength, paramNameLength);

          ember$data$lib$adapters$rest$adapter$$forEach.call(splitGroups, function(splitGroup) {
            groupsArray.push(splitGroup);
          });
        });

        return groupsArray;
      },


      /**
        Takes an ajax response, and returns an error payload.

        Returning a `DS.InvalidError` from this method will cause the
        record to transition into the `invalid` state and make the
        `errors` object available on the record. When returning an
        `InvalidError` the store will attempt to normalize the error data
        returned from the server using the serializer's `extractErrors`
        method.

        Example

        ```javascript
        App.ApplicationAdapter = DS.RESTAdapter.extend({
          ajaxError: function(jqXHR) {
            var error = this._super(jqXHR);

            if (jqXHR && jqXHR.status === 422) {
              var jsonErrors = Ember.$.parseJSON(jqXHR.responseText);

              return new DS.InvalidError(jsonErrors);
            } else {
              return error;
            }
          }
        });
        ```

        Note: As a correctness optimization, the default implementation of
        the `ajaxError` method strips out the `then` method from jquery's
        ajax response (jqXHR). This is important because the jqXHR's
        `then` method fulfills the promise with itself resulting in a
        circular "thenable" chain which may cause problems for some
        promise libraries.

        @method ajaxError
        @param  {Object} jqXHR
        @param  {Object} responseText
        @param  {Object} errorThrown
        @return {Object} jqXHR
      */
      ajaxError: function(jqXHR, responseText, errorThrown) {
        var isObject = jqXHR !== null && typeof jqXHR === 'object';

        if (isObject) {
          jqXHR.then = null;
          if (!jqXHR.errorThrown) {
            if (typeof errorThrown === 'string') {
              jqXHR.errorThrown = new Error(errorThrown);
            } else {
              jqXHR.errorThrown = errorThrown;
            }
          }
        }

        return jqXHR;
      },

      /**
        Takes an ajax response, and returns the json payload.

        By default this hook just returns the jsonPayload passed to it.
        You might want to override it in two cases:

        1. Your API might return useful results in the request headers.
        If you need to access these, you can override this hook to copy them
        from jqXHR to the payload object so they can be processed in you serializer.

        2. Your API might return errors as successful responses with status code
        200 and an Errors text or object. You can return a DS.InvalidError from
        this hook and it will automatically reject the promise and put your record
        into the invalid state.

        @method ajaxSuccess
        @param  {Object} jqXHR
        @param  {Object} jsonPayload
        @return {Object} jsonPayload
      */

      ajaxSuccess: function(jqXHR, jsonPayload) {
        return jsonPayload;
      },

      /**
        Takes a URL, an HTTP method and a hash of data, and makes an
        HTTP request.

        When the server responds with a payload, Ember Data will call into `extractSingle`
        or `extractArray` (depending on whether the original query was for one record or
        many records).

        By default, `ajax` method has the following behavior:

        * It sets the response `dataType` to `"json"`
        * If the HTTP method is not `"GET"`, it sets the `Content-Type` to be
          `application/json; charset=utf-8`
        * If the HTTP method is not `"GET"`, it stringifies the data passed in. The
          data is the serialized record in the case of a save.
        * Registers success and failure handlers.

        @method ajax
        @private
        @param {String} url
        @param {String} type The request type GET, POST, PUT, DELETE etc.
        @param {Object} options
        @return {Promise} promise
      */
      ajax: function(url, type, options) {
        var adapter = this;

        return new Ember.RSVP.Promise(function(resolve, reject) {
          var hash = adapter.ajaxOptions(url, type, options);

          hash.success = function(json, textStatus, jqXHR) {
            json = adapter.ajaxSuccess(jqXHR, json);
            if (json instanceof ember$data$lib$system$model$errors$invalid$$default) {
              Ember.run(null, reject, json);
            } else {
              Ember.run(null, resolve, json);
            }
          };

          hash.error = function(jqXHR, textStatus, errorThrown) {
            Ember.run(null, reject, adapter.ajaxError(jqXHR, jqXHR.responseText, errorThrown));
          };

          Ember.$.ajax(hash);
        }, 'DS: RESTAdapter#ajax ' + type + ' to ' + url);
      },

      /**
        @method ajaxOptions
        @private
        @param {String} url
        @param {String} type The request type GET, POST, PUT, DELETE etc.
        @param {Object} options
        @return {Object}
      */
      ajaxOptions: function(url, type, options) {
        var hash = options || {};
        hash.url = url;
        hash.type = type;
        hash.dataType = 'json';
        hash.context = this;

        if (hash.data && type !== 'GET') {
          hash.contentType = 'application/json; charset=utf-8';
          hash.data = JSON.stringify(hash.data);
        }

        var headers = ember$data$lib$adapters$rest$adapter$$get(this, 'headers');
        if (headers !== undefined) {
          hash.beforeSend = function (xhr) {
            ember$data$lib$adapters$rest$adapter$$forEach.call(Ember.keys(headers), function(key) {
              xhr.setRequestHeader(key, headers[key]);
            });
          };
        }

        return hash;
      }
    });

    //From http://stackoverflow.com/questions/280634/endswith-in-javascript
    function ember$data$lib$adapters$rest$adapter$$endsWith(string, suffix) {
      if (typeof String.prototype.endsWith !== 'function') {
        return string.indexOf(suffix, string.length - suffix.length) !== -1;
      } else {
        return string.endsWith(suffix);
      }
    }
    var ember$lib$main$$default = Ember;

    var ember$inflector$lib$lib$system$inflector$$capitalize = ember$lib$main$$default.String.capitalize;

    var ember$inflector$lib$lib$system$inflector$$BLANK_REGEX = /^\s*$/;
    var ember$inflector$lib$lib$system$inflector$$LAST_WORD_DASHED_REGEX = /([\w/-]+[_/-])([a-z\d]+$)/;
    var ember$inflector$lib$lib$system$inflector$$LAST_WORD_CAMELIZED_REGEX = /([\w/-]+)([A-Z][a-z\d]*$)/;
    var ember$inflector$lib$lib$system$inflector$$CAMELIZED_REGEX = /[A-Z][a-z\d]*$/;

    function ember$inflector$lib$lib$system$inflector$$loadUncountable(rules, uncountable) {
      for (var i = 0, length = uncountable.length; i < length; i++) {
        rules.uncountable[uncountable[i].toLowerCase()] = true;
      }
    }

    function ember$inflector$lib$lib$system$inflector$$loadIrregular(rules, irregularPairs) {
      var pair;

      for (var i = 0, length = irregularPairs.length; i < length; i++) {
        pair = irregularPairs[i];

        //pluralizing
        rules.irregular[pair[0].toLowerCase()] = pair[1];
        rules.irregular[pair[1].toLowerCase()] = pair[1];

        //singularizing
        rules.irregularInverse[pair[1].toLowerCase()] = pair[0];
        rules.irregularInverse[pair[0].toLowerCase()] = pair[0];
      }
    }

    /**
      Inflector.Ember provides a mechanism for supplying inflection rules for your
      application. Ember includes a default set of inflection rules, and provides an
      API for providing additional rules.

      Examples:

      Creating an inflector with no rules.

      ```js
      var inflector = new Ember.Inflector();
      ```

      Creating an inflector with the default ember ruleset.

      ```js
      var inflector = new Ember.Inflector(Ember.Inflector.defaultRules);

      inflector.pluralize('cow'); //=> 'kine'
      inflector.singularize('kine'); //=> 'cow'
      ```

      Creating an inflector and adding rules later.

      ```javascript
      var inflector = Ember.Inflector.inflector;

      inflector.pluralize('advice'); // => 'advices'
      inflector.uncountable('advice');
      inflector.pluralize('advice'); // => 'advice'

      inflector.pluralize('formula'); // => 'formulas'
      inflector.irregular('formula', 'formulae');
      inflector.pluralize('formula'); // => 'formulae'

      // you would not need to add these as they are the default rules
      inflector.plural(/$/, 's');
      inflector.singular(/s$/i, '');
      ```

      Creating an inflector with a nondefault ruleset.

      ```javascript
      var rules = {
        plurals:  [ /$/, 's' ],
        singular: [ /\s$/, '' ],
        irregularPairs: [
          [ 'cow', 'kine' ]
        ],
        uncountable: [ 'fish' ]
      };

      var inflector = new Ember.Inflector(rules);
      ```

      @class Inflector
      @namespace Ember
    */
    function ember$inflector$lib$lib$system$inflector$$Inflector(ruleSet) {
      ruleSet = ruleSet || {};
      ruleSet.uncountable = ruleSet.uncountable || ember$inflector$lib$lib$system$inflector$$makeDictionary();
      ruleSet.irregularPairs = ruleSet.irregularPairs || ember$inflector$lib$lib$system$inflector$$makeDictionary();

      var rules = this.rules = {
        plurals:  ruleSet.plurals || [],
        singular: ruleSet.singular || [],
        irregular: ember$inflector$lib$lib$system$inflector$$makeDictionary(),
        irregularInverse: ember$inflector$lib$lib$system$inflector$$makeDictionary(),
        uncountable: ember$inflector$lib$lib$system$inflector$$makeDictionary()
      };

      ember$inflector$lib$lib$system$inflector$$loadUncountable(rules, ruleSet.uncountable);
      ember$inflector$lib$lib$system$inflector$$loadIrregular(rules, ruleSet.irregularPairs);

      this.enableCache();
    }

    if (!Object.create && !Object.create(null).hasOwnProperty) {
      throw new Error("This browser does not support Object.create(null), please polyfil with es5-sham: http://git.io/yBU2rg");
    }

    function ember$inflector$lib$lib$system$inflector$$makeDictionary() {
      var cache = Object.create(null);
      cache['_dict'] = null;
      delete cache['_dict'];
      return cache;
    }

    ember$inflector$lib$lib$system$inflector$$Inflector.prototype = {
      /**
        @public

        As inflections can be costly, and commonly the same subset of words are repeatedly
        inflected an optional cache is provided.

        @method enableCache
      */
      enableCache: function() {
        this.purgeCache();

        this.singularize = function(word) {
          this._cacheUsed = true;
          return this._sCache[word] || (this._sCache[word] = this._singularize(word));
        };

        this.pluralize = function(word) {
          this._cacheUsed = true;
          return this._pCache[word] || (this._pCache[word] = this._pluralize(word));
        };
      },

      /**
        @public

        @method purgedCache
      */
      purgeCache: function() {
        this._cacheUsed = false;
        this._sCache = ember$inflector$lib$lib$system$inflector$$makeDictionary();
        this._pCache = ember$inflector$lib$lib$system$inflector$$makeDictionary();
      },

      /**
        @public
        disable caching

        @method disableCache;
      */
      disableCache: function() {
        this._sCache = null;
        this._pCache = null;
        this.singularize = function(word) {
          return this._singularize(word);
        };

        this.pluralize = function(word) {
          return this._pluralize(word);
        };
      },

      /**
        @method plural
        @param {RegExp} regex
        @param {String} string
      */
      plural: function(regex, string) {
        if (this._cacheUsed) { this.purgeCache(); }
        this.rules.plurals.push([regex, string.toLowerCase()]);
      },

      /**
        @method singular
        @param {RegExp} regex
        @param {String} string
      */
      singular: function(regex, string) {
        if (this._cacheUsed) { this.purgeCache(); }
        this.rules.singular.push([regex, string.toLowerCase()]);
      },

      /**
        @method uncountable
        @param {String} regex
      */
      uncountable: function(string) {
        if (this._cacheUsed) { this.purgeCache(); }
        ember$inflector$lib$lib$system$inflector$$loadUncountable(this.rules, [string.toLowerCase()]);
      },

      /**
        @method irregular
        @param {String} singular
        @param {String} plural
      */
      irregular: function (singular, plural) {
        if (this._cacheUsed) { this.purgeCache(); }
        ember$inflector$lib$lib$system$inflector$$loadIrregular(this.rules, [[singular, plural]]);
      },

      /**
        @method pluralize
        @param {String} word
      */
      pluralize: function(word) {
        return this._pluralize(word);
      },

      _pluralize: function(word) {
        return this.inflect(word, this.rules.plurals, this.rules.irregular);
      },
      /**
        @method singularize
        @param {String} word
      */
      singularize: function(word) {
        return this._singularize(word);
      },

      _singularize: function(word) {
        return this.inflect(word, this.rules.singular,  this.rules.irregularInverse);
      },

      /**
        @protected

        @method inflect
        @param {String} word
        @param {Object} typeRules
        @param {Object} irregular
      */
      inflect: function(word, typeRules, irregular) {
        var inflection, substitution, result, lowercase, wordSplit,
          firstPhrase, lastWord, isBlank, isCamelized, isUncountable,
          isIrregular, rule;

        isBlank = !word || ember$inflector$lib$lib$system$inflector$$BLANK_REGEX.test(word);

        isCamelized = ember$inflector$lib$lib$system$inflector$$CAMELIZED_REGEX.test(word);
        firstPhrase = "";

        if (isBlank) {
          return word;
        }

        lowercase = word.toLowerCase();
        wordSplit = ember$inflector$lib$lib$system$inflector$$LAST_WORD_DASHED_REGEX.exec(word) || ember$inflector$lib$lib$system$inflector$$LAST_WORD_CAMELIZED_REGEX.exec(word);
        if (wordSplit){
          firstPhrase = wordSplit[1];
          lastWord = wordSplit[2].toLowerCase();
        }

        isUncountable = this.rules.uncountable[lowercase] || this.rules.uncountable[lastWord];

        if (isUncountable) {
          return word;
        }

        isIrregular = irregular && (irregular[lowercase] || irregular[lastWord]);

        if (isIrregular) {
          if (irregular[lowercase]){
            return isIrregular;
          }
          else {
            isIrregular = (isCamelized) ? ember$inflector$lib$lib$system$inflector$$capitalize(isIrregular) : isIrregular;
            return firstPhrase + isIrregular;
          }
        }

        for (var i = typeRules.length, min = 0; i > min; i--) {
           inflection = typeRules[i-1];
           rule = inflection[0];

          if (rule.test(word)) {
            break;
          }
        }

        inflection = inflection || [];

        rule = inflection[0];
        substitution = inflection[1];

        result = word.replace(rule, substitution);

        return result;
      }
    };

    var ember$inflector$lib$lib$system$inflector$$default = ember$inflector$lib$lib$system$inflector$$Inflector;

    function ember$inflector$lib$lib$system$string$$pluralize(word) {
      return ember$inflector$lib$lib$system$inflector$$default.inflector.pluralize(word);
    }

    function ember$inflector$lib$lib$system$string$$singularize(word) {
      return ember$inflector$lib$lib$system$inflector$$default.inflector.singularize(word);
    }

    var ember$inflector$lib$lib$system$inflections$$default = {
      plurals: [
        [/$/, 's'],
        [/s$/i, 's'],
        [/^(ax|test)is$/i, '$1es'],
        [/(octop|vir)us$/i, '$1i'],
        [/(octop|vir)i$/i, '$1i'],
        [/(alias|status)$/i, '$1es'],
        [/(bu)s$/i, '$1ses'],
        [/(buffal|tomat)o$/i, '$1oes'],
        [/([ti])um$/i, '$1a'],
        [/([ti])a$/i, '$1a'],
        [/sis$/i, 'ses'],
        [/(?:([^f])fe|([lr])f)$/i, '$1$2ves'],
        [/(hive)$/i, '$1s'],
        [/([^aeiouy]|qu)y$/i, '$1ies'],
        [/(x|ch|ss|sh)$/i, '$1es'],
        [/(matr|vert|ind)(?:ix|ex)$/i, '$1ices'],
        [/^(m|l)ouse$/i, '$1ice'],
        [/^(m|l)ice$/i, '$1ice'],
        [/^(ox)$/i, '$1en'],
        [/^(oxen)$/i, '$1'],
        [/(quiz)$/i, '$1zes']
      ],

      singular: [
        [/s$/i, ''],
        [/(ss)$/i, '$1'],
        [/(n)ews$/i, '$1ews'],
        [/([ti])a$/i, '$1um'],
        [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, '$1sis'],
        [/(^analy)(sis|ses)$/i, '$1sis'],
        [/([^f])ves$/i, '$1fe'],
        [/(hive)s$/i, '$1'],
        [/(tive)s$/i, '$1'],
        [/([lr])ves$/i, '$1f'],
        [/([^aeiouy]|qu)ies$/i, '$1y'],
        [/(s)eries$/i, '$1eries'],
        [/(m)ovies$/i, '$1ovie'],
        [/(x|ch|ss|sh)es$/i, '$1'],
        [/^(m|l)ice$/i, '$1ouse'],
        [/(bus)(es)?$/i, '$1'],
        [/(o)es$/i, '$1'],
        [/(shoe)s$/i, '$1'],
        [/(cris|test)(is|es)$/i, '$1is'],
        [/^(a)x[ie]s$/i, '$1xis'],
        [/(octop|vir)(us|i)$/i, '$1us'],
        [/(alias|status)(es)?$/i, '$1'],
        [/^(ox)en/i, '$1'],
        [/(vert|ind)ices$/i, '$1ex'],
        [/(matr)ices$/i, '$1ix'],
        [/(quiz)zes$/i, '$1'],
        [/(database)s$/i, '$1']
      ],

      irregularPairs: [
        ['person', 'people'],
        ['man', 'men'],
        ['child', 'children'],
        ['sex', 'sexes'],
        ['move', 'moves'],
        ['cow', 'kine'],
        ['zombie', 'zombies']
      ],

      uncountable: [
        'equipment',
        'information',
        'rice',
        'money',
        'species',
        'series',
        'fish',
        'sheep',
        'jeans',
        'police'
      ]
    };

    ember$inflector$lib$lib$system$inflector$$default.inflector = new ember$inflector$lib$lib$system$inflector$$default(ember$inflector$lib$lib$system$inflections$$default);

    function ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration1(name, helperFunction) {
      //earlier versions of ember with htmlbars used this
      ember$lib$main$$default.HTMLBars.helpers[name] = helperFunction;
    }

    function ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration2(name, helperFunction) {
      //registerHelper has been made private as _registerHelper
      //this is kept here if anyone is using it
      ember$lib$main$$default.HTMLBars.registerHelper(name, helperFunction);
    }

    function ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration3(name, helperFunction) {
      //latest versin of ember uses this
      ember$lib$main$$default.HTMLBars._registerHelper(name, helperFunction);
    }

    function ember$inflector$lib$lib$utils$register$helper$$registerHelper(name, helperFunction) {
      if (ember$lib$main$$default.HTMLBars) {
        var fn = ember$lib$main$$default.HTMLBars.makeBoundHelper(helperFunction);

        if (ember$lib$main$$default.HTMLBars._registerHelper) {
          if (ember$lib$main$$default.HTMLBars.helpers) {
            ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration1(name, fn);
          } else {
            ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration3(name, fn);
          }
        } else if (ember$lib$main$$default.HTMLBars.registerHelper) {
          ember$inflector$lib$lib$utils$register$helper$$registerHelperIteration2(name, fn);
        }
      } else if (ember$lib$main$$default.Handlebars) {
        ember$lib$main$$default.Handlebars.helper(name, helperFunction);
      }
    }
    var ember$inflector$lib$lib$utils$register$helper$$default = ember$inflector$lib$lib$utils$register$helper$$registerHelper;

    /**
     *
     * If you have Ember Inflector (such as if Ember Data is present),
     * singularize a word. For example, turn "oxen" into "ox".
     *
     * Example:
     *
     * {{singularize myProperty}}
     * {{singularize "oxen"}}
     *
     * @for Ember.HTMLBars.helpers
     * @method singularize
     * @param {String|Property} word word to singularize
    */
    ember$inflector$lib$lib$utils$register$helper$$default('singularize', function(params){
      return ember$inflector$lib$lib$system$string$$singularize(params[0]);
    });

    /**
     *
     * If you have Ember Inflector (such as if Ember Data is present),
     * pluralize a word. For example, turn "ox" into "oxen".
     *
     * Example:
     *
     * {{pluralize count myProperty}}
     * {{pluralize 1 "oxen"}}
     * {{pluralize myProperty}}
     * {{pluralize "ox"}}
     *
     * @for Ember.HTMLBars.helpers
     * @method pluralize
     * @param {Number|Property} [count] count of objects
     * @param {String|Property} word word to pluralize
    */
    ember$inflector$lib$lib$utils$register$helper$$default('pluralize', function(params) {
      var count, word;

      if (params.length === 1) {
        word = params[0];
        return ember$inflector$lib$lib$system$string$$pluralize(word);
      } else {
        count = params[0];
        word  = params[1];

        if (count !== 1) {
          word = ember$inflector$lib$lib$system$string$$pluralize(word);
        }
        return count + " " + word;
      }
    });

    if (ember$lib$main$$default.EXTEND_PROTOTYPES === true || ember$lib$main$$default.EXTEND_PROTOTYPES.String) {
      /**
        See {{#crossLink "Ember.String/pluralize"}}{{/crossLink}}

        @method pluralize
        @for String
      */
      String.prototype.pluralize = function() {
        return ember$inflector$lib$lib$system$string$$pluralize(this);
      };

      /**
        See {{#crossLink "Ember.String/singularize"}}{{/crossLink}}

        @method singularize
        @for String
      */
      String.prototype.singularize = function() {
        return ember$inflector$lib$lib$system$string$$singularize(this);
      };
    }

    ember$inflector$lib$lib$system$inflector$$default.defaultRules = ember$inflector$lib$lib$system$inflections$$default;
    ember$lib$main$$default.Inflector        = ember$inflector$lib$lib$system$inflector$$default;

    ember$lib$main$$default.String.pluralize   = ember$inflector$lib$lib$system$string$$pluralize;
    ember$lib$main$$default.String.singularize = ember$inflector$lib$lib$system$string$$singularize;

    var ember$inflector$lib$main$$default = ember$inflector$lib$lib$system$inflector$$default;

    if (typeof define !== 'undefined' && define.amd){
      define('ember-inflector', ['exports'], function(__exports__){
        __exports__['default'] = ember$inflector$lib$lib$system$inflector$$default;
        return ember$inflector$lib$lib$system$inflector$$default;
      });
    } else if (typeof module !== 'undefined' && module['exports']){
      module['exports'] = ember$inflector$lib$lib$system$inflector$$default;
    }

    /**
      @module ember-data
    */

    var activemodel$adapter$lib$system$active$model$adapter$$decamelize = Ember.String.decamelize;
    var activemodel$adapter$lib$system$active$model$adapter$$underscore = Ember.String.underscore;

    /**
      The ActiveModelAdapter is a subclass of the RESTAdapter designed to integrate
      with a JSON API that uses an underscored naming convention instead of camelCasing.
      It has been designed to work out of the box with the
      [active\_model\_serializers](http://github.com/rails-api/active_model_serializers)
      Ruby gem. This Adapter expects specific settings using ActiveModel::Serializers,
      `embed :ids, embed_in_root: true` which sideloads the records.

      This adapter extends the DS.RESTAdapter by making consistent use of the camelization,
      decamelization and pluralization methods to normalize the serialized JSON into a
      format that is compatible with a conventional Rails backend and Ember Data.

      ## JSON Structure

      The ActiveModelAdapter expects the JSON returned from your server to follow
      the REST adapter conventions substituting underscored keys for camelcased ones.

      Unlike the DS.RESTAdapter, async relationship keys must be the singular form
      of the relationship name, followed by "_id" for DS.belongsTo relationships,
      or "_ids" for DS.hasMany relationships.

      ### Conventional Names

      Attribute names in your JSON payload should be the underscored versions of
      the attributes in your Ember.js models.

      For example, if you have a `Person` model:

      ```js
      App.FamousPerson = DS.Model.extend({
        firstName: DS.attr('string'),
        lastName: DS.attr('string'),
        occupation: DS.attr('string')
      });
      ```

      The JSON returned should look like this:

      ```js
      {
        "famous_person": {
          "id": 1,
          "first_name": "Barack",
          "last_name": "Obama",
          "occupation": "President"
        }
      }
      ```

      Let's imagine that `Occupation` is just another model:

      ```js
      App.Person = DS.Model.extend({
        firstName: DS.attr('string'),
        lastName: DS.attr('string'),
        occupation: DS.belongsTo('occupation')
      });

      App.Occupation = DS.Model.extend({
        name: DS.attr('string'),
        salary: DS.attr('number'),
        people: DS.hasMany('person')
      });
      ```

      The JSON needed to avoid extra server calls, should look like this:

      ```js
      {
        "people": [{
          "id": 1,
          "first_name": "Barack",
          "last_name": "Obama",
          "occupation_id": 1
        }],

        "occupations": [{
          "id": 1,
          "name": "President",
          "salary": 100000,
          "person_ids": [1]
        }]
      }
      ```

      @class ActiveModelAdapter
      @constructor
      @namespace DS
      @extends DS.RESTAdapter
    **/

    var activemodel$adapter$lib$system$active$model$adapter$$ActiveModelAdapter = ember$data$lib$adapters$rest$adapter$$default.extend({
      defaultSerializer: '-active-model',
      /**
        The ActiveModelAdapter overrides the `pathForType` method to build
        underscored URLs by decamelizing and pluralizing the object type name.

        ```js
          this.pathForType("famousPerson");
          //=> "famous_people"
        ```

        @method pathForType
        @param {String} typeKey
        @return String
      */
      pathForType: function(typeKey) {
        var decamelized = activemodel$adapter$lib$system$active$model$adapter$$decamelize(typeKey);
        var underscored = activemodel$adapter$lib$system$active$model$adapter$$underscore(decamelized);
        return ember$inflector$lib$lib$system$string$$pluralize(underscored);
      },

      /**
        The ActiveModelAdapter overrides the `ajaxError` method
        to return a DS.InvalidError for all 422 Unprocessable Entity
        responses.

        A 422 HTTP response from the server generally implies that the request
        was well formed but the API was unable to process it because the
        content was not semantically correct or meaningful per the API.

        For more information on 422 HTTP Error code see 11.2 WebDAV RFC 4918
        https://tools.ietf.org/html/rfc4918#section-11.2

        @method ajaxError
        @param {Object} jqXHR
        @return error
      */
      ajaxError: function(jqXHR) {
        var error = this._super.apply(this, arguments);

        if (jqXHR && jqXHR.status === 422) {
          var response = Ember.$.parseJSON(jqXHR.responseText);
          var errors = response.errors ? response.errors : response;

          return new ember$data$lib$system$model$errors$invalid$$default(errors);
        } else {
          return error;
        }
      }
    });

    var activemodel$adapter$lib$system$active$model$adapter$$default = activemodel$adapter$lib$system$active$model$adapter$$ActiveModelAdapter;

    var ember$data$lib$system$serializer$$Serializer = Ember.Object.extend({
      /**
        The `store` property is the application's `store` that contains all records.
        It's injected as a service.
        It can be used to push records from a non flat data structure server
        response.

        @property store
        @type {DS.Store}
        @public
      */

      /**
        The `extract` method is used to deserialize the payload received from your
        data source into the form that Ember Data expects.

        @method extract
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String|Number} id
        @param {String} requestType
        @return {Object}
      */
      extract: null,

      /**
        The `serialize` method is used when a record is saved in order to convert
        the record into the form that your external data source expects.

        `serialize` takes an optional `options` hash with a single option:

        - `includeId`: If this is `true`, `serialize` should include the ID
          in the serialized object it builds.

        @method serialize
        @param {subclass of DS.Model} record
        @param {Object} [options]
        @return {Object}
      */
      serialize: null,

      /**
        The `normalize` method is used to convert a payload received from your
        external data source into the normalized form `store.push()` expects. You
        should override this method, munge the hash and return the normalized
        payload.

        @method normalize
        @param {subclass of DS.Model} typeClass
        @param {Object} hash
        @return {Object}
      */
      normalize: function(typeClass, hash) {
        return hash;
      }

    });

    var ember$data$lib$system$serializer$$default = ember$data$lib$system$serializer$$Serializer;

    var ember$data$lib$serializers$json$serializer$$get = Ember.get;
    var ember$data$lib$serializers$json$serializer$$isNone = Ember.isNone;
    var ember$data$lib$serializers$json$serializer$$map = Ember.ArrayPolyfills.map;
    var ember$data$lib$serializers$json$serializer$$merge = Ember.merge;

    var ember$data$lib$serializers$json$serializer$$default = ember$data$lib$system$serializer$$default.extend({
      /**
        The primaryKey is used when serializing and deserializing
        data. Ember Data always uses the `id` property to store the id of
        the record. The external source may not always follow this
        convention. In these cases it is useful to override the
        primaryKey property to match the primaryKey of your external
        store.

        Example

        ```javascript
        App.ApplicationSerializer = DS.JSONSerializer.extend({
          primaryKey: '_id'
        });
        ```

        @property primaryKey
        @type {String}
        @default 'id'
      */
      primaryKey: 'id',

      /**
        The `attrs` object can be used to declare a simple mapping between
        property names on `DS.Model` records and payload keys in the
        serialized JSON object representing the record. An object with the
        property `key` can also be used to designate the attribute's key on
        the response payload.

        Example

        ```javascript
        App.Person = DS.Model.extend({
          firstName: DS.attr('string'),
          lastName: DS.attr('string'),
          occupation: DS.attr('string'),
          admin: DS.attr('boolean')
        });

        App.PersonSerializer = DS.JSONSerializer.extend({
          attrs: {
            admin: 'is_admin',
            occupation: {key: 'career'}
          }
        });
        ```

        You can also remove attributes by setting the `serialize` key to
        false in your mapping object.

        Example

        ```javascript
        App.PersonSerializer = DS.JSONSerializer.extend({
          attrs: {
            admin: {serialize: false},
            occupation: {key: 'career'}
          }
        });
        ```

        When serialized:

        ```javascript
        {
          "firstName": "Harry",
          "lastName": "Houdini",
          "career": "magician"
        }
        ```

        Note that the `admin` is now not included in the payload.

        @property attrs
        @type {Object}
      */
      mergedProperties: ['attrs'],

      /**
       Given a subclass of `DS.Model` and a JSON object this method will
       iterate through each attribute of the `DS.Model` and invoke the
       `DS.Transform#deserialize` method on the matching property of the
       JSON object.  This method is typically called after the
       serializer's `normalize` method.

       @method applyTransforms
       @private
       @param {subclass of DS.Model} typeClass
       @param {Object} data The data to transform
       @return {Object} data The transformed data object
      */
      applyTransforms: function(typeClass, data) {
        typeClass.eachTransformedAttribute(function applyTransform(key, typeClass) {
          if (!data.hasOwnProperty(key)) { return; }

          var transform = this.transformFor(typeClass);
          data[key] = transform.deserialize(data[key]);
        }, this);

        return data;
      },

      /**
        Normalizes a part of the JSON payload returned by
        the server. You should override this method, munge the hash
        and call super if you have generic normalization to do.

        It takes the type of the record that is being normalized
        (as a DS.Model class), the property where the hash was
        originally found, and the hash to normalize.

        You can use this method, for example, to normalize underscored keys to camelized
        or other general-purpose normalizations.

        Example

        ```javascript
        App.ApplicationSerializer = DS.JSONSerializer.extend({
          normalize: function(typeClass, hash) {
            var fields = Ember.get(typeClass, 'fields');
            fields.forEach(function(field) {
              var payloadField = Ember.String.underscore(field);
              if (field === payloadField) { return; }

              hash[field] = hash[payloadField];
              delete hash[payloadField];
            });
            return this._super.apply(this, arguments);
          }
        });
        ```

        @method normalize
        @param {subclass of DS.Model} typeClass
        @param {Object} hash
        @return {Object}
      */
      normalize: function(typeClass, hash) {
        if (!hash) { return hash; }

        this.normalizeId(hash);
        this.normalizeAttributes(typeClass, hash);
        this.normalizeRelationships(typeClass, hash);

        this.normalizeUsingDeclaredMapping(typeClass, hash);
        this.applyTransforms(typeClass, hash);
        return hash;
      },

      /**
        You can use this method to normalize all payloads, regardless of whether they
        represent single records or an array.

        For example, you might want to remove some extraneous data from the payload:

        ```js
        App.ApplicationSerializer = DS.JSONSerializer.extend({
          normalizePayload: function(payload) {
            delete payload.version;
            delete payload.status;
            return payload;
          }
        });
        ```

        @method normalizePayload
        @param {Object} payload
        @return {Object} the normalized payload
      */
      normalizePayload: function(payload) {
        return payload;
      },

      /**
        @method normalizeAttributes
        @private
      */
      normalizeAttributes: function(typeClass, hash) {
        var payloadKey;

        if (this.keyForAttribute) {
          typeClass.eachAttribute(function(key) {
            payloadKey = this.keyForAttribute(key, 'deserialize');
            if (key === payloadKey) { return; }
            if (!hash.hasOwnProperty(payloadKey)) { return; }

            hash[key] = hash[payloadKey];
            delete hash[payloadKey];
          }, this);
        }
      },

      /**
        @method normalizeRelationships
        @private
      */
      normalizeRelationships: function(typeClass, hash) {
        var payloadKey;

        if (this.keyForRelationship) {
          typeClass.eachRelationship(function(key, relationship) {
            payloadKey = this.keyForRelationship(key, relationship.kind, 'deserialize');
            if (key === payloadKey) { return; }
            if (!hash.hasOwnProperty(payloadKey)) { return; }

            hash[key] = hash[payloadKey];
            delete hash[payloadKey];
          }, this);
        }
      },

      /**
        @method normalizeUsingDeclaredMapping
        @private
      */
      normalizeUsingDeclaredMapping: function(typeClass, hash) {
        var attrs = ember$data$lib$serializers$json$serializer$$get(this, 'attrs');
        var payloadKey, key;

        if (attrs) {
          for (key in attrs) {
            payloadKey = this._getMappedKey(key);
            if (!hash.hasOwnProperty(payloadKey)) { continue; }

            if (payloadKey !== key) {
              hash[key] = hash[payloadKey];
              delete hash[payloadKey];
            }
          }
        }
      },

      /**
        @method normalizeId
        @private
      */
      normalizeId: function(hash) {
        var primaryKey = ember$data$lib$serializers$json$serializer$$get(this, 'primaryKey');

        if (primaryKey === 'id') { return; }

        hash.id = hash[primaryKey];
        delete hash[primaryKey];
      },

      /**
        @method normalizeErrors
        @private
      */
      normalizeErrors: function(typeClass, hash) {
        this.normalizeId(hash);
        this.normalizeAttributes(typeClass, hash);
        this.normalizeRelationships(typeClass, hash);
        this.normalizeUsingDeclaredMapping(typeClass, hash);
      },

      /**
        Looks up the property key that was set by the custom `attr` mapping
        passed to the serializer.

        @method _getMappedKey
        @private
        @param {String} key
        @return {String} key
      */
      _getMappedKey: function(key) {
        var attrs = ember$data$lib$serializers$json$serializer$$get(this, 'attrs');
        var mappedKey;
        if (attrs && attrs[key]) {
          mappedKey = attrs[key];
          //We need to account for both the {title: 'post_title'} and
          //{title: {key: 'post_title'}} forms
          if (mappedKey.key) {
            mappedKey = mappedKey.key;
          }
          if (typeof mappedKey === 'string') {
            key = mappedKey;
          }
        }

        return key;
      },

      /**
        Check attrs.key.serialize property to inform if the `key`
        can be serialized

        @method _canSerialize
        @private
        @param {String} key
        @return {boolean} true if the key can be serialized
      */
      _canSerialize: function(key) {
        var attrs = ember$data$lib$serializers$json$serializer$$get(this, 'attrs');

        return !attrs || !attrs[key] || attrs[key].serialize !== false;
      },

      // SERIALIZE
      /**
        Called when a record is saved in order to convert the
        record into JSON.

        By default, it creates a JSON object with a key for
        each attribute and belongsTo relationship.

        For example, consider this model:

        ```javascript
        App.Comment = DS.Model.extend({
          title: DS.attr(),
          body: DS.attr(),

          author: DS.belongsTo('user')
        });
        ```

        The default serialization would create a JSON object like:

        ```javascript
        {
          "title": "Rails is unagi",
          "body": "Rails? Omakase? O_O",
          "author": 12
        }
        ```

        By default, attributes are passed through as-is, unless
        you specified an attribute type (`DS.attr('date')`). If
        you specify a transform, the JavaScript value will be
        serialized when inserted into the JSON hash.

        By default, belongs-to relationships are converted into
        IDs when inserted into the JSON hash.

        ## IDs

        `serialize` takes an options hash with a single option:
        `includeId`. If this option is `true`, `serialize` will,
        by default include the ID in the JSON object it builds.

        The adapter passes in `includeId: true` when serializing
        a record for `createRecord`, but not for `updateRecord`.

        ## Customization

        Your server may expect a different JSON format than the
        built-in serialization format.

        In that case, you can implement `serialize` yourself and
        return a JSON hash of your choosing.

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          serialize: function(snapshot, options) {
            var json = {
              POST_TTL: snapshot.attr('title'),
              POST_BDY: snapshot.attr('body'),
              POST_CMS: snapshot.hasMany('comments', { ids: true })
            }

            if (options.includeId) {
              json.POST_ID_ = snapshot.id;
            }

            return json;
          }
        });
        ```

        ## Customizing an App-Wide Serializer

        If you want to define a serializer for your entire
        application, you'll probably want to use `eachAttribute`
        and `eachRelationship` on the record.

        ```javascript
        App.ApplicationSerializer = DS.JSONSerializer.extend({
          serialize: function(snapshot, options) {
            var json = {};

            snapshot.eachAttribute(function(name) {
              json[serverAttributeName(name)] = snapshot.attr(name);
            })

            snapshot.eachRelationship(function(name, relationship) {
              if (relationship.kind === 'hasMany') {
                json[serverHasManyName(name)] = snapshot.hasMany(name, { ids: true });
              }
            });

            if (options.includeId) {
              json.ID_ = snapshot.id;
            }

            return json;
          }
        });

        function serverAttributeName(attribute) {
          return attribute.underscore().toUpperCase();
        }

        function serverHasManyName(name) {
          return serverAttributeName(name.singularize()) + "_IDS";
        }
        ```

        This serializer will generate JSON that looks like this:

        ```javascript
        {
          "TITLE": "Rails is omakase",
          "BODY": "Yep. Omakase.",
          "COMMENT_IDS": [ 1, 2, 3 ]
        }
        ```

        ## Tweaking the Default JSON

        If you just want to do some small tweaks on the default JSON,
        you can call super first and make the tweaks on the returned
        JSON.

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          serialize: function(snapshot, options) {
            var json = this._super.apply(this, arguments);

            json.subject = json.title;
            delete json.title;

            return json;
          }
        });
        ```

        @method serialize
        @param {DS.Snapshot} snapshot
        @param {Object} options
        @return {Object} json
      */
      serialize: function(snapshot, options) {
        var json = {};

        if (options && options.includeId) {
          var id = snapshot.id;

          if (id) {
            json[ember$data$lib$serializers$json$serializer$$get(this, 'primaryKey')] = id;
          }
        }

        snapshot.eachAttribute(function(key, attribute) {
          this.serializeAttribute(snapshot, json, key, attribute);
        }, this);

        snapshot.eachRelationship(function(key, relationship) {
          if (relationship.kind === 'belongsTo') {
            this.serializeBelongsTo(snapshot, json, relationship);
          } else if (relationship.kind === 'hasMany') {
            this.serializeHasMany(snapshot, json, relationship);
          }
        }, this);

        return json;
      },

      /**
        You can use this method to customize how a serialized record is added to the complete
        JSON hash to be sent to the server. By default the JSON Serializer does not namespace
        the payload and just sends the raw serialized JSON object.
        If your server expects namespaced keys, you should consider using the RESTSerializer.
        Otherwise you can override this method to customize how the record is added to the hash.

        For example, your server may expect underscored root objects.

        ```js
        App.ApplicationSerializer = DS.RESTSerializer.extend({
          serializeIntoHash: function(data, type, snapshot, options) {
            var root = Ember.String.decamelize(type.typeKey);
            data[root] = this.serialize(snapshot, options);
          }
        });
        ```

        @method serializeIntoHash
        @param {Object} hash
        @param {subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
        @param {Object} options
      */
      serializeIntoHash: function(hash, typeClass, snapshot, options) {
        ember$data$lib$serializers$json$serializer$$merge(hash, this.serialize(snapshot, options));
      },

      /**
       `serializeAttribute` can be used to customize how `DS.attr`
       properties are serialized

       For example if you wanted to ensure all your attributes were always
       serialized as properties on an `attributes` object you could
       write:

       ```javascript
       App.ApplicationSerializer = DS.JSONSerializer.extend({
         serializeAttribute: function(snapshot, json, key, attributes) {
           json.attributes = json.attributes || {};
           this._super(snapshot, json.attributes, key, attributes);
         }
       });
       ```

       @method serializeAttribute
       @param {DS.Snapshot} snapshot
       @param {Object} json
       @param {String} key
       @param {Object} attribute
      */
      serializeAttribute: function(snapshot, json, key, attribute) {
        var type = attribute.type;

        if (this._canSerialize(key)) {
          var value = snapshot.attr(key);
          if (type) {
            var transform = this.transformFor(type);
            value = transform.serialize(value);
          }

          // if provided, use the mapping provided by `attrs` in
          // the serializer
          var payloadKey =  this._getMappedKey(key);

          if (payloadKey === key && this.keyForAttribute) {
            payloadKey = this.keyForAttribute(key, 'serialize');
          }

          json[payloadKey] = value;
        }
      },

      /**
       `serializeBelongsTo` can be used to customize how `DS.belongsTo`
       properties are serialized.

       Example

       ```javascript
       App.PostSerializer = DS.JSONSerializer.extend({
         serializeBelongsTo: function(snapshot, json, relationship) {
           var key = relationship.key;

           var belongsTo = snapshot.belongsTo(key);

           key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo", "serialize") : key;

           json[key] = Ember.isNone(belongsTo) ? belongsTo : belongsTo.record.toJSON();
         }
       });
       ```

       @method serializeBelongsTo
       @param {DS.Snapshot} snapshot
       @param {Object} json
       @param {Object} relationship
      */
      serializeBelongsTo: function(snapshot, json, relationship) {
        var key = relationship.key;

        if (this._canSerialize(key)) {
          var belongsToId = snapshot.belongsTo(key, { id: true });

          // if provided, use the mapping provided by `attrs` in
          // the serializer
          var payloadKey = this._getMappedKey(key);
          if (payloadKey === key && this.keyForRelationship) {
            payloadKey = this.keyForRelationship(key, "belongsTo", "serialize");
          }

          //Need to check whether the id is there for new&async records
          if (ember$data$lib$serializers$json$serializer$$isNone(belongsToId)) {
            json[payloadKey] = null;
          } else {
            json[payloadKey] = belongsToId;
          }

          if (relationship.options.polymorphic) {
            this.serializePolymorphicType(snapshot, json, relationship);
          }
        }
      },

      /**
       `serializeHasMany` can be used to customize how `DS.hasMany`
       properties are serialized.

       Example

       ```javascript
       App.PostSerializer = DS.JSONSerializer.extend({
         serializeHasMany: function(snapshot, json, relationship) {
           var key = relationship.key;
           if (key === 'comments') {
             return;
           } else {
             this._super.apply(this, arguments);
           }
         }
       });
       ```

       @method serializeHasMany
       @param {DS.Snapshot} snapshot
       @param {Object} json
       @param {Object} relationship
      */
      serializeHasMany: function(snapshot, json, relationship) {
        var key = relationship.key;

        if (this._canSerialize(key)) {
          var payloadKey;

          // if provided, use the mapping provided by `attrs` in
          // the serializer
          payloadKey = this._getMappedKey(key);
          if (payloadKey === key && this.keyForRelationship) {
            payloadKey = this.keyForRelationship(key, "hasMany", "serialize");
          }

          var relationshipType = snapshot.type.determineRelationshipType(relationship);

          if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany') {
            json[payloadKey] = snapshot.hasMany(key, { ids: true });
            // TODO support for polymorphic manyToNone and manyToMany relationships
          }
        }
      },

      /**
        You can use this method to customize how polymorphic objects are
        serialized. Objects are considered to be polymorphic if
        `{polymorphic: true}` is pass as the second argument to the
        `DS.belongsTo` function.

        Example

        ```javascript
        App.CommentSerializer = DS.JSONSerializer.extend({
          serializePolymorphicType: function(snapshot, json, relationship) {
            var key = relationship.key,
                belongsTo = snapshot.belongsTo(key);
            key = this.keyForAttribute ? this.keyForAttribute(key, "serialize") : key;

            if (Ember.isNone(belongsTo)) {
              json[key + "_type"] = null;
            } else {
              json[key + "_type"] = belongsTo.typeKey;
            }
          }
        });
       ```

        @method serializePolymorphicType
        @param {DS.Snapshot} snapshot
        @param {Object} json
        @param {Object} relationship
      */
      serializePolymorphicType: Ember.K,

      // EXTRACT

      /**
        The `extract` method is used to deserialize payload data from the
        server. By default the `JSONSerializer` does not push the records
        into the store. However records that subclass `JSONSerializer`
        such as the `RESTSerializer` may push records into the store as
        part of the extract call.

        This method delegates to a more specific extract method based on
        the `requestType`.

        To override this method with a custom one, make sure to call
        `return this._super(store, type, payload, id, requestType)` with your
        pre-processed data.

        Here's an example of using `extract` manually:

        ```javascript
        socket.on('message', function(message) {
          var data = message.data;
          var typeClass = store.modelFor(message.modelName);
          var serializer = store.serializerFor(typeClass.typeKey);
          var record = serializer.extract(store, typeClass, data, data.id, 'single');

          store.push(message.modelName, record);
        });
        ```

        @method extract
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extract: function(store, typeClass, payload, id, requestType) {
        this.extractMeta(store, typeClass, payload);

        var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
        return this[specificExtract](store, typeClass, payload, id, requestType);
      },

      /**
        `extractFindAll` is a hook into the extract method used when a
        call is made to `DS.Store#findAll`. By default this method is an
        alias for [extractArray](#method_extractArray).

        @method extractFindAll
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Array} array An array of deserialized objects
      */
      extractFindAll: function(store, typeClass, payload, id, requestType) {
        return this.extractArray(store, typeClass, payload, id, requestType);
      },
      /**
        `extractFindQuery` is a hook into the extract method used when a
        call is made to `DS.Store#findQuery`. By default this method is an
        alias for [extractArray](#method_extractArray).

        @method extractFindQuery
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Array} array An array of deserialized objects
      */
      extractFindQuery: function(store, typeClass, payload, id, requestType) {
        return this.extractArray(store, typeClass, payload, id, requestType);
      },
      /**
        `extractFindMany` is a hook into the extract method used when a
        call is made to `DS.Store#findMany`. By default this method is
        alias for [extractArray](#method_extractArray).

        @method extractFindMany
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Array} array An array of deserialized objects
      */
      extractFindMany: function(store, typeClass, payload, id, requestType) {
        return this.extractArray(store, typeClass, payload, id, requestType);
      },
      /**
        `extractFindHasMany` is a hook into the extract method used when a
        call is made to `DS.Store#findHasMany`. By default this method is
        alias for [extractArray](#method_extractArray).

        @method extractFindHasMany
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Array} array An array of deserialized objects
      */
      extractFindHasMany: function(store, typeClass, payload, id, requestType) {
        return this.extractArray(store, typeClass, payload, id, requestType);
      },

      /**
        `extractCreateRecord` is a hook into the extract method used when a
        call is made to `DS.Model#save` and the record is new. By default
        this method is alias for [extractSave](#method_extractSave).

        @method extractCreateRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractCreateRecord: function(store, typeClass, payload, id, requestType) {
        return this.extractSave(store, typeClass, payload, id, requestType);
      },
      /**
        `extractUpdateRecord` is a hook into the extract method used when
        a call is made to `DS.Model#save` and the record has been updated.
        By default this method is alias for [extractSave](#method_extractSave).

        @method extractUpdateRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractUpdateRecord: function(store, typeClass, payload, id, requestType) {
        return this.extractSave(store, typeClass, payload, id, requestType);
      },
      /**
        `extractDeleteRecord` is a hook into the extract method used when
        a call is made to `DS.Model#save` and the record has been deleted.
        By default this method is alias for [extractSave](#method_extractSave).

        @method extractDeleteRecord
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractDeleteRecord: function(store, typeClass, payload, id, requestType) {
        return this.extractSave(store, typeClass, payload, id, requestType);
      },

      /**
        `extractFind` is a hook into the extract method used when
        a call is made to `DS.Store#find`. By default this method is
        alias for [extractSingle](#method_extractSingle).

        @method extractFind
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractFind: function(store, typeClass, payload, id, requestType) {
        return this.extractSingle(store, typeClass, payload, id, requestType);
      },
      /**
        `extractFindBelongsTo` is a hook into the extract method used when
        a call is made to `DS.Store#findBelongsTo`. By default this method is
        alias for [extractSingle](#method_extractSingle).

        @method extractFindBelongsTo
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractFindBelongsTo: function(store, typeClass, payload, id, requestType) {
        return this.extractSingle(store, typeClass, payload, id, requestType);
      },
      /**
        `extractSave` is a hook into the extract method used when a call
        is made to `DS.Model#save`. By default this method is alias
        for [extractSingle](#method_extractSingle).

        @method extractSave
        @param {DS.Store} store
        @param {subclass of DS.Model} type
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractSave: function(store, typeClass, payload, id, requestType) {
        return this.extractSingle(store, typeClass, payload, id, requestType);
      },

      /**
        `extractSingle` is used to deserialize a single record returned
        from the adapter.

        Example

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          extractSingle: function(store, typeClass, payload) {
            payload.comments = payload._embedded.comment;
            delete payload._embedded;

            return this._super(store, typeClass, payload);
          },
        });
        ```

        @method extractSingle
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Object} json The deserialized payload
      */
      extractSingle: function(store, typeClass, payload, id, requestType) {
        var normalizedPayload = this.normalizePayload(payload);
        return this.normalize(typeClass, normalizedPayload);
      },

      /**
        `extractArray` is used to deserialize an array of records
        returned from the adapter.

        Example

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          extractArray: function(store, typeClass, payload) {
            return payload.map(function(json) {
              return this.extractSingle(store, typeClass, json);
            }, this);
          }
        });
        ```

        @method extractArray
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @param {String} requestType
        @return {Array} array An array of deserialized objects
      */
      extractArray: function(store, typeClass, arrayPayload, id, requestType) {
        var normalizedPayload = this.normalizePayload(arrayPayload);
        var serializer = this;

        return ember$data$lib$serializers$json$serializer$$map.call(normalizedPayload, function(singlePayload) {
          return serializer.normalize(typeClass, singlePayload);
        });
      },

      /**
        `extractMeta` is used to deserialize any meta information in the
        adapter payload. By default Ember Data expects meta information to
        be located on the `meta` property of the payload object.

        Example

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          extractMeta: function(store, typeClass, payload) {
            if (payload && payload._pagination) {
              store.setMetadataFor(typeClass, payload._pagination);
              delete payload._pagination;
            }
          }
        });
        ```

        @method extractMeta
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
      */
      extractMeta: function(store, typeClass, payload) {
        if (payload && payload.meta) {
          store.setMetadataFor(typeClass, payload.meta);
          delete payload.meta;
        }
      },

      /**
        `extractErrors` is used to extract model errors when a call is made
        to `DS.Model#save` which fails with an `InvalidError`. By default
        Ember Data expects error information to be located on the `errors`
        property of the payload object.

        Example

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          extractErrors: function(store, typeClass, payload, id) {
            if (payload && typeof payload === 'object' && payload._problems) {
              payload = payload._problems;
              this.normalizeErrors(typeClass, payload);
            }
            return payload;
          }
        });
        ```

        @method extractErrors
        @param {DS.Store} store
        @param {subclass of DS.Model} typeClass
        @param {Object} payload
        @param {String or Number} id
        @return {Object} json The deserialized errors
      */
      extractErrors: function(store, typeClass, payload, id) {
        if (payload && typeof payload === 'object' && payload.errors) {
          payload = payload.errors;
          this.normalizeErrors(typeClass, payload);
        }
        return payload;
      },

      /**
       `keyForAttribute` can be used to define rules for how to convert an
       attribute name in your model to a key in your JSON.

       Example

       ```javascript
       App.ApplicationSerializer = DS.RESTSerializer.extend({
         keyForAttribute: function(attr, method) {
           return Ember.String.underscore(attr).toUpperCase();
         }
       });
       ```

       @method keyForAttribute
       @param {String} key
       @param {String} method
       @return {String} normalized key
      */
      keyForAttribute: function(key, method) {
        return key;
      },

      /**
       `keyForRelationship` can be used to define a custom key when
       serializing and deserializing relationship properties. By default
       `JSONSerializer` does not provide an implementation of this method.

       Example

        ```javascript
        App.PostSerializer = DS.JSONSerializer.extend({
          keyForRelationship: function(key, relationship, method) {
            return 'rel_' + Ember.String.underscore(key);
          }
        });
        ```

       @method keyForRelationship
       @param {String} key
       @param {String} relationship typeClass
       @param {String} method
       @return {String} normalized key
      */

      keyForRelationship: function(key, typeClass, method) {
        return key;
      },

      // HELPERS

      /**
       @method transformFor
       @private
       @param {String} attributeType
       @param {Boolean} skipAssertion
       @return {DS.Transform} transform
      */
      transformFor: function(attributeType, skipAssertion) {
        var transform = this.container.lookup('transform:' + attributeType);
        Ember.assert("Unable to find transform for '" + attributeType + "'", skipAssertion || !!transform);
        return transform;
      }
    });

    var ember$data$lib$serializers$rest$serializer$$forEach = Ember.ArrayPolyfills.forEach;
    var ember$data$lib$serializers$rest$serializer$$map = Ember.ArrayPolyfills.map;
    var ember$data$lib$serializers$rest$serializer$$camelize = Ember.String.camelize;

    function ember$data$lib$serializers$rest$serializer$$coerceId(id) {
      return id == null ? null : id + '';
    }

    /**
      Normally, applications will use the `RESTSerializer` by implementing
      the `normalize` method and individual normalizations under
      `normalizeHash`.

      This allows you to do whatever kind of munging you need, and is
      especially useful if your server is inconsistent and you need to
      do munging differently for many different kinds of responses.

      See the `normalize` documentation for more information.

      ## Across the Board Normalization

      There are also a number of hooks that you might find useful to define
      across-the-board rules for your payload. These rules will be useful
      if your server is consistent, or if you're building an adapter for
      an infrastructure service, like Parse, and want to encode service
      conventions.

      For example, if all of your keys are underscored and all-caps, but
      otherwise consistent with the names you use in your models, you
      can implement across-the-board rules for how to convert an attribute
      name in your model to a key in your JSON.

      ```js
      App.ApplicationSerializer = DS.RESTSerializer.extend({
        keyForAttribute: function(attr, method) {
          return Ember.String.underscore(attr).toUpperCase();
        }
      });
      ```

      You can also implement `keyForRelationship`, which takes the name
      of the relationship as the first parameter, the kind of
      relationship (`hasMany` or `belongsTo`) as the second parameter, and
      the method (`serialize` or `deserialize`) as the third parameter.

      @class RESTSerializer
      @namespace DS
      @extends DS.JSONSerializer
    */
    var ember$data$lib$serializers$rest$serializer$$RESTSerializer = ember$data$lib$serializers$json$serializer$$default.extend({
      /**
        If you want to do normalizations specific to some part of the payload, you
        can specify those under `normalizeHash`.

        For example, given the following json where the the `IDs` under
        `"comments"` are provided as `_id` instead of `id`.

        ```javascript
        {
          "post": {
            "id": 1,
            "title": "Rails is omakase",
            "comments": [ 1, 2 ]
          },
          "comments": [{
            "_id": 1,
            "body": "FIRST"
          }, {
            "_id": 2,
            "body": "Rails is unagi"
          }]
        }
        ```

        You use `normalizeHash` to normalize just the comments:

        ```javascript
        App.PostSerializer = DS.RESTSerializer.extend({
          normalizeHash: {
            comments: function(hash) {
              hash.id = hash._id;
              delete hash._id;
              return hash;
            }
          }
        });
        ```

        The key under `normalizeHash` is usually just the original key
        that was in the original payload. However, key names will be
        impacted by any modifications done in the `normalizePayload`
        method. The `DS.RESTSerializer`'s default implementation makes no
        changes to the payload keys.

        @property normalizeHash
        @type {Object}
        @default undefined
      */

      /**
        Normalizes a part of the JSON payload returned by
        the server. You should override this method, munge the hash
        and call super if you have generic normalization to do.

        It takes the type of the record that is being normalized
        (as a DS.Model class), the property where the hash was
        originally found, and the hash to normalize.

        For example, if you have a payload that looks like this:

        ```js
        {
          "post": {
            "id": 1,
            "title": "Rails is omakase",
            "comments": [ 1, 2 ]
          },
          "comments": [{
            "id": 1,
            "body": "FIRST"
          }, {
            "id": 2,
            "body": "Rails is unagi"
          }]
        }
        ```

        The `normalize` method will be called three times:

        * With `App.Post`, `"posts"` and `{ id: 1, title: "Rails is omakase", ... }`
        * With `App.Comment`, `"comments"` and `{ id: 1, body: "FIRST" }`
        * With `App.Comment`, `"comments"` and `{ id: 2, body: "Rails is unagi" }`

        You can use this method, for example, to normalize underscored keys to camelized
        or other general-purpose normalizations.

        If you want to do normalizations specific to some part of the payload, you
        can specify those under `normalizeHash`.

        For example, if the `IDs` under `"comments"` are provided as `_id` instead of
        `id`, you can specify how to normalize just the comments:

        ```js
        App.PostSerializer = DS.RESTSerializer.extend({
          normalizeHash: {
            comments: function(hash) {
              hash.id = hash._id;
              delete hash._id;
              return hash;
            }
          }
        });
        ```

        The key under `normalizeHash` is just the original key that was in the original
        payload.

        @method normalize
        @param {subclass of DS.Model} typeClass
        @param {Object} hash
        @param {String} prop
        @return {Object}
      */
      normalize: function(typeClass, hash, prop) {
        this.normalizeId(hash);
        this.normalizeAttributes(typeClass, hash);
        this.normalizeRelationships(typeClass, hash);

        this.normalizeUsingDeclaredMapping(typeClass, hash);

        if (this.normalizeHash && this.normalizeHash[prop]) {
          this.normalizeHash[prop](hash);
        }

        this.applyTransforms(typeClass, hash);
        return hash;
      },


      /**
        Called when the server has returned a payload representing
        a single record, such as in response to a `find` or `save`.

        It is your opportunity to clean up the server's response into the normalized
        form expected by Ember Data.

        If you want, you can just restructure the top-level of your payload, and
        do more fine-grained normalization in the `normalize` method.

        For example, if you have a payload like this in response to a request for
        post 1:

        ```js
        {
          "id": 1,
          "title": "Rails is omakase",

          "_embedded": {
            "comment": [{
              "_id": 1,
              "comment_title": "FIRST"
            }, {
              "_id": 2,
              "comment_title": "Rails is unagi"
            }]
          }
        }
        ```

        You could implement a serializer that looks like this to get your payload
        into shape:

        ```js
        App.PostSerializer = DS.RESTSerializer.extend({
          // First, restructure the top-level so it's organized by type
          extractSingle: function(store, typeClass, payload, id) {
            var comments = payload._embedded.comment;
            delete payload._embedded;

            payload = { comments: comments, post: payload };
            return this._super(store, typeClass, payload, id);
          },

          normalizeHash: {
            // Next, normalize individual comments, which (after `extract`)
            // are now located under `comments`
            comments: function(hash) {
              hash.id = hash._id;
              hash.title = hash.comment_title;
              delete hash._id;
              delete hash.comment_title;
              return hash;
            }
          }
        })
        ```

        When you call super from your own implementation of `extractSingle`, the
        built-in implementation will find the primary record in your normalized
        payload and push the remaining records into the store.

        The primary record is the single hash found under `post` or the first
        element of the `posts` array.

        The primary record has special meaning when the record is being created
        for the first time or updated (`createRecord` or `updateRecord`). In
        particular, it will update the properties of the record that was saved.

        @method extractSingle
        @param {DS.Store} store
        @param {subclass of DS.Model} primaryTypeClasss
        @param {Object} payload
        @param {String} recordId
        @return {Object} the primary response to the original request
      */
      extractSingle: function(store, primaryTypeClass, rawPayload, recordId) {
        var payload = this.normalizePayload(rawPayload);
        var primaryTypeClassName = primaryTypeClass.typeKey;
        var primaryRecord;

        for (var prop in payload) {
          var typeName  = this.typeForRoot(prop);

          if (!store.modelFactoryFor(typeName)) {
            Ember.warn(this.warnMessageNoModelForKey(prop, typeName), false);
            continue;
          }
          var type = store.modelFor(typeName);
          var isPrimary = type.typeKey === primaryTypeClassName;
          var value = payload[prop];

          if (value === null) {
            continue;
          }

          // legacy support for singular resources
          if (isPrimary && Ember.typeOf(value) !== "array" ) {
            primaryRecord = this.normalize(primaryTypeClass, value, prop);
            continue;
          }

          /*jshint loopfunc:true*/
          ember$data$lib$serializers$rest$serializer$$forEach.call(value, function(hash) {
            var typeName = this.typeForRoot(prop);
            var type = store.modelFor(typeName);
            var typeSerializer = store.serializerFor(type);

            hash = typeSerializer.normalize(type, hash, prop);

            var isFirstCreatedRecord = isPrimary && !recordId && !primaryRecord;
            var isUpdatedRecord = isPrimary && ember$data$lib$serializers$rest$serializer$$coerceId(hash.id) === recordId;

            // find the primary record.
            //
            // It's either:
            // * the record with the same ID as the original request
            // * in the case of a newly created record that didn't have an ID, the first
            //   record in the Array
            if (isFirstCreatedRecord || isUpdatedRecord) {
              primaryRecord = hash;
            } else {
              store.push(typeName, hash);
            }
          }, this);
        }

        return primaryRecord;
      },

      /**
        Called when the server has returned a payload representing
        multiple records, such as in response to a `findAll` or `findQuery`.

        It is your opportunity to clean up the server's response into the normalized
        form expected by Ember Data.

        If you want, you can just restructure the top-level of your payload, and
        do more fine-grained normalization in the `normalize` method.

        For example, if you have a payload like this in response to a request for
        all posts:

        ```js
        {
          "_embedded": {
            "post": [{
              "id": 1,
              "title": "Rails is omakase"
            }, {
              "id": 2,
              "title": "The Parley Letter"
            }],
            "comment": [{
              "_id": 1,
              "comment_title": "Rails is unagi",
              "post_id": 1
            }, {
              "_id": 2,
              "comment_title": "Don't tread on me",
              "post_id": 2
            }]
          }
        }
        ```

        You could implement a serializer that looks like this to get your payload
        into shape:

        ```js
        App.PostSerializer = DS.RESTSerializer.extend({
          // First, restructure the top-level so it's organized by type
          // and the comments are listed under a post's `comments` key.
          extractArray: function(store, type, payload) {
            var posts = payload._embedded.post;
            var comments = [];
            var postCache = {};

            posts.forEach(function(post) {
              post.comments = [];
              postCache[post.id] = post;
            });

            payload._embedded.comment.forEach(function(comment) {
              comments.push(comment);
              postCache[comment.post_id].comments.push(comment);
              delete comment.post_id;
            });

            payload = { comments: comments, posts: posts };

            return this._super(store, type, payload);
          },

          normalizeHash: {
            // Next, normalize individual comments, which (after `extract`)
            // are now located under `comments`
            comments: function(hash) {
              hash.id = hash._id;
              hash.title = hash.comment_title;
              delete hash._id;
              delete hash.comment_title;
              return hash;
            }
          }
        })
        ```

        When you call super from your own implementation of `extractArray`, the
        built-in implementation will find the primary array in your normalized
        payload and push the remaining records into the store.

        The primary array is the array found under `posts`.

        The primary record has special meaning when responding to `findQuery`
        or `findHasMany`. In particular, the primary array will become the
        list of records in the record array that kicked off the request.

        If your primary array contains secondary (embedded) records of the same type,
        you cannot place these into the primary array `posts`. Instead, place the
        secondary items into an underscore prefixed property `_posts`, which will
        push these items into the store and will not affect the resulting query.

        @method extractArray
        @param {DS.Store} store
        @param {subclass of DS.Model} primaryTypeClass
        @param {Object} payload
        @return {Array} The primary array that was returned in response
          to the original query.
      */
      extractArray: function(store, primaryTypeClass, rawPayload) {
        var payload = this.normalizePayload(rawPayload);
        var primaryTypeClassName = primaryTypeClass.typeKey;
        var primaryArray;

        for (var prop in payload) {
          var typeKey = prop;
          var forcedSecondary = false;

          if (prop.charAt(0) === '_') {
            forcedSecondary = true;
            typeKey = prop.substr(1);
          }

          var typeName = this.typeForRoot(typeKey);
          if (!store.modelFactoryFor(typeName)) {
            Ember.warn(this.warnMessageNoModelForKey(prop, typeName), false);
            continue;
          }
          var type = store.modelFor(typeName);
          var typeSerializer = store.serializerFor(type);
          var isPrimary = (!forcedSecondary && (type.typeKey === primaryTypeClassName));

          /*jshint loopfunc:true*/
          var normalizedArray = ember$data$lib$serializers$rest$serializer$$map.call(payload[prop], function(hash) {
            return typeSerializer.normalize(type, hash, prop);
          }, this);

          if (isPrimary) {
            primaryArray = normalizedArray;
          } else {
            store.pushMany(typeName, normalizedArray);
          }
        }

        return primaryArray;
      },

      /**
        This method allows you to push a payload containing top-level
        collections of records organized per type.

        ```js
        {
          "posts": [{
            "id": "1",
            "title": "Rails is omakase",
            "author", "1",
            "comments": [ "1" ]
          }],
          "comments": [{
            "id": "1",
            "body": "FIRST"
          }],
          "users": [{
            "id": "1",
            "name": "@d2h"
          }]
        }
        ```

        It will first normalize the payload, so you can use this to push
        in data streaming in from your server structured the same way
        that fetches and saves are structured.

        @method pushPayload
        @param {DS.Store} store
        @param {Object} payload
      */
      pushPayload: function(store, rawPayload) {
        var payload = this.normalizePayload(rawPayload);

        for (var prop in payload) {
          var typeKey = this.typeForRoot(prop);
          if (!store.modelFactoryFor(typeKey, prop)) {
            Ember.warn(this.warnMessageNoModelForKey(prop, typeKey), false);
            continue;
          }
          var type = store.modelFor(typeKey);
          var typeSerializer = store.serializerFor(type);

          /*jshint loopfunc:true*/
          var normalizedArray = ember$data$lib$serializers$rest$serializer$$map.call(Ember.makeArray(payload[prop]), function(hash) {
            return typeSerializer.normalize(type, hash, prop);
          }, this);

          store.pushMany(typeKey, normalizedArray);
        }
      },

      /**
        This method is used to convert each JSON root key in the payload
        into a typeKey that it can use to look up the appropriate model for
        that part of the payload. By default the typeKey for a model is its
        name in camelCase, so if your JSON root key is 'fast-car' you would
        use typeForRoot to convert it to 'fastCar' so that Ember Data finds
        the `FastCar` model.

        If you diverge from this norm you should also consider changes to
        store._normalizeTypeKey as well.

        For example, your server may return prefixed root keys like so:

        ```js
        {
          "response-fast-car": {
            "id": "1",
            "name": "corvette"
          }
        }
        ```

        In order for Ember Data to know that the model corresponding to
        the 'response-fast-car' hash is `FastCar` (typeKey: 'fastCar'),
        you can override typeForRoot to convert 'response-fast-car' to
        'fastCar' like so:

        ```js
        App.ApplicationSerializer = DS.RESTSerializer.extend({
          typeForRoot: function(root) {
            // 'response-fast-car' should become 'fast-car'
            var subRoot = root.substring(9);

            // _super normalizes 'fast-car' to 'fastCar'
            return this._super(subRoot);
          }
        });
        ```

        @method typeForRoot
        @param {String} key
        @return {String} the model's typeKey
      */
      typeForRoot: function(key) {
        return ember$data$lib$serializers$rest$serializer$$camelize(ember$inflector$lib$lib$system$string$$singularize(key));
      },

      // SERIALIZE

      /**
        Called when a record is saved in order to convert the
        record into JSON.

        By default, it creates a JSON object with a key for
        each attribute and belongsTo relationship.

        For example, consider this model:

        ```js
        App.Comment = DS.Model.extend({
          title: DS.attr(),
          body: DS.attr(),

          author: DS.belongsTo('user')
        });
        ```

        The default serialization would create a JSON object like:

        ```js
        {
          "title": "Rails is unagi",
          "body": "Rails? Omakase? O_O",
          "author": 12
        }
        ```

        By default, attributes are passed through as-is, unless
        you specified an attribute type (`DS.attr('date')`). If
        you specify a transform, the JavaScript value will be
        serialized when inserted into the JSON hash.

        By default, belongs-to relationships are converted into
        IDs when inserted into the JSON hash.

        ## IDs

        `serialize` takes an options hash with a single option:
        `includeId`. If this option is `true`, `serialize` will,
        by default include the ID in the JSON object it builds.

        The adapter passes in `includeId: true` when serializing
        a record for `createRecord`, but not for `updateRecord`.

        ## Customization

        Your server may expect a different JSON format than the
        built-in serialization format.

        In that case, you can implement `serialize` yourself and
        return a JSON hash of your choosing.

        ```js
        App.PostSerializer = DS.RESTSerializer.extend({
          serialize: function(snapshot, options) {
            var json = {
              POST_TTL: snapshot.attr('title'),
              POST_BDY: snapshot.attr('body'),
              POST_CMS: snapshot.hasMany('comments', { ids: true })
            }

            if (options.includeId) {
              json.POST_ID_ = snapshot.id;
            }

            return json;
          }
        });
        ```

        ## Customizing an App-Wide Serializer

        If you want to define a serializer for your entire
        application, you'll probably want to use `eachAttribute`
        and `eachRelationship` on the record.

        ```js
        App.ApplicationSerializer = DS.RESTSerializer.extend({
          serialize: function(snapshot, options) {
            var json = {};

            snapshot.eachAttribute(function(name) {
              json[serverAttributeName(name)] = snapshot.attr(name);
            })

            snapshot.eachRelationship(function(name, relationship) {
              if (relationship.kind === 'hasMany') {
                json[serverHasManyName(name)] = snapshot.hasMany(name, { ids: true });
              }
            });

            if (options.includeId) {
              json.ID_ = snapshot.id;
            }

            return json;
          }
        });

        function serverAttributeName(attribute) {
          return attribute.underscore().toUpperCase();
        }

        function serverHasManyName(name) {
          return serverAttributeName(name.singularize()) + "_IDS";
        }
        ```

        This serializer will generate JSON that looks like this:

        ```js
        {
          "TITLE": "Rails is omakase",
          "BODY": "Yep. Omakase.",
          "COMMENT_IDS": [ 1, 2, 3 ]
        }
        ```

        ## Tweaking the Default JSON

        If you just want to do some small tweaks on the default JSON,
        you can call super first and make the tweaks on the returned
        JSON.

        ```js
        App.PostSerializer = DS.RESTSerializer.extend({
          serialize: function(snapshot, options) {
            var json = this._super(snapshot, options);

            json.subject = json.title;
            delete json.title;

            return json;
          }
        });
        ```

        @method serialize
        @param {DS.Snapshot} snapshot
        @param {Object} options
        @return {Object} json
      */
      serialize: function(snapshot, options) {
        return this._super.apply(this, arguments);
      },

      /**
        You can use this method to customize the root keys serialized into the JSON.
        By default the REST Serializer sends the typeKey of a model, which is a camelized
        version of the name.

        For example, your server may expect underscored root objects.

        ```js
        App.ApplicationSerializer = DS.RESTSerializer.extend({
          serializeIntoHash: function(data, type, record, options) {
            var root = Ember.String.decamelize(type.typeKey);
            data[root] = this.serialize(record, options);
          }
        });
        ```

        @method serializeIntoHash
        @param {Object} hash
        @param {subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
        @param {Object} options
      */
      serializeIntoHash: function(hash, typeClass, snapshot, options) {
        hash[typeClass.typeKey] = this.serialize(snapshot, options);
      },

      /**
        You can use this method to customize how polymorphic objects are serialized.
        By default the JSON Serializer creates the key by appending `Type` to
        the attribute and value from the model's camelcased model name.

        @method serializePolymorphicType
        @param {DS.Snapshot} snapshot
        @param {Object} json
        @param {Object} relationship
      */
      serializePolymorphicType: function(snapshot, json, relationship) {
        var key = relationship.key;
        var belongsTo = snapshot.belongsTo(key);
        key = this.keyForAttribute ? this.keyForAttribute(key, "serialize") : key;
        if (Ember.isNone(belongsTo)) {
          json[key + "Type"] = null;
        } else {
          json[key + "Type"] = Ember.String.camelize(belongsTo.typeKey);
        }
      }
    });

    Ember.runInDebug(function() {
      ember$data$lib$serializers$rest$serializer$$RESTSerializer.reopen({
        warnMessageNoModelForKey: function(prop, typeKey) {
          return 'Encountered "' + prop + '" in payload, but no model was found for model name "' + typeKey + '" (resolved model name using ' + this.constructor.toString() + '.typeForRoot("' + prop + '"))';
        }
      });
    });

    var ember$data$lib$serializers$rest$serializer$$default = ember$data$lib$serializers$rest$serializer$$RESTSerializer;
    /**
      @module ember-data
    */

    var activemodel$adapter$lib$system$active$model$serializer$$forEach = Ember.EnumerableUtils.forEach;
    var activemodel$adapter$lib$system$active$model$serializer$$camelize =   Ember.String.camelize;
    var activemodel$adapter$lib$system$active$model$serializer$$classify = Ember.String.classify;
    var activemodel$adapter$lib$system$active$model$serializer$$decamelize = Ember.String.decamelize;
    var activemodel$adapter$lib$system$active$model$serializer$$underscore = Ember.String.underscore;

    /**
      The ActiveModelSerializer is a subclass of the RESTSerializer designed to integrate
      with a JSON API that uses an underscored naming convention instead of camelCasing.
      It has been designed to work out of the box with the
      [active\_model\_serializers](http://github.com/rails-api/active_model_serializers)
      Ruby gem. This Serializer expects specific settings using ActiveModel::Serializers,
      `embed :ids, embed_in_root: true` which sideloads the records.

      This serializer extends the DS.RESTSerializer by making consistent
      use of the camelization, decamelization and pluralization methods to
      normalize the serialized JSON into a format that is compatible with
      a conventional Rails backend and Ember Data.

      ## JSON Structure

      The ActiveModelSerializer expects the JSON returned from your server
      to follow the REST adapter conventions substituting underscored keys
      for camelcased ones.

      ### Conventional Names

      Attribute names in your JSON payload should be the underscored versions of
      the attributes in your Ember.js models.

      For example, if you have a `Person` model:

      ```js
      App.FamousPerson = DS.Model.extend({
        firstName: DS.attr('string'),
        lastName: DS.attr('string'),
        occupation: DS.attr('string')
      });
      ```

      The JSON returned should look like this:

      ```js
      {
        "famous_person": {
          "id": 1,
          "first_name": "Barack",
          "last_name": "Obama",
          "occupation": "President"
        }
      }
      ```

      Let's imagine that `Occupation` is just another model:

      ```js
      App.Person = DS.Model.extend({
        firstName: DS.attr('string'),
        lastName: DS.attr('string'),
        occupation: DS.belongsTo('occupation')
      });

      App.Occupation = DS.Model.extend({
        name: DS.attr('string'),
        salary: DS.attr('number'),
        people: DS.hasMany('person')
      });
      ```

      The JSON needed to avoid extra server calls, should look like this:

      ```js
      {
        "people": [{
          "id": 1,
          "first_name": "Barack",
          "last_name": "Obama",
          "occupation_id": 1
        }],

        "occupations": [{
          "id": 1,
          "name": "President",
          "salary": 100000,
          "person_ids": [1]
        }]
      }
      ```

      @class ActiveModelSerializer
      @namespace DS
      @extends DS.RESTSerializer
    */
    var activemodel$adapter$lib$system$active$model$serializer$$ActiveModelSerializer = ember$data$lib$serializers$rest$serializer$$default.extend({
      // SERIALIZE

      /**
        Converts camelCased attributes to underscored when serializing.

        @method keyForAttribute
        @param {String} attribute
        @return String
      */
      keyForAttribute: function(attr) {
        return activemodel$adapter$lib$system$active$model$serializer$$decamelize(attr);
      },

      /**
        Underscores relationship names and appends "_id" or "_ids" when serializing
        relationship keys.

        @method keyForRelationship
        @param {String} relationshipTypeKey
        @param {String} kind
        @return String
      */
      keyForRelationship: function(relationshipTypeKey, kind) {
        var key = activemodel$adapter$lib$system$active$model$serializer$$decamelize(relationshipTypeKey);
        if (kind === "belongsTo") {
          return key + "_id";
        } else if (kind === "hasMany") {
          return ember$inflector$lib$lib$system$string$$singularize(key) + "_ids";
        } else {
          return key;
        }
      },

      /*
        Does not serialize hasMany relationships by default.
      */
      serializeHasMany: Ember.K,

      /**
        Underscores the JSON root keys when serializing.

        @method serializeIntoHash
        @param {Object} hash
        @param {subclass of DS.Model} typeClass
        @param {DS.Snapshot} snapshot
        @param {Object} options
      */
      serializeIntoHash: function(data, typeClass, snapshot, options) {
        var root = activemodel$adapter$lib$system$active$model$serializer$$underscore(activemodel$adapter$lib$system$active$model$serializer$$decamelize(typeClass.typeKey));
        data[root] = this.serialize(snapshot, options);
      },

      /**
        Serializes a polymorphic type as a fully capitalized model name.

        @method serializePolymorphicType
        @param {DS.Snapshot} snapshot
        @param {Object} json
        @param {Object} relationship
      */
      serializePolymorphicType: function(snapshot, json, relationship) {
        var key = relationship.key;
        var belongsTo = snapshot.belongsTo(key);
        var jsonKey = activemodel$adapter$lib$system$active$model$serializer$$underscore(key + "_type");

        if (Ember.isNone(belongsTo)) {
          json[jsonKey] = null;
        } else {
          json[jsonKey] = activemodel$adapter$lib$system$active$model$serializer$$classify(belongsTo.typeKey).replace(/(\/)([a-z])/g, function(match, separator, chr) {
            return match.toUpperCase();
          }).replace('/', '::');
        }
      },

      // EXTRACT

      /**
        Add extra step to `DS.RESTSerializer.normalize` so links are normalized.

        If your payload looks like:

        ```js
        {
          "post": {
            "id": 1,
            "title": "Rails is omakase",
            "links": { "flagged_comments": "api/comments/flagged" }
          }
        }
        ```

        The normalized version would look like this

        ```js
        {
          "post": {
            "id": 1,
            "title": "Rails is omakase",
            "links": { "flaggedComments": "api/comments/flagged" }
          }
        }
        ```

        @method normalize
        @param {subclass of DS.Model} typeClass
        @param {Object} hash
        @param {String} prop
        @return Object
      */

      normalize: function(typeClass, hash, prop) {
        this.normalizeLinks(hash);

        return this._super(typeClass, hash, prop);
      },

      /**
        Convert `snake_cased` links  to `camelCase`

        @method normalizeLinks
        @param {Object} data
      */

      normalizeLinks: function(data) {
        if (data.links) {
          var links = data.links;

          for (var link in links) {
            var camelizedLink = activemodel$adapter$lib$system$active$model$serializer$$camelize(link);

            if (camelizedLink !== link) {
              links[camelizedLink] = links[link];
              delete links[link];
            }
          }
        }
      },

      /**
        Normalize the polymorphic type from the JSON.

        Normalize:
        ```js
          {
            id: "1"
            minion: { type: "evil_minion", id: "12"}
          }
        ```

        To:
        ```js
          {
            id: "1"
            minion: { type: "evilMinion", id: "12"}
          }
        ```

        @param {Subclass of DS.Model} typeClass
        @method normalizeRelationships
        @private
      */
      normalizeRelationships: function(typeClass, hash) {

        if (this.keyForRelationship) {
          typeClass.eachRelationship(function(key, relationship) {
            var payloadKey, payload;
            if (relationship.options.polymorphic) {
              payloadKey = this.keyForAttribute(key, "deserialize");
              payload = hash[payloadKey];
              if (payload && payload.type) {
                payload.type = this.typeForRoot(payload.type);
              } else if (payload && relationship.kind === "hasMany") {
                var self = this;
                activemodel$adapter$lib$system$active$model$serializer$$forEach(payload, function(single) {
                  single.type = self.typeForRoot(single.type);
                });
              }
            } else {
              payloadKey = this.keyForRelationship(key, relationship.kind, "deserialize");
              if (!hash.hasOwnProperty(payloadKey)) { return; }
              payload = hash[payloadKey];
            }

            hash[key] = payload;

            if (key !== payloadKey) {
              delete hash[payloadKey];
            }
          }, this);
        }
      },
      typeForRoot: function(key) {
        return activemodel$adapter$lib$system$active$model$serializer$$camelize(ember$inflector$lib$lib$system$string$$singularize(key)).replace(/(^|\:)([A-Z])/g, function(match, separator, chr) {
          return match.toLowerCase();
        }).replace('::', '/');
      }
    });

    var activemodel$adapter$lib$system$active$model$serializer$$default = activemodel$adapter$lib$system$active$model$serializer$$ActiveModelSerializer;
    function ember$data$lib$system$container$proxy$$ContainerProxy(container) {
      this.container = container;
    }

    ember$data$lib$system$container$proxy$$ContainerProxy.prototype.aliasedFactory = function(path, preLookup) {
      var _this = this;

      return {
        create: function() {
          if (preLookup) { preLookup(); }

          return _this.container.lookup(path);
        }
      };
    };

    ember$data$lib$system$container$proxy$$ContainerProxy.prototype.registerAlias = function(source, dest, preLookup) {
      var factory = this.aliasedFactory(dest, preLookup);

      return this.container.register(source, factory);
    };

    ember$data$lib$system$container$proxy$$ContainerProxy.prototype.registerDeprecation = function(deprecated, valid) {
      var preLookupCallback = function() {
        Ember.deprecate("You tried to look up '" + deprecated + "', " +
                        "but this has been deprecated in favor of '" + valid + "'.", false);
      };

      return this.registerAlias(deprecated, valid, preLookupCallback);
    };

    ember$data$lib$system$container$proxy$$ContainerProxy.prototype.registerDeprecations = function(proxyPairs) {
      var i, proxyPair, deprecated, valid;

      for (i = proxyPairs.length; i > 0; i--) {
        proxyPair = proxyPairs[i - 1];
        deprecated = proxyPair['deprecated'];
        valid = proxyPair['valid'];

        this.registerDeprecation(deprecated, valid);
      }
    };

    var ember$data$lib$system$container$proxy$$default = ember$data$lib$system$container$proxy$$ContainerProxy;
    function activemodel$adapter$lib$setup$container$$setupActiveModelAdapter(registry, application) {
      var proxy = new ember$data$lib$system$container$proxy$$default(registry);
      proxy.registerDeprecations([
        { deprecated: 'serializer:_ams',  valid: 'serializer:-active-model' },
        { deprecated: 'adapter:_ams',     valid: 'adapter:-active-model' }
      ]);

      registry.register('serializer:-active-model', activemodel$adapter$lib$system$active$model$serializer$$default);
      registry.register('adapter:-active-model', activemodel$adapter$lib$system$active$model$adapter$$default);
    }
    var activemodel$adapter$lib$setup$container$$default = activemodel$adapter$lib$setup$container$$setupActiveModelAdapter;
    var ember$data$lib$core$$DS = Ember.Namespace.create({
      VERSION: '1.0.0-beta.17'
    });

    if (Ember.libraries) {
      Ember.libraries.registerCoreLibrary('Ember Data', ember$data$lib$core$$DS.VERSION);
    }

    var ember$data$lib$core$$default = ember$data$lib$core$$DS;
    var ember$data$lib$system$promise$proxies$$Promise = Ember.RSVP.Promise;
    var ember$data$lib$system$promise$proxies$$get = Ember.get;

    /**
      A `PromiseArray` is an object that acts like both an `Ember.Array`
      and a promise. When the promise is resolved the resulting value
      will be set to the `PromiseArray`'s `content` property. This makes
      it easy to create data bindings with the `PromiseArray` that will be
      updated when the promise resolves.

      For more information see the [Ember.PromiseProxyMixin
      documentation](/api/classes/Ember.PromiseProxyMixin.html).

      Example

      ```javascript
      var promiseArray = DS.PromiseArray.create({
        promise: $.getJSON('/some/remote/data.json')
      });

      promiseArray.get('length'); // 0

      promiseArray.then(function() {
        promiseArray.get('length'); // 100
      });
      ```

      @class PromiseArray
      @namespace DS
      @extends Ember.ArrayProxy
      @uses Ember.PromiseProxyMixin
    */
    var ember$data$lib$system$promise$proxies$$PromiseArray = Ember.ArrayProxy.extend(Ember.PromiseProxyMixin);

    /**
      A `PromiseObject` is an object that acts like both an `Ember.Object`
      and a promise. When the promise is resolved, then the resulting value
      will be set to the `PromiseObject`'s `content` property. This makes
      it easy to create data bindings with the `PromiseObject` that will
      be updated when the promise resolves.

      For more information see the [Ember.PromiseProxyMixin
      documentation](/api/classes/Ember.PromiseProxyMixin.html).

      Example

      ```javascript
      var promiseObject = DS.PromiseObject.create({
        promise: $.getJSON('/some/remote/data.json')
      });

      promiseObject.get('name'); // null

      promiseObject.then(function() {
        promiseObject.get('name'); // 'Tomster'
      });
      ```

      @class PromiseObject
      @namespace DS
      @extends Ember.ObjectProxy
      @uses Ember.PromiseProxyMixin
    */
    var ember$data$lib$system$promise$proxies$$PromiseObject = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

    var ember$data$lib$system$promise$proxies$$promiseObject = function(promise, label) {
      return ember$data$lib$system$promise$proxies$$PromiseObject.create({
        promise: ember$data$lib$system$promise$proxies$$Promise.resolve(promise, label)
      });
    };

    var ember$data$lib$system$promise$proxies$$promiseArray = function(promise, label) {
      return ember$data$lib$system$promise$proxies$$PromiseArray.create({
        promise: ember$data$lib$system$promise$proxies$$Promise.resolve(promise, label)
      });
    };

    /**
      A PromiseManyArray is a PromiseArray that also proxies certain method calls
      to the underlying manyArray.
      Right now we proxy:

        * `reload()`
        * `createRecord()`
        * `on()`
        * `one()`
        * `trigger()`
        * `off()`
        * `has()`

      @class PromiseManyArray
      @namespace DS
      @extends Ember.ArrayProxy
    */

    function ember$data$lib$system$promise$proxies$$proxyToContent(method) {
      return function() {
        var content = ember$data$lib$system$promise$proxies$$get(this, 'content');
        return content[method].apply(content, arguments);
      };
    }

    var ember$data$lib$system$promise$proxies$$PromiseManyArray = ember$data$lib$system$promise$proxies$$PromiseArray.extend({
      reload: function() {
        //I don't think this should ever happen right now, but worth guarding if we refactor the async relationships
        Ember.assert('You are trying to reload an async manyArray before it has been created', ember$data$lib$system$promise$proxies$$get(this, 'content'));
        return ember$data$lib$system$promise$proxies$$PromiseManyArray.create({
          promise: ember$data$lib$system$promise$proxies$$get(this, 'content').reload()
        });
      },

      createRecord: ember$data$lib$system$promise$proxies$$proxyToContent('createRecord'),

      on: ember$data$lib$system$promise$proxies$$proxyToContent('on'),

      one: ember$data$lib$system$promise$proxies$$proxyToContent('one'),

      trigger: ember$data$lib$system$promise$proxies$$proxyToContent('trigger'),

      off: ember$data$lib$system$promise$proxies$$proxyToContent('off'),

      has: ember$data$lib$system$promise$proxies$$proxyToContent('has')
    });

    var ember$data$lib$system$promise$proxies$$promiseManyArray = function(promise, label) {
      return ember$data$lib$system$promise$proxies$$PromiseManyArray.create({
        promise: ember$data$lib$system$promise$proxies$$Promise.resolve(promise, label)
      });
    };


    var ember$data$lib$system$store$common$$get = Ember.get;

    function ember$data$lib$system$store$common$$_bind(fn) {
      var args = Array.prototype.slice.call(arguments, 1);

      return function() {
        return fn.apply(undefined, args);
      };
    }

    function ember$data$lib$system$store$common$$_guard(promise, test) {
      var guarded = promise['finally'](function() {
        if (!test()) {
          guarded._subscribers.length = 0;
        }
      });

      return guarded;
    }

    function ember$data$lib$system$store$common$$_objectIsAlive(object) {
      return !(ember$data$lib$system$store$common$$get(object, "isDestroyed") || ember$data$lib$system$store$common$$get(object, "isDestroying"));
    }
    function ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, type) {
      var serializer = adapter.serializer;

      if (serializer === undefined) {
        serializer = store.serializerFor(type);
      }

      if (serializer === null || serializer === undefined) {
        serializer = {
          extract: function(store, type, payload) { return payload; }
        };
      }

      return serializer;
    }


    var ember$data$lib$system$store$finders$$get = Ember.get;
    var ember$data$lib$system$store$finders$$Promise = Ember.RSVP.Promise;

    function ember$data$lib$system$store$finders$$_find(adapter, store, typeClass, id, record) {
      var snapshot = record._createSnapshot();
      var promise = adapter.find(store, typeClass, id, snapshot);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, typeClass);
      var label = "DS: Handle Adapter#find of " + typeClass + " with id: " + id;

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));

      return promise.then(function(adapterPayload) {
        Ember.assert("You made a request for a " + typeClass.typeClassKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
        return store._adapterRun(function() {
          var payload = serializer.extract(store, typeClass, adapterPayload, id, 'find');

          return store.push(typeClass, payload);
        });
      }, function(error) {
        record.notFound();
        if (ember$data$lib$system$store$finders$$get(record, 'isEmpty')) {
          store.unloadRecord(record);
        }

        throw error;
      }, "DS: Extract payload of '" + typeClass + "'");
    }


    function ember$data$lib$system$store$finders$$_findMany(adapter, store, typeClass, ids, records) {
      var snapshots = Ember.A(records).invoke('_createSnapshot');
      var promise = adapter.findMany(store, typeClass, ids, snapshots);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, typeClass);
      var label = "DS: Handle Adapter#findMany of " + typeClass;

      if (promise === undefined) {
        throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
      }

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));

      return promise.then(function(adapterPayload) {
        return store._adapterRun(function() {
          var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findMany');

          Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

          return store.pushMany(typeClass, payload);
        });
      }, null, "DS: Extract payload of " + typeClass);
    }

    function ember$data$lib$system$store$finders$$_findHasMany(adapter, store, record, link, relationship) {
      var snapshot = record._createSnapshot();
      var promise = adapter.findHasMany(store, snapshot, link, relationship);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, relationship.type);
      var label = "DS: Handle Adapter#findHasMany of " + record + " : " + relationship.type;

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, record));

      return promise.then(function(adapterPayload) {
        return store._adapterRun(function() {
          var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findHasMany');

          Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

          var records = store.pushMany(relationship.type, payload);
          return records;
        });
      }, null, "DS: Extract payload of " + record + " : hasMany " + relationship.type);
    }

    function ember$data$lib$system$store$finders$$_findBelongsTo(adapter, store, record, link, relationship) {
      var snapshot = record._createSnapshot();
      var promise = adapter.findBelongsTo(store, snapshot, link, relationship);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, relationship.type);
      var label = "DS: Handle Adapter#findBelongsTo of " + record + " : " + relationship.type;

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, record));

      return promise.then(function(adapterPayload) {
        return store._adapterRun(function() {
          var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findBelongsTo');

          if (!payload) {
            return null;
          }

          var record = store.push(relationship.type, payload);
          return record;
        });
      }, null, "DS: Extract payload of " + record + " : " + relationship.type);
    }

    function ember$data$lib$system$store$finders$$_findAll(adapter, store, typeClass, sinceToken) {
      var promise = adapter.findAll(store, typeClass, sinceToken);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, typeClass);
      var label = "DS: Handle Adapter#findAll of " + typeClass;

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));

      return promise.then(function(adapterPayload) {
        store._adapterRun(function() {
          var payload = serializer.extract(store, typeClass, adapterPayload, null, 'findAll');

          Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

          store.pushMany(typeClass, payload);
        });

        store.didUpdateAll(typeClass);
        return store.all(typeClass);
      }, null, "DS: Extract payload of findAll " + typeClass);
    }

    function ember$data$lib$system$store$finders$$_findQuery(adapter, store, typeClass, query, recordArray) {
      var promise = adapter.findQuery(store, typeClass, query, recordArray);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, typeClass);
      var label = "DS: Handle Adapter#findQuery of " + typeClass;

      promise = ember$data$lib$system$store$finders$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));

      return promise.then(function(adapterPayload) {
        var payload;
        store._adapterRun(function() {
          payload = serializer.extract(store, typeClass, adapterPayload, null, 'findQuery');

          Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');
        });

        recordArray.load(payload);
        return recordArray;

      }, null, "DS: Extract payload of findQuery " + typeClass);
    }
    var ember$data$lib$system$record$arrays$record$array$$get = Ember.get;
    var ember$data$lib$system$record$arrays$record$array$$set = Ember.set;

    var ember$data$lib$system$record$arrays$record$array$$default = Ember.ArrayProxy.extend(Ember.Evented, {
      /**
        The model type contained by this record array.

        @property type
        @type DS.Model
      */
      type: null,

      /**
        The array of client ids backing the record array. When a
        record is requested from the record array, the record
        for the client id at the same index is materialized, if
        necessary, by the store.

        @property content
        @private
        @type Ember.Array
      */
      content: null,

      /**
        The flag to signal a `RecordArray` is currently loading data.

        Example

        ```javascript
        var people = store.all('person');
        people.get('isLoaded'); // true
        ```

        @property isLoaded
        @type Boolean
      */
      isLoaded: false,
      /**
        The flag to signal a `RecordArray` is currently loading data.

        Example

        ```javascript
        var people = store.all('person');
        people.get('isUpdating'); // false
        people.update();
        people.get('isUpdating'); // true
        ```

        @property isUpdating
        @type Boolean
      */
      isUpdating: false,

      /**
        The store that created this record array.

        @property store
        @private
        @type DS.Store
      */
      store: null,

      /**
        Retrieves an object from the content by index.

        @method objectAtContent
        @private
        @param {Number} index
        @return {DS.Model} record
      */
      objectAtContent: function(index) {
        var content = ember$data$lib$system$record$arrays$record$array$$get(this, 'content');

        return content.objectAt(index);
      },

      /**
        Used to get the latest version of all of the records in this array
        from the adapter.

        Example

        ```javascript
        var people = store.all('person');
        people.get('isUpdating'); // false
        people.update();
        people.get('isUpdating'); // true
        ```

        @method update
      */
      update: function() {
        if (ember$data$lib$system$record$arrays$record$array$$get(this, 'isUpdating')) { return; }

        var store = ember$data$lib$system$record$arrays$record$array$$get(this, 'store');
        var type = ember$data$lib$system$record$arrays$record$array$$get(this, 'type');

        return store.fetchAll(type, this);
      },

      /**
        Adds a record to the `RecordArray` without duplicates

        @method addRecord
        @private
        @param {DS.Model} record
        @param {DS.Model} an optional index to insert at
      */
      addRecord: function(record, idx) {
        var content = ember$data$lib$system$record$arrays$record$array$$get(this, 'content');
        if (idx === undefined) {
          content.addObject(record);
        } else if (!content.contains(record)) {
          content.insertAt(idx, record);
        }
      },

      _pushRecord: function(record) {
        ember$data$lib$system$record$arrays$record$array$$get(this, 'content').pushObject(record);
      },

      /**
        Adds a record to the `RecordArray`, but allows duplicates

        @deprecated
        @method pushRecord
        @private
        @param {DS.Model} record
      */
      pushRecord: function(record) {
        Ember.deprecate('Usage of `recordArray.pushRecord` is deprecated, use `recordArray.addObject` instead');
        this._pushRecord(record);
      },
      /**
        Removes a record to the `RecordArray`.

        @method removeRecord
        @private
        @param {DS.Model} record
      */
      removeRecord: function(record) {
        ember$data$lib$system$record$arrays$record$array$$get(this, 'content').removeObject(record);
      },

      /**
        Saves all of the records in the `RecordArray`.

        Example

        ```javascript
        var messages = store.all('message');
        messages.forEach(function(message) {
          message.set('hasBeenSeen', true);
        });
        messages.save();
        ```

        @method save
        @return {DS.PromiseArray} promise
      */
      save: function() {
        var recordArray = this;
        var promiseLabel = "DS: RecordArray#save " + ember$data$lib$system$record$arrays$record$array$$get(this, 'type');
        var promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).then(function(array) {
          return recordArray;
        }, null, "DS: RecordArray#save return RecordArray");

        return ember$data$lib$system$promise$proxies$$PromiseArray.create({ promise: promise });
      },

      _dissociateFromOwnRecords: function() {
        var array = this;

        this.forEach(function(record) {
          var recordArrays = record._recordArrays;

          if (recordArrays) {
            recordArrays["delete"](array);
          }
        });
      },

      /**
        @method _unregisterFromManager
        @private
      */
      _unregisterFromManager: function() {
        var manager = ember$data$lib$system$record$arrays$record$array$$get(this, 'manager');
        //We will stop needing this stupid if statement soon, once manyArray are refactored to not be RecordArrays
        if (manager) {
          manager.unregisterFilteredRecordArray(this);
        }
      },

      willDestroy: function() {
        this._unregisterFromManager();
        this._dissociateFromOwnRecords();
        ember$data$lib$system$record$arrays$record$array$$set(this, 'content', undefined);
        this._super.apply(this, arguments);
      }
    });

    /**
      @module ember-data
    */

    var ember$data$lib$system$record$arrays$filtered$record$array$$get = Ember.get;

    var ember$data$lib$system$record$arrays$filtered$record$array$$default = ember$data$lib$system$record$arrays$record$array$$default.extend({
      /**
        The filterFunction is a function used to test records from the store to
        determine if they should be part of the record array.

        Example

        ```javascript
        var allPeople = store.all('person');
        allPeople.mapBy('name'); // ["Tom Dale", "Yehuda Katz", "Trek Glowacki"]

        var people = store.filter('person', function(person) {
          if (person.get('name').match(/Katz$/)) { return true; }
        });
        people.mapBy('name'); // ["Yehuda Katz"]

        var notKatzFilter = function(person) {
          return !person.get('name').match(/Katz$/);
        };
        people.set('filterFunction', notKatzFilter);
        people.mapBy('name'); // ["Tom Dale", "Trek Glowacki"]
        ```

        @method filterFunction
        @param {DS.Model} record
        @return {Boolean} `true` if the record should be in the array
      */
      filterFunction: null,
      isLoaded: true,

      replace: function() {
        var type = ember$data$lib$system$record$arrays$filtered$record$array$$get(this, 'type').toString();
        throw new Error("The result of a client-side filter (on " + type + ") is immutable.");
      },

      /**
        @method updateFilter
        @private
      */
      _updateFilter: function() {
        var manager = ember$data$lib$system$record$arrays$filtered$record$array$$get(this, 'manager');
        manager.updateFilter(this, ember$data$lib$system$record$arrays$filtered$record$array$$get(this, 'type'), ember$data$lib$system$record$arrays$filtered$record$array$$get(this, 'filterFunction'));
      },

      updateFilter: Ember.observer(function() {
        Ember.run.once(this, this._updateFilter);
      }, 'filterFunction')
    });

    /**
      @module ember-data
    */

    var ember$data$lib$system$record$arrays$adapter$populated$record$array$$get = Ember.get;

    function ember$data$lib$system$record$arrays$adapter$populated$record$array$$cloneNull(source) {
      var clone = Ember.create(null);
      for (var key in source) {
        clone[key] = source[key];
      }
      return clone;
    }

    var ember$data$lib$system$record$arrays$adapter$populated$record$array$$default = ember$data$lib$system$record$arrays$record$array$$default.extend({
      query: null,

      replace: function() {
        var type = ember$data$lib$system$record$arrays$adapter$populated$record$array$$get(this, 'type').toString();
        throw new Error("The result of a server query (on " + type + ") is immutable.");
      },

      /**
        @method load
        @private
        @param {Array} data
      */
      load: function(data) {
        var store = ember$data$lib$system$record$arrays$adapter$populated$record$array$$get(this, 'store');
        var type = ember$data$lib$system$record$arrays$adapter$populated$record$array$$get(this, 'type');
        var records = store.pushMany(type, data);
        var meta = store.metadataFor(type);

        this.setProperties({
          content: Ember.A(records),
          isLoaded: true,
          meta: ember$data$lib$system$record$arrays$adapter$populated$record$array$$cloneNull(meta)
        });

        records.forEach(function(record) {
          this.manager.recordArraysForRecord(record).add(this);
        }, this);

        // TODO: should triggering didLoad event be the last action of the runLoop?
        Ember.run.once(this, 'trigger', 'didLoad');
      }
    });

    var ember$data$lib$system$ordered$set$$EmberOrderedSet = Ember.OrderedSet;
    var ember$data$lib$system$ordered$set$$guidFor = Ember.guidFor;

    var ember$data$lib$system$ordered$set$$OrderedSet = function() {
      this._super$constructor();
    };

    ember$data$lib$system$ordered$set$$OrderedSet.create = function() {
      var Constructor = this;
      return new Constructor();
    };

    ember$data$lib$system$ordered$set$$OrderedSet.prototype = Ember.create(ember$data$lib$system$ordered$set$$EmberOrderedSet.prototype);
    ember$data$lib$system$ordered$set$$OrderedSet.prototype.constructor = ember$data$lib$system$ordered$set$$OrderedSet;
    ember$data$lib$system$ordered$set$$OrderedSet.prototype._super$constructor = ember$data$lib$system$ordered$set$$EmberOrderedSet;

    ember$data$lib$system$ordered$set$$OrderedSet.prototype.addWithIndex = function(obj, idx) {
      var guid = ember$data$lib$system$ordered$set$$guidFor(obj);
      var presenceSet = this.presenceSet;
      var list = this.list;

      if (presenceSet[guid] === true) {
        return;
      }

      presenceSet[guid] = true;

      if (idx === undefined || idx == null) {
        list.push(obj);
      } else {
        list.splice(idx, 0, obj);
      }

      this.size += 1;

      return this;
    };

    var ember$data$lib$system$ordered$set$$default = ember$data$lib$system$ordered$set$$OrderedSet;
    var ember$data$lib$system$record$array$manager$$get = Ember.get;
    var ember$data$lib$system$record$array$manager$$forEach = Ember.EnumerableUtils.forEach;
    var ember$data$lib$system$record$array$manager$$indexOf = Ember.EnumerableUtils.indexOf;

    var ember$data$lib$system$record$array$manager$$default = Ember.Object.extend({
      init: function() {
        this.filteredRecordArrays = ember$data$lib$system$map$$MapWithDefault.create({
          defaultValue: function() { return []; }
        });

        this.changedRecords = [];
        this._adapterPopulatedRecordArrays = [];
      },

      recordDidChange: function(record) {
        if (this.changedRecords.push(record) !== 1) { return; }

        Ember.run.schedule('actions', this, this.updateRecordArrays);
      },

      recordArraysForRecord: function(record) {
        record._recordArrays = record._recordArrays || ember$data$lib$system$ordered$set$$default.create();
        return record._recordArrays;
      },

      /**
        This method is invoked whenever data is loaded into the store by the
        adapter or updated by the adapter, or when a record has changed.

        It updates all record arrays that a record belongs to.

        To avoid thrashing, it only runs at most once per run loop.

        @method updateRecordArrays
      */
      updateRecordArrays: function() {
        ember$data$lib$system$record$array$manager$$forEach(this.changedRecords, function(record) {
          if (ember$data$lib$system$record$array$manager$$get(record, 'isDeleted')) {
            this._recordWasDeleted(record);
          } else {
            this._recordWasChanged(record);
          }
        }, this);

        this.changedRecords.length = 0;
      },

      _recordWasDeleted: function (record) {
        var recordArrays = record._recordArrays;

        if (!recordArrays) { return; }

        recordArrays.forEach(function(array) {
          array.removeRecord(record);
        });

        record._recordArrays = null;
      },


      //Don't need to update non filtered arrays on simple changes
      _recordWasChanged: function (record) {
        var typeClass = record.constructor;
        var recordArrays = this.filteredRecordArrays.get(typeClass);
        var filter;

        ember$data$lib$system$record$array$manager$$forEach(recordArrays, function(array) {
          filter = ember$data$lib$system$record$array$manager$$get(array, 'filterFunction');
          if (filter) {
            this.updateRecordArray(array, filter, typeClass, record);
          }
        }, this);
      },

      //Need to update live arrays on loading
      recordWasLoaded: function(record) {
        var typeClass = record.constructor;
        var recordArrays = this.filteredRecordArrays.get(typeClass);
        var filter;

        ember$data$lib$system$record$array$manager$$forEach(recordArrays, function(array) {
          filter = ember$data$lib$system$record$array$manager$$get(array, 'filterFunction');
          this.updateRecordArray(array, filter, typeClass, record);
        }, this);
      },
      /**
        Update an individual filter.

        @method updateRecordArray
        @param {DS.FilteredRecordArray} array
        @param {Function} filter
        @param {subclass of DS.Model} typeClass
        @param {Number|String} clientId
      */
      updateRecordArray: function(array, filter, typeClass, record) {
        var shouldBeInArray;

        if (!filter) {
          shouldBeInArray = true;
        } else {
          shouldBeInArray = filter(record);
        }

        var recordArrays = this.recordArraysForRecord(record);

        if (shouldBeInArray) {
          if (!recordArrays.has(array)) {
            array._pushRecord(record);
            recordArrays.add(array);
          }
        } else if (!shouldBeInArray) {
          recordArrays["delete"](array);
          array.removeRecord(record);
        }
      },

      /**
        This method is invoked if the `filterFunction` property is
        changed on a `DS.FilteredRecordArray`.

        It essentially re-runs the filter from scratch. This same
        method is invoked when the filter is created in th first place.

        @method updateFilter
        @param {Array} array
        @param {String} typeKey
        @param {Function} filter
      */
      updateFilter: function(array, typeKey, filter) {
        var typeMap = this.store.typeMapFor(typeKey);
        var records = typeMap.records;
        var record;

        for (var i = 0, l = records.length; i < l; i++) {
          record = records[i];

          if (!ember$data$lib$system$record$array$manager$$get(record, 'isDeleted') && !ember$data$lib$system$record$array$manager$$get(record, 'isEmpty')) {
            this.updateRecordArray(array, filter, typeKey, record);
          }
        }
      },

      /**
        Create a `DS.RecordArray` for a type and register it for updates.

        @method createRecordArray
        @param {Class} typeClass
        @return {DS.RecordArray}
      */
      createRecordArray: function(typeClass) {
        var array = ember$data$lib$system$record$arrays$record$array$$default.create({
          type: typeClass,
          content: Ember.A(),
          store: this.store,
          isLoaded: true,
          manager: this
        });

        this.registerFilteredRecordArray(array, typeClass);

        return array;
      },

      /**
        Create a `DS.FilteredRecordArray` for a type and register it for updates.

        @method createFilteredRecordArray
        @param {subclass of DS.Model} typeClass
        @param {Function} filter
        @param {Object} query (optional
        @return {DS.FilteredRecordArray}
      */
      createFilteredRecordArray: function(typeClass, filter, query) {
        var array = ember$data$lib$system$record$arrays$filtered$record$array$$default.create({
          query: query,
          type: typeClass,
          content: Ember.A(),
          store: this.store,
          manager: this,
          filterFunction: filter
        });

        this.registerFilteredRecordArray(array, typeClass, filter);

        return array;
      },

      /**
        Create a `DS.AdapterPopulatedRecordArray` for a type with given query.

        @method createAdapterPopulatedRecordArray
        @param {subclass of DS.Model} typeClass
        @param {Object} query
        @return {DS.AdapterPopulatedRecordArray}
      */
      createAdapterPopulatedRecordArray: function(typeClass, query) {
        var array = ember$data$lib$system$record$arrays$adapter$populated$record$array$$default.create({
          type: typeClass,
          query: query,
          content: Ember.A(),
          store: this.store,
          manager: this
        });

        this._adapterPopulatedRecordArrays.push(array);

        return array;
      },

      /**
        Register a RecordArray for a given type to be backed by
        a filter function. This will cause the array to update
        automatically when records of that type change attribute
        values or states.

        @method registerFilteredRecordArray
        @param {DS.RecordArray} array
        @param {subclass of DS.Model} typeClass
        @param {Function} filter
      */
      registerFilteredRecordArray: function(array, typeClass, filter) {
        var recordArrays = this.filteredRecordArrays.get(typeClass);
        recordArrays.push(array);

        this.updateFilter(array, typeClass, filter);
      },

      /**
        Unregister a FilteredRecordArray.
        So manager will not update this array.

        @method unregisterFilteredRecordArray
        @param {DS.RecordArray} array
      */
      unregisterFilteredRecordArray: function(array) {
        var recordArrays = this.filteredRecordArrays.get(array.type);
        var index = ember$data$lib$system$record$array$manager$$indexOf(recordArrays, array);
        recordArrays.splice(index, 1);
      },

      willDestroy: function() {
        this._super.apply(this, arguments);

        this.filteredRecordArrays.forEach(function(value) {
          ember$data$lib$system$record$array$manager$$forEach(ember$data$lib$system$record$array$manager$$flatten(value), ember$data$lib$system$record$array$manager$$destroy);
        });
        ember$data$lib$system$record$array$manager$$forEach(this._adapterPopulatedRecordArrays, ember$data$lib$system$record$array$manager$$destroy);
      }
    });

    function ember$data$lib$system$record$array$manager$$destroy(entry) {
      entry.destroy();
    }

    function ember$data$lib$system$record$array$manager$$flatten(list) {
      var length = list.length;
      var result = Ember.A();

      for (var i = 0; i < length; i++) {
        result = result.concat(list[i]);
      }

      return result;
    }

    var ember$data$lib$system$model$states$$get = Ember.get;
    var ember$data$lib$system$model$states$$set = Ember.set;
    /*
      This file encapsulates the various states that a record can transition
      through during its lifecycle.
    */
    /**
      ### State

      Each record has a `currentState` property that explicitly tracks what
      state a record is in at any given time. For instance, if a record is
      newly created and has not yet been sent to the adapter to be saved,
      it would be in the `root.loaded.created.uncommitted` state.  If a
      record has had local modifications made to it that are in the
      process of being saved, the record would be in the
      `root.loaded.updated.inFlight` state. (This state paths will be
      explained in more detail below.)

      Events are sent by the record or its store to the record's
      `currentState` property. How the state reacts to these events is
      dependent on which state it is in. In some states, certain events
      will be invalid and will cause an exception to be raised.

      States are hierarchical and every state is a substate of the
      `RootState`. For example, a record can be in the
      `root.deleted.uncommitted` state, then transition into the
      `root.deleted.inFlight` state. If a child state does not implement
      an event handler, the state manager will attempt to invoke the event
      on all parent states until the root state is reached. The state
      hierarchy of a record is described in terms of a path string. You
      can determine a record's current state by getting the state's
      `stateName` property:

      ```javascript
      record.get('currentState.stateName');
      //=> "root.created.uncommitted"
       ```

      The hierarchy of valid states that ship with ember data looks like
      this:

      ```text
      * root
        * deleted
          * saved
          * uncommitted
          * inFlight
        * empty
        * loaded
          * created
            * uncommitted
            * inFlight
          * saved
          * updated
            * uncommitted
            * inFlight
        * loading
      ```

      The `DS.Model` states are themselves stateless. What that means is
      that, the hierarchical states that each of *those* points to is a
      shared data structure. For performance reasons, instead of each
      record getting its own copy of the hierarchy of states, each record
      points to this global, immutable shared instance. How does a state
      know which record it should be acting on? We pass the record
      instance into the state's event handlers as the first argument.

      The record passed as the first parameter is where you should stash
      state about the record if needed; you should never store data on the state
      object itself.

      ### Events and Flags

      A state may implement zero or more events and flags.

      #### Events

      Events are named functions that are invoked when sent to a record. The
      record will first look for a method with the given name on the
      current state. If no method is found, it will search the current
      state's parent, and then its grandparent, and so on until reaching
      the top of the hierarchy. If the root is reached without an event
      handler being found, an exception will be raised. This can be very
      helpful when debugging new features.

      Here's an example implementation of a state with a `myEvent` event handler:

      ```javascript
      aState: DS.State.create({
        myEvent: function(manager, param) {
          console.log("Received myEvent with", param);
        }
      })
      ```

      To trigger this event:

      ```javascript
      record.send('myEvent', 'foo');
      //=> "Received myEvent with foo"
      ```

      Note that an optional parameter can be sent to a record's `send()` method,
      which will be passed as the second parameter to the event handler.

      Events should transition to a different state if appropriate. This can be
      done by calling the record's `transitionTo()` method with a path to the
      desired state. The state manager will attempt to resolve the state path
      relative to the current state. If no state is found at that path, it will
      attempt to resolve it relative to the current state's parent, and then its
      parent, and so on until the root is reached. For example, imagine a hierarchy
      like this:

          * created
            * uncommitted <-- currentState
            * inFlight
          * updated
            * inFlight

      If we are currently in the `uncommitted` state, calling
      `transitionTo('inFlight')` would transition to the `created.inFlight` state,
      while calling `transitionTo('updated.inFlight')` would transition to
      the `updated.inFlight` state.

      Remember that *only events* should ever cause a state transition. You should
      never call `transitionTo()` from outside a state's event handler. If you are
      tempted to do so, create a new event and send that to the state manager.

      #### Flags

      Flags are Boolean values that can be used to introspect a record's current
      state in a more user-friendly way than examining its state path. For example,
      instead of doing this:

      ```javascript
      var statePath = record.get('stateManager.currentPath');
      if (statePath === 'created.inFlight') {
        doSomething();
      }
      ```

      You can say:

      ```javascript
      if (record.get('isNew') && record.get('isSaving')) {
        doSomething();
      }
      ```

      If your state does not set a value for a given flag, the value will
      be inherited from its parent (or the first place in the state hierarchy
      where it is defined).

      The current set of flags are defined below. If you want to add a new flag,
      in addition to the area below, you will also need to declare it in the
      `DS.Model` class.


       * [isEmpty](DS.Model.html#property_isEmpty)
       * [isLoading](DS.Model.html#property_isLoading)
       * [isLoaded](DS.Model.html#property_isLoaded)
       * [isDirty](DS.Model.html#property_isDirty)
       * [isSaving](DS.Model.html#property_isSaving)
       * [isDeleted](DS.Model.html#property_isDeleted)
       * [isNew](DS.Model.html#property_isNew)
       * [isValid](DS.Model.html#property_isValid)

      @namespace DS
      @class RootState
    */

    function ember$data$lib$system$model$states$$didSetProperty(record, context) {
      if (context.value === context.originalValue) {
        delete record._attributes[context.name];
        record.send('propertyWasReset', context.name);
      } else if (context.value !== context.oldValue) {
        record.send('becomeDirty');
      }

      record.updateRecordArraysLater();
    }

    // Implementation notes:
    //
    // Each state has a boolean value for all of the following flags:
    //
    // * isLoaded: The record has a populated `data` property. When a
    //   record is loaded via `store.find`, `isLoaded` is false
    //   until the adapter sets it. When a record is created locally,
    //   its `isLoaded` property is always true.
    // * isDirty: The record has local changes that have not yet been
    //   saved by the adapter. This includes records that have been
    //   created (but not yet saved) or deleted.
    // * isSaving: The record has been committed, but
    //   the adapter has not yet acknowledged that the changes have
    //   been persisted to the backend.
    // * isDeleted: The record was marked for deletion. When `isDeleted`
    //   is true and `isDirty` is true, the record is deleted locally
    //   but the deletion was not yet persisted. When `isSaving` is
    //   true, the change is in-flight. When both `isDirty` and
    //   `isSaving` are false, the change has persisted.
    // * isError: The adapter reported that it was unable to save
    //   local changes to the backend. This may also result in the
    //   record having its `isValid` property become false if the
    //   adapter reported that server-side validations failed.
    // * isNew: The record was created on the client and the adapter
    //   did not yet report that it was successfully saved.
    // * isValid: The adapter did not report any server-side validation
    //   failures.

    // The dirty state is a abstract state whose functionality is
    // shared between the `created` and `updated` states.
    //
    // The deleted state shares the `isDirty` flag with the
    // subclasses of `DirtyState`, but with a very different
    // implementation.
    //
    // Dirty states have three child states:
    //
    // `uncommitted`: the store has not yet handed off the record
    //   to be saved.
    // `inFlight`: the store has handed off the record to be saved,
    //   but the adapter has not yet acknowledged success.
    // `invalid`: the record has invalid information and cannot be
    //   send to the adapter yet.
    var ember$data$lib$system$model$states$$DirtyState = {
      initialState: 'uncommitted',

      // FLAGS
      isDirty: true,

      // SUBSTATES

      // When a record first becomes dirty, it is `uncommitted`.
      // This means that there are local pending changes, but they
      // have not yet begun to be saved, and are not invalid.
      uncommitted: {
        // EVENTS
        didSetProperty: ember$data$lib$system$model$states$$didSetProperty,

        //TODO(Igor) reloading now triggers a
        //loadingData event, though it seems fine?
        loadingData: Ember.K,

        propertyWasReset: function(record, name) {
          var length = Ember.keys(record._attributes).length;
          var stillDirty = length > 0;

          if (!stillDirty) { record.send('rolledBack'); }
        },

        pushedData: Ember.K,

        becomeDirty: Ember.K,

        willCommit: function(record) {
          record.transitionTo('inFlight');
        },

        reloadRecord: function(record, resolve) {
          resolve(ember$data$lib$system$model$states$$get(record, 'store').reloadRecord(record));
        },

        rolledBack: function(record) {
          record.transitionTo('loaded.saved');
        },

        becameInvalid: function(record) {
          record.transitionTo('invalid');
        },

        rollback: function(record) {
          record.rollback();
          record.triggerLater('ready');
        }
      },

      // Once a record has been handed off to the adapter to be
      // saved, it is in the 'in flight' state. Changes to the
      // record cannot be made during this window.
      inFlight: {
        // FLAGS
        isSaving: true,

        // EVENTS
        didSetProperty: ember$data$lib$system$model$states$$didSetProperty,
        becomeDirty: Ember.K,
        pushedData: Ember.K,

        unloadRecord: function(record) {
          Ember.assert("You can only unload a record which is not inFlight. `" + Ember.inspect(record) + " `", false);
        },

        // TODO: More robust semantics around save-while-in-flight
        willCommit: Ember.K,

        didCommit: function(record) {
          var dirtyType = ember$data$lib$system$model$states$$get(this, 'dirtyType');

          record.transitionTo('saved');
          record.send('invokeLifecycleCallbacks', dirtyType);
        },

        becameInvalid: function(record) {
          record.transitionTo('invalid');
          record.send('invokeLifecycleCallbacks');
        },

        becameError: function(record) {
          record.transitionTo('uncommitted');
          record.triggerLater('becameError', record);
        }
      },

      // A record is in the `invalid` if the adapter has indicated
      // the the record failed server-side invalidations.
      invalid: {
        // FLAGS
        isValid: false,

        // EVENTS
        deleteRecord: function(record) {
          record.transitionTo('deleted.uncommitted');
          record.disconnectRelationships();
        },

        didSetProperty: function(record, context) {
          ember$data$lib$system$model$states$$get(record, 'errors').remove(context.name);

          ember$data$lib$system$model$states$$didSetProperty(record, context);
        },

        becomeDirty: Ember.K,

        willCommit: function(record) {
          ember$data$lib$system$model$states$$get(record, 'errors').clear();
          record.transitionTo('inFlight');
        },

        rolledBack: function(record) {
          ember$data$lib$system$model$states$$get(record, 'errors').clear();
          record.triggerLater('ready');
        },

        becameValid: function(record) {
          record.transitionTo('uncommitted');
        },

        invokeLifecycleCallbacks: function(record) {
          record.triggerLater('becameInvalid', record);
        },

        exit: function(record) {
          record._inFlightAttributes = {};
        }
      }
    };

    // The created and updated states are created outside the state
    // chart so we can reopen their substates and add mixins as
    // necessary.

    function ember$data$lib$system$model$states$$deepClone(object) {
      var clone = {};
      var value;

      for (var prop in object) {
        value = object[prop];
        if (value && typeof value === 'object') {
          clone[prop] = ember$data$lib$system$model$states$$deepClone(value);
        } else {
          clone[prop] = value;
        }
      }

      return clone;
    }

    function ember$data$lib$system$model$states$$mixin(original, hash) {
      for (var prop in hash) {
        original[prop] = hash[prop];
      }

      return original;
    }

    function ember$data$lib$system$model$states$$dirtyState(options) {
      var newState = ember$data$lib$system$model$states$$deepClone(ember$data$lib$system$model$states$$DirtyState);
      return ember$data$lib$system$model$states$$mixin(newState, options);
    }

    var ember$data$lib$system$model$states$$createdState = ember$data$lib$system$model$states$$dirtyState({
      dirtyType: 'created',
      // FLAGS
      isNew: true
    });

    ember$data$lib$system$model$states$$createdState.uncommitted.rolledBack = function(record) {
      record.transitionTo('deleted.saved');
    };

    var ember$data$lib$system$model$states$$updatedState = ember$data$lib$system$model$states$$dirtyState({
      dirtyType: 'updated'
    });

    ember$data$lib$system$model$states$$createdState.uncommitted.deleteRecord = function(record) {
      record.disconnectRelationships();
      record.transitionTo('deleted.saved');
      record.send('invokeLifecycleCallbacks');
    };

    ember$data$lib$system$model$states$$createdState.uncommitted.rollback = function(record) {
      ember$data$lib$system$model$states$$DirtyState.uncommitted.rollback.apply(this, arguments);
      record.transitionTo('deleted.saved');
    };

    ember$data$lib$system$model$states$$createdState.uncommitted.pushedData = function(record) {
      record.transitionTo('loaded.updated.uncommitted');
      record.triggerLater('didLoad');
    };

    ember$data$lib$system$model$states$$createdState.uncommitted.propertyWasReset = Ember.K;

    function ember$data$lib$system$model$states$$assertAgainstUnloadRecord(record) {
      Ember.assert("You can only unload a record which is not inFlight. `" + Ember.inspect(record) + "`", false);
    }

    ember$data$lib$system$model$states$$updatedState.inFlight.unloadRecord = ember$data$lib$system$model$states$$assertAgainstUnloadRecord;

    ember$data$lib$system$model$states$$updatedState.uncommitted.deleteRecord = function(record) {
      record.transitionTo('deleted.uncommitted');
      record.disconnectRelationships();
    };

    var ember$data$lib$system$model$states$$RootState = {
      // FLAGS
      isEmpty: false,
      isLoading: false,
      isLoaded: false,
      isDirty: false,
      isSaving: false,
      isDeleted: false,
      isNew: false,
      isValid: true,

      // DEFAULT EVENTS

      // Trying to roll back if you're not in the dirty state
      // doesn't change your state. For example, if you're in the
      // in-flight state, rolling back the record doesn't move
      // you out of the in-flight state.
      rolledBack: Ember.K,
      unloadRecord: function(record) {
        // clear relationships before moving to deleted state
        // otherwise it fails
        record.clearRelationships();
        record.transitionTo('deleted.saved');
      },


      propertyWasReset: Ember.K,

      // SUBSTATES

      // A record begins its lifecycle in the `empty` state.
      // If its data will come from the adapter, it will
      // transition into the `loading` state. Otherwise, if
      // the record is being created on the client, it will
      // transition into the `created` state.
      empty: {
        isEmpty: true,

        // EVENTS
        loadingData: function(record, promise) {
          record._loadingPromise = promise;
          record.transitionTo('loading');
        },

        loadedData: function(record) {
          record.transitionTo('loaded.created.uncommitted');
          record.triggerLater('ready');
        },

        pushedData: function(record) {
          record.transitionTo('loaded.saved');
          record.triggerLater('didLoad');
          record.triggerLater('ready');
        }
      },

      // A record enters this state when the store asks
      // the adapter for its data. It remains in this state
      // until the adapter provides the requested data.
      //
      // Usually, this process is asynchronous, using an
      // XHR to retrieve the data.
      loading: {
        // FLAGS
        isLoading: true,

        exit: function(record) {
          record._loadingPromise = null;
        },

        // EVENTS
        pushedData: function(record) {
          record.transitionTo('loaded.saved');
          record.triggerLater('didLoad');
          record.triggerLater('ready');
          ember$data$lib$system$model$states$$set(record, 'isError', false);
        },

        becameError: function(record) {
          record.triggerLater('becameError', record);
        },

        notFound: function(record) {
          record.transitionTo('empty');
        }
      },

      // A record enters this state when its data is populated.
      // Most of a record's lifecycle is spent inside substates
      // of the `loaded` state.
      loaded: {
        initialState: 'saved',

        // FLAGS
        isLoaded: true,

        //TODO(Igor) Reloading now triggers a loadingData event,
        //but it should be ok?
        loadingData: Ember.K,

        // SUBSTATES

        // If there are no local changes to a record, it remains
        // in the `saved` state.
        saved: {
          setup: function(record) {
            var attrs = record._attributes;
            var isDirty = Ember.keys(attrs).length > 0;

            if (isDirty) {
              record.adapterDidDirty();
            }
          },

          // EVENTS
          didSetProperty: ember$data$lib$system$model$states$$didSetProperty,

          pushedData: Ember.K,

          becomeDirty: function(record) {
            record.transitionTo('updated.uncommitted');
          },

          willCommit: function(record) {
            record.transitionTo('updated.inFlight');
          },

          reloadRecord: function(record, resolve) {
            resolve(ember$data$lib$system$model$states$$get(record, 'store').reloadRecord(record));
          },

          deleteRecord: function(record) {
            record.transitionTo('deleted.uncommitted');
            record.disconnectRelationships();
          },

          unloadRecord: function(record) {
            // clear relationships before moving to deleted state
            // otherwise it fails
            record.clearRelationships();
            record.transitionTo('deleted.saved');
          },

          didCommit: function(record) {
            record.send('invokeLifecycleCallbacks', ember$data$lib$system$model$states$$get(record, 'lastDirtyType'));
          },

          // loaded.saved.notFound would be triggered by a failed
          // `reload()` on an unchanged record
          notFound: Ember.K

        },

        // A record is in this state after it has been locally
        // created but before the adapter has indicated that
        // it has been saved.
        created: ember$data$lib$system$model$states$$createdState,

        // A record is in this state if it has already been
        // saved to the server, but there are new local changes
        // that have not yet been saved.
        updated: ember$data$lib$system$model$states$$updatedState
      },

      // A record is in this state if it was deleted from the store.
      deleted: {
        initialState: 'uncommitted',
        dirtyType: 'deleted',

        // FLAGS
        isDeleted: true,
        isLoaded: true,
        isDirty: true,

        // TRANSITIONS
        setup: function(record) {
          record.updateRecordArrays();
        },

        // SUBSTATES

        // When a record is deleted, it enters the `start`
        // state. It will exit this state when the record
        // starts to commit.
        uncommitted: {

          // EVENTS

          willCommit: function(record) {
            record.transitionTo('inFlight');
          },

          rollback: function(record) {
            record.rollback();
            record.triggerLater('ready');
          },

          becomeDirty: Ember.K,
          deleteRecord: Ember.K,

          rolledBack: function(record) {
            record.transitionTo('loaded.saved');
            record.triggerLater('ready');
          }
        },

        // After a record starts committing, but
        // before the adapter indicates that the deletion
        // has saved to the server, a record is in the
        // `inFlight` substate of `deleted`.
        inFlight: {
          // FLAGS
          isSaving: true,

          // EVENTS

          unloadRecord: ember$data$lib$system$model$states$$assertAgainstUnloadRecord,

          // TODO: More robust semantics around save-while-in-flight
          willCommit: Ember.K,
          didCommit: function(record) {
            record.transitionTo('saved');

            record.send('invokeLifecycleCallbacks');
          },

          becameError: function(record) {
            record.transitionTo('uncommitted');
            record.triggerLater('becameError', record);
          },

          becameInvalid: function(record) {
            record.transitionTo('invalid');
            record.triggerLater('becameInvalid', record);
          }
        },

        // Once the adapter indicates that the deletion has
        // been saved, the record enters the `saved` substate
        // of `deleted`.
        saved: {
          // FLAGS
          isDirty: false,

          setup: function(record) {
            var store = ember$data$lib$system$model$states$$get(record, 'store');
            store._dematerializeRecord(record);
          },

          invokeLifecycleCallbacks: function(record) {
            record.triggerLater('didDelete', record);
            record.triggerLater('didCommit', record);
          },

          willCommit: Ember.K,

          didCommit: Ember.K
        },

        invalid: {
          isValid: false,

          didSetProperty: function(record, context) {
            ember$data$lib$system$model$states$$get(record, 'errors').remove(context.name);

            ember$data$lib$system$model$states$$didSetProperty(record, context);
          },

          deleteRecord: Ember.K,
          becomeDirty: Ember.K,
          willCommit: Ember.K,


          rolledBack: function(record) {
            ember$data$lib$system$model$states$$get(record, 'errors').clear();
            record.transitionTo('loaded.saved');
            record.triggerLater('ready');
          },

          becameValid: function(record) {
            record.transitionTo('uncommitted');
          }

        }
      },

      invokeLifecycleCallbacks: function(record, dirtyType) {
        if (dirtyType === 'created') {
          record.triggerLater('didCreate', record);
        } else {
          record.triggerLater('didUpdate', record);
        }

        record.triggerLater('didCommit', record);
      }
    };

    function ember$data$lib$system$model$states$$wireState(object, parent, name) {
      /*jshint proto:true*/
      // TODO: Use Object.create and copy instead
      object = ember$data$lib$system$model$states$$mixin(parent ? Ember.create(parent) : {}, object);
      object.parentState = parent;
      object.stateName = name;

      for (var prop in object) {
        if (!object.hasOwnProperty(prop) || prop === 'parentState' || prop === 'stateName') { continue; }
        if (typeof object[prop] === 'object') {
          object[prop] = ember$data$lib$system$model$states$$wireState(object[prop], object, name + "." + prop);
        }
      }

      return object;
    }

    ember$data$lib$system$model$states$$RootState = ember$data$lib$system$model$states$$wireState(ember$data$lib$system$model$states$$RootState, null, "root");

    var ember$data$lib$system$model$states$$default = ember$data$lib$system$model$states$$RootState;
    var ember$data$lib$system$model$errors$$get = Ember.get;
    var ember$data$lib$system$model$errors$$isEmpty = Ember.isEmpty;
    var ember$data$lib$system$model$errors$$map = Ember.EnumerableUtils.map;

    var ember$data$lib$system$model$errors$$default = Ember.Object.extend(Ember.Enumerable, Ember.Evented, {
      /**
        Register with target handler

        @method registerHandlers
        @param {Object} target
        @param {Function} becameInvalid
        @param {Function} becameValid
      */
      registerHandlers: function(target, becameInvalid, becameValid) {
        this.on('becameInvalid', target, becameInvalid);
        this.on('becameValid', target, becameValid);
      },

      /**
        @property errorsByAttributeName
        @type {Ember.MapWithDefault}
        @private
      */
      errorsByAttributeName: Ember.reduceComputed("content", {
        initialValue: function() {
          return ember$data$lib$system$map$$MapWithDefault.create({
            defaultValue: function() {
              return Ember.A();
            }
          });
        },

        addedItem: function(errors, error) {
          errors.get(error.attribute).pushObject(error);

          return errors;
        },

        removedItem: function(errors, error) {
          errors.get(error.attribute).removeObject(error);

          return errors;
        }
      }),

      /**
        Returns errors for a given attribute

        ```javascript
        var user = store.createRecord('user', {
          username: 'tomster',
          email: 'invalidEmail'
        });
        user.save().catch(function(){
          user.get('errors').errorsFor('email'); // returns:
          // [{attribute: "email", message: "Doesn't look like a valid email."}]
        });
        ```

        @method errorsFor
        @param {String} attribute
        @return {Array}
      */
      errorsFor: function(attribute) {
        return ember$data$lib$system$model$errors$$get(this, 'errorsByAttributeName').get(attribute);
      },

      /**
        An array containing all of the error messages for this
        record. This is useful for displaying all errors to the user.

        ```handlebars
        {{#each model.errors.messages as |message|}}
          <div class="error">
            {{message}}
          </div>
        {{/each}}
        ```

        @property messages
        @type {Array}
      */
      messages: Ember.computed.mapBy('content', 'message'),

      /**
        @property content
        @type {Array}
        @private
      */
      content: Ember.computed(function() {
        return Ember.A();
      }),

      /**
        @method unknownProperty
        @private
      */
      unknownProperty: function(attribute) {
        var errors = this.errorsFor(attribute);
        if (ember$data$lib$system$model$errors$$isEmpty(errors)) { return null; }
        return errors;
      },

      /**
        @method nextObject
        @private
      */
      nextObject: function(index, previousObject, context) {
        return ember$data$lib$system$model$errors$$get(this, 'content').objectAt(index);
      },

      /**
        Total number of errors.

        @property length
        @type {Number}
        @readOnly
      */
      length: Ember.computed.oneWay('content.length').readOnly(),

      /**
        @property isEmpty
        @type {Boolean}
        @readOnly
      */
      isEmpty: Ember.computed.not('length').readOnly(),

      /**
        Adds error messages to a given attribute and sends
        `becameInvalid` event to the record.

        Example:

        ```javascript
        if (!user.get('username') {
          user.get('errors').add('username', 'This field is required');
        }
        ```

        @method add
        @param {String} attribute
        @param {Array|String} messages
      */
      add: function(attribute, messages) {
        var wasEmpty = ember$data$lib$system$model$errors$$get(this, 'isEmpty');

        messages = this._findOrCreateMessages(attribute, messages);
        ember$data$lib$system$model$errors$$get(this, 'content').addObjects(messages);

        this.notifyPropertyChange(attribute);
        this.enumerableContentDidChange();

        if (wasEmpty && !ember$data$lib$system$model$errors$$get(this, 'isEmpty')) {
          this.trigger('becameInvalid');
        }
      },

      /**
        @method _findOrCreateMessages
        @private
      */
      _findOrCreateMessages: function(attribute, messages) {
        var errors = this.errorsFor(attribute);

        return ember$data$lib$system$model$errors$$map(Ember.makeArray(messages), function(message) {
          return errors.findBy('message', message) || {
            attribute: attribute,
            message: message
          };
        });
      },

      /**
        Removes all error messages from the given attribute and sends
        `becameValid` event to the record if there no more errors left.

        Example:

        ```javascript
        App.User = DS.Model.extend({
          email: DS.attr('string'),
          twoFactorAuth: DS.attr('boolean'),
          phone: DS.attr('string')
        });

        App.UserEditRoute = Ember.Route.extend({
          actions: {
            save: function(user) {
               if (!user.get('twoFactorAuth')) {
                 user.get('errors').remove('phone');
               }
               user.save();
             }
          }
        });
        ```

        @method remove
        @param {String} attribute
      */
      remove: function(attribute) {
        if (ember$data$lib$system$model$errors$$get(this, 'isEmpty')) { return; }

        var content = ember$data$lib$system$model$errors$$get(this, 'content').rejectBy('attribute', attribute);
        ember$data$lib$system$model$errors$$get(this, 'content').setObjects(content);

        this.notifyPropertyChange(attribute);
        this.enumerableContentDidChange();

        if (ember$data$lib$system$model$errors$$get(this, 'isEmpty')) {
          this.trigger('becameValid');
        }
      },

      /**
        Removes all error messages and sends `becameValid` event
        to the record.

        Example:

        ```javascript
        App.UserEditRoute = Ember.Route.extend({
          actions: {
            retrySave: function(user) {
               user.get('errors').clear();
               user.save();
             }
          }
        });
        ```

        @method clear
      */
      clear: function() {
        if (ember$data$lib$system$model$errors$$get(this, 'isEmpty')) { return; }

        ember$data$lib$system$model$errors$$get(this, 'content').clear();
        this.enumerableContentDidChange();

        this.trigger('becameValid');
      },

      /**
        Checks if there is error messages for the given attribute.

        ```javascript
        App.UserEditRoute = Ember.Route.extend({
          actions: {
            save: function(user) {
               if (user.get('errors').has('email')) {
                 return alert('Please update your email before attempting to save.');
               }
               user.save();
             }
          }
        });
        ```

        @method has
        @param {String} attribute
        @return {Boolean} true if there some errors on given attribute
      */
      has: function(attribute) {
        return !ember$data$lib$system$model$errors$$isEmpty(this.errorsFor(attribute));
      }
    });

    function ember$data$lib$system$merge$$merge(original, updates) {
      if (!updates || typeof updates !== 'object') {
        return original;
      }

      var props = Ember.keys(updates);
      var prop;
      var length = props.length;

      for (var i = 0; i < length; i++) {
        prop = props[i];
        original[prop] = updates[prop];
      }

      return original;
    }

    var ember$data$lib$system$merge$$default = ember$data$lib$system$merge$$merge;

    var ember$data$lib$system$relationships$state$relationship$$forEach = Ember.EnumerableUtils.forEach;

    var ember$data$lib$system$relationships$state$relationship$$Relationship = function(store, record, inverseKey, relationshipMeta) {
      this.members = new ember$data$lib$system$ordered$set$$default();
      this.canonicalMembers = new ember$data$lib$system$ordered$set$$default();
      this.store = store;
      this.key = relationshipMeta.key;
      this.inverseKey = inverseKey;
      this.record = record;
      this.isAsync = relationshipMeta.options.async;
      this.relationshipMeta = relationshipMeta;
      //This probably breaks for polymorphic relationship in complex scenarios, due to
      //multiple possible typeKeys
      this.inverseKeyForImplicit = this.store.modelFor(this.record.constructor).typeKey + this.key;
      this.linkPromise = null;
      this.hasData = false;
    };

    ember$data$lib$system$relationships$state$relationship$$Relationship.prototype = {
      constructor: ember$data$lib$system$relationships$state$relationship$$Relationship,

      destroy: Ember.K,

      clear: function() {
        var members = this.members.list;
        var member;

        while (members.length > 0) {
          member = members[0];
          this.removeRecord(member);
        }
      },

      disconnect: function() {
        this.members.forEach(function(member) {
          this.removeRecordFromInverse(member);
        }, this);
      },

      reconnect: function() {
        this.members.forEach(function(member) {
          this.addRecordToInverse(member);
        }, this);
      },

      removeRecords: function(records) {
        var self = this;
        ember$data$lib$system$relationships$state$relationship$$forEach(records, function(record) {
          self.removeRecord(record);
        });
      },

      addRecords: function(records, idx) {
        var self = this;
        ember$data$lib$system$relationships$state$relationship$$forEach(records, function(record) {
          self.addRecord(record, idx);
          if (idx !== undefined) {
            idx++;
          }
        });
      },

      addCanonicalRecords: function(records, idx) {
        for (var i=0; i<records.length; i++) {
          if (idx !== undefined) {
            this.addCanonicalRecord(records[i], i+idx);
          } else {
            this.addCanonicalRecord(records[i]);
          }
        }
      },

      addCanonicalRecord: function(record, idx) {
        if (!this.canonicalMembers.has(record)) {
          this.canonicalMembers.add(record);
          if (this.inverseKey) {
            record._relationships[this.inverseKey].addCanonicalRecord(this.record);
          } else {
            if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
              record._implicitRelationships[this.inverseKeyForImplicit] = new ember$data$lib$system$relationships$state$relationship$$Relationship(this.store, record, this.key,  { options: {} });
            }
            record._implicitRelationships[this.inverseKeyForImplicit].addCanonicalRecord(this.record);
          }
        }
        this.flushCanonicalLater();
        this.setHasData(true);
      },

      removeCanonicalRecords: function(records, idx) {
        for (var i=0; i<records.length; i++) {
          if (idx !== undefined) {
            this.removeCanonicalRecord(records[i], i+idx);
          } else {
            this.removeCanonicalRecord(records[i]);
          }
        }
      },

      removeCanonicalRecord: function(record, idx) {
        if (this.canonicalMembers.has(record)) {
          this.removeCanonicalRecordFromOwn(record);
          if (this.inverseKey) {
            this.removeCanonicalRecordFromInverse(record);
          } else {
            if (record._implicitRelationships[this.inverseKeyForImplicit]) {
              record._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalRecord(this.record);
            }
          }
        }
        this.flushCanonicalLater();
      },

      addRecord: function(record, idx) {
        if (!this.members.has(record)) {
          this.members.addWithIndex(record, idx);
          this.notifyRecordRelationshipAdded(record, idx);
          if (this.inverseKey) {
            record._relationships[this.inverseKey].addRecord(this.record);
          } else {
            if (!record._implicitRelationships[this.inverseKeyForImplicit]) {
              record._implicitRelationships[this.inverseKeyForImplicit] = new ember$data$lib$system$relationships$state$relationship$$Relationship(this.store, record, this.key,  { options: {} });
            }
            record._implicitRelationships[this.inverseKeyForImplicit].addRecord(this.record);
          }
          this.record.updateRecordArraysLater();
        }
        this.setHasData(true);
      },

      removeRecord: function(record) {
        if (this.members.has(record)) {
          this.removeRecordFromOwn(record);
          if (this.inverseKey) {
            this.removeRecordFromInverse(record);
          } else {
            if (record._implicitRelationships[this.inverseKeyForImplicit]) {
              record._implicitRelationships[this.inverseKeyForImplicit].removeRecord(this.record);
            }
          }
        }
      },

      addRecordToInverse: function(record) {
        if (this.inverseKey) {
          record._relationships[this.inverseKey].addRecord(this.record);
        }
      },

      removeRecordFromInverse: function(record) {
        var inverseRelationship = record._relationships[this.inverseKey];
        //Need to check for existence, as the record might unloading at the moment
        if (inverseRelationship) {
          inverseRelationship.removeRecordFromOwn(this.record);
        }
      },

      removeRecordFromOwn: function(record) {
        this.members["delete"](record);
        this.notifyRecordRelationshipRemoved(record);
        this.record.updateRecordArrays();
      },

      removeCanonicalRecordFromInverse: function(record) {
        var inverseRelationship = record._relationships[this.inverseKey];
        //Need to check for existence, as the record might unloading at the moment
        if (inverseRelationship) {
          inverseRelationship.removeCanonicalRecordFromOwn(this.record);
        }
      },

      removeCanonicalRecordFromOwn: function(record) {
        this.canonicalMembers["delete"](record);
        this.flushCanonicalLater();
      },

      flushCanonical: function() {
        this.willSync = false;
        //a hack for not removing new records
        //TODO remove once we have proper diffing
        var newRecords = [];
        for (var i=0; i<this.members.list.length; i++) {
          if (this.members.list[i].get('isNew')) {
            newRecords.push(this.members.list[i]);
          }
        }
        //TODO(Igor) make this less abysmally slow
        this.members = this.canonicalMembers.copy();
        for (i=0; i<newRecords.length; i++) {
          this.members.add(newRecords[i]);
        }
      },

      flushCanonicalLater: function() {
        if (this.willSync) {
          return;
        }
        this.willSync = true;
        var self = this;
        this.store._backburner.join(function() {
          self.store._backburner.schedule('syncRelationships', self, self.flushCanonical);
        });
      },

      updateLink: function(link) {
        Ember.warn("You have pushed a record of type '" + this.record.constructor.typeKey + "' with '" + this.key + "' as a link, but the association is not an async relationship.", this.isAsync);
        Ember.assert("You have pushed a record of type '" + this.record.constructor.typeKey + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);
        if (link !== this.link) {
          this.link = link;
          this.linkPromise = null;
          this.record.notifyPropertyChange(this.key);
        }
      },

      findLink: function() {
        if (this.linkPromise) {
          return this.linkPromise;
        } else {
          var promise = this.fetchLink();
          this.linkPromise = promise;
          return promise.then(function(result) {
            return result;
          });
        }
      },

      updateRecordsFromAdapter: function(records) {
        //TODO(Igor) move this to a proper place
        var self = this;
        //TODO Once we have adapter support, we need to handle updated and canonical changes
        self.computeChanges(records);
        self.setHasData(true);
      },

      notifyRecordRelationshipAdded: Ember.K,
      notifyRecordRelationshipRemoved: Ember.K,

      setHasData: function(value) {
        this.hasData = value;
      }
    };




    var ember$data$lib$system$relationships$state$relationship$$default = ember$data$lib$system$relationships$state$relationship$$Relationship;

    var ember$data$lib$system$many$array$$get = Ember.get;
    var ember$data$lib$system$many$array$$set = Ember.set;
    var ember$data$lib$system$many$array$$filter = Ember.ArrayPolyfills.filter;

    var ember$data$lib$system$many$array$$default = Ember.Object.extend(Ember.MutableArray, Ember.Evented, {
      init: function() {
        this.currentState = Ember.A([]);
      },

      record: null,

      canonicalState: null,
      currentState: null,

      length: 0,

      objectAt: function(index) {
        return this.currentState[index];
      },

      flushCanonical: function() {
        //TODO make this smarter, currently its plenty stupid
        var toSet = ember$data$lib$system$many$array$$filter.call(this.canonicalState, function(record) {
          return !record.get('isDeleted');
        });

        //a hack for not removing new records
        //TODO remove once we have proper diffing
        var newRecords = this.currentState.filter(function(record) {
          return record.get('isNew');
        });
        toSet = toSet.concat(newRecords);
        var oldLength = this.length;
        this.arrayContentWillChange(0, this.length, toSet.length);
        this.set('length', toSet.length);
        this.currentState = toSet;
        this.arrayContentDidChange(0, oldLength, this.length);
        //TODO Figure out to notify only on additions and maybe only if unloaded
        this.relationship.notifyHasManyChanged();
        this.record.updateRecordArrays();
      },
      /**
        `true` if the relationship is polymorphic, `false` otherwise.

        @property {Boolean} isPolymorphic
        @private
      */
      isPolymorphic: false,

      /**
        The loading state of this array

        @property {Boolean} isLoaded
      */
      isLoaded: false,

      /**
        The relationship which manages this array.

        @property {ManyRelationship} relationship
        @private
      */
      relationship: null,

      internalReplace: function(idx, amt, objects) {
        if (!objects) {
          objects = [];
        }
        this.arrayContentWillChange(idx, amt, objects.length);
        this.currentState.splice.apply(this.currentState, [idx, amt].concat(objects));
        this.set('length', this.currentState.length);
        this.arrayContentDidChange(idx, amt, objects.length);
        if (objects) {
          //TODO(Igor) probably needed only for unloaded records
          this.relationship.notifyHasManyChanged();
        }
        this.record.updateRecordArrays();
      },

      //TODO(Igor) optimize
      internalRemoveRecords: function(records) {
        var index;
        for (var i=0; i < records.length; i++) {
          index = this.currentState.indexOf(records[i]);
          this.internalReplace(index, 1);
        }
      },

      //TODO(Igor) optimize
      internalAddRecords: function(records, idx) {
        if (idx === undefined) {
          idx = this.currentState.length;
        }
        this.internalReplace(idx, 0, records);
      },

      replace: function(idx, amt, objects) {
        var records;
        if (amt > 0) {
          records = this.currentState.slice(idx, idx+amt);
          this.get('relationship').removeRecords(records);
        }
        if (objects) {
          this.get('relationship').addRecords(objects, idx);
        }
      },
      /**
        Used for async `hasMany` arrays
        to keep track of when they will resolve.

        @property {Ember.RSVP.Promise} promise
        @private
      */
      promise: null,

      /**
        @method loadingRecordsCount
        @param {Number} count
        @private
      */
      loadingRecordsCount: function(count) {
        this.loadingRecordsCount = count;
      },

      /**
        @method loadedRecord
        @private
      */
      loadedRecord: function() {
        this.loadingRecordsCount--;
        if (this.loadingRecordsCount === 0) {
          ember$data$lib$system$many$array$$set(this, 'isLoaded', true);
          this.trigger('didLoad');
        }
      },

      /**
        @method reload
        @public
      */
      reload: function() {
        return this.relationship.reload();
      },

      /**
        Saves all of the records in the `ManyArray`.

        Example

        ```javascript
        store.find('inbox', 1).then(function(inbox) {
          inbox.get('messages').then(function(messages) {
            messages.forEach(function(message) {
              message.set('isRead', true);
            });
            messages.save()
          });
        });
        ```

        @method save
        @return {DS.PromiseArray} promise
      */
      save: function() {
        var manyArray = this;
        var promiseLabel = "DS: ManyArray#save " + ember$data$lib$system$many$array$$get(this, 'type');
        var promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).then(function(array) {
          return manyArray;
        }, null, "DS: ManyArray#save return ManyArray");

        return ember$data$lib$system$promise$proxies$$PromiseArray.create({ promise: promise });
      },

      /**
        Create a child record within the owner

        @method createRecord
        @private
        @param {Object} hash
        @return {DS.Model} record
      */
      createRecord: function(hash) {
        var store = ember$data$lib$system$many$array$$get(this, 'store');
        var type = ember$data$lib$system$many$array$$get(this, 'type');
        var record;

        Ember.assert("You cannot add '" + type.typeKey + "' records to this polymorphic relationship.", !ember$data$lib$system$many$array$$get(this, 'isPolymorphic'));

        record = store.createRecord(type, hash);
        this.pushObject(record);

        return record;
      },

      /**
        @method addRecord
        @param {DS.Model} record
        @deprecated Use `addObject()` instead
      */
      addRecord: function(record) {
        Ember.deprecate('Using manyArray.addRecord() has been deprecated. You should use manyArray.addObject() instead.');
        this.addObject(record);
      },

      /**
        @method removeRecord
        @param {DS.Model} record
        @deprecated Use `removeObject()` instead
      */
      removeRecord: function(record) {
        Ember.deprecate('Using manyArray.removeRecord() has been deprecated. You should use manyArray.removeObject() instead.');
        this.removeObject(record);
      }
    });

    var ember$data$lib$system$relationships$state$has$many$$ManyRelationship = function(store, record, inverseKey, relationshipMeta) {
      this._super$constructor(store, record, inverseKey, relationshipMeta);
      this.belongsToType = relationshipMeta.type;
      this.canonicalState = [];
      this.manyArray = ember$data$lib$system$many$array$$default.create({
        canonicalState: this.canonicalState,
        store: this.store,
        relationship: this,
        type: this.belongsToType,
        record: record
      });
      this.isPolymorphic = relationshipMeta.options.polymorphic;
      this.manyArray.isPolymorphic = this.isPolymorphic;
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype = Ember.create(ember$data$lib$system$relationships$state$relationship$$default.prototype);
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.constructor = ember$data$lib$system$relationships$state$has$many$$ManyRelationship;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$constructor = ember$data$lib$system$relationships$state$relationship$$default;

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.destroy = function() {
      this.manyArray.destroy();
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$addCanonicalRecord = ember$data$lib$system$relationships$state$relationship$$default.prototype.addCanonicalRecord;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.addCanonicalRecord = function(record, idx) {
      if (this.canonicalMembers.has(record)) {
        return;
      }
      if (idx !== undefined) {
        this.canonicalState.splice(idx, 0, record);
      } else {
        this.canonicalState.push(record);
      }
      this._super$addCanonicalRecord(record, idx);
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$addRecord = ember$data$lib$system$relationships$state$relationship$$default.prototype.addRecord;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.addRecord = function(record, idx) {
      if (this.members.has(record)) {
        return;
      }
      this._super$addRecord(record, idx);
      this.manyArray.internalAddRecords([record], idx);
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$removeCanonicalRecordFromOwn = ember$data$lib$system$relationships$state$relationship$$default.prototype.removeCanonicalRecordFromOwn;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.removeCanonicalRecordFromOwn = function(record, idx) {
      var i = idx;
      if (!this.canonicalMembers.has(record)) {
        return;
      }
      if (i === undefined) {
        i = this.canonicalState.indexOf(record);
      }
      if (i > -1) {
        this.canonicalState.splice(i, 1);
      }
      this._super$removeCanonicalRecordFromOwn(record, idx);
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$flushCanonical = ember$data$lib$system$relationships$state$relationship$$default.prototype.flushCanonical;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.flushCanonical = function() {
      this.manyArray.flushCanonical();
      this._super$flushCanonical();
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype._super$removeRecordFromOwn = ember$data$lib$system$relationships$state$relationship$$default.prototype.removeRecordFromOwn;
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.removeRecordFromOwn = function(record, idx) {
      if (!this.members.has(record)) {
        return;
      }
      this._super$removeRecordFromOwn(record, idx);
      if (idx !== undefined) {
        //TODO(Igor) not used currently, fix
        this.manyArray.currentState.removeAt(idx);
      } else {
        this.manyArray.internalRemoveRecords([record]);
      }
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.notifyRecordRelationshipAdded = function(record, idx) {
      var type = this.relationshipMeta.type;
      Ember.assert("You cannot add '" + record.constructor.typeKey + "' records to the " + this.record.constructor.typeKey + "." + this.key + " relationship (only '" + this.belongsToType.typeKey + "' allowed)", (function () {
        if (type.__isMixin) {
          return type.__mixin.detect(record);
        }
        if (Ember.MODEL_FACTORY_INJECTIONS) {
          type = type.superclass;
        }
        return record instanceof type;
      })());

      this.record.notifyHasManyAdded(this.key, record, idx);
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.reload = function() {
      var self = this;
      if (this.link) {
        return this.fetchLink();
      } else {
        return this.store.scheduleFetchMany(this.manyArray.toArray()).then(function() {
          //Goes away after the manyArray refactor
          self.manyArray.set('isLoaded', true);
          return self.manyArray;
        });
      }
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.computeChanges = function(records) {
      var members = this.canonicalMembers;
      var recordsToRemove = [];
      var length;
      var record;
      var i;

      records = ember$data$lib$system$relationships$state$has$many$$setForArray(records);

      members.forEach(function(member) {
        if (records.has(member)) { return; }

        recordsToRemove.push(member);
      });

      this.removeCanonicalRecords(recordsToRemove);

      // Using records.toArray() since currently using
      // removeRecord can modify length, messing stuff up
      // forEach since it directly looks at "length" each
      // iteration
      records = records.toArray();
      length = records.length;
      for (i = 0; i < length; i++) {
        record = records[i];
        this.removeCanonicalRecord(record);
        this.addCanonicalRecord(record, i);
      }
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.fetchLink = function() {
      var self = this;
      return this.store.findHasMany(this.record, this.link, this.relationshipMeta).then(function(records) {
        self.store._backburner.join(function() {
          self.updateRecordsFromAdapter(records);
        });
        return self.manyArray;
      });
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.findRecords = function() {
      var manyArray = this.manyArray;
      return this.store.findMany(manyArray.toArray()).then(function() {
        //Goes away after the manyArray refactor
        manyArray.set('isLoaded', true);
        return manyArray;
      });
    };
    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.notifyHasManyChanged = function() {
      this.record.notifyHasManyAdded(this.key);
    };

    ember$data$lib$system$relationships$state$has$many$$ManyRelationship.prototype.getRecords = function() {
      //TODO(Igor) sync server here, once our syncing is not stupid
      if (this.isAsync) {
        var self = this;
        var promise;
        if (this.link) {
          promise = this.findLink().then(function() {
            return self.findRecords();
          });
        } else {
          promise = this.findRecords();
        }
        return ember$data$lib$system$promise$proxies$$PromiseManyArray.create({
          content: this.manyArray,
          promise: promise
        });
      } else {
        Ember.assert("You looked up the '" + this.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.hasMany({ async: true })`)", this.manyArray.isEvery('isEmpty', false));

        //TODO(Igor) WTF DO I DO HERE?
        if (!this.manyArray.get('isDestroyed')) {
          this.manyArray.set('isLoaded', true);
        }
        return this.manyArray;
      }
    };

    function ember$data$lib$system$relationships$state$has$many$$setForArray(array) {
      var set = new ember$data$lib$system$ordered$set$$default();

      if (array) {
        for (var i=0, l=array.length; i<l; i++) {
          set.add(array[i]);
        }
      }

      return set;
    }

    var ember$data$lib$system$relationships$state$has$many$$default = ember$data$lib$system$relationships$state$has$many$$ManyRelationship;

    var ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship = function(store, record, inverseKey, relationshipMeta) {
      this._super$constructor(store, record, inverseKey, relationshipMeta);
      this.record = record;
      this.key = relationshipMeta.key;
      this.inverseRecord = null;
      this.canonicalState = null;
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype = Ember.create(ember$data$lib$system$relationships$state$relationship$$default.prototype);
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.constructor = ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$constructor = ember$data$lib$system$relationships$state$relationship$$default;

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.setRecord = function(newRecord) {
      if (newRecord) {
        this.addRecord(newRecord);
      } else if (this.inverseRecord) {
        this.removeRecord(this.inverseRecord);
      }
      this.setHasData(true);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.setCanonicalRecord = function(newRecord) {
      if (newRecord) {
        this.addCanonicalRecord(newRecord);
      } else if (this.inverseRecord) {
        this.removeCanonicalRecord(this.inverseRecord);
      }
      this.setHasData(true);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$addCanonicalRecord = ember$data$lib$system$relationships$state$relationship$$default.prototype.addCanonicalRecord;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.addCanonicalRecord = function(newRecord) {
      if (this.canonicalMembers.has(newRecord)) { return;}

      if (this.canonicalState) {
        this.removeCanonicalRecord(this.canonicalState);
      }

      this.canonicalState = newRecord;
      this._super$addCanonicalRecord(newRecord);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$flushCanonical = ember$data$lib$system$relationships$state$relationship$$default.prototype.flushCanonical;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.flushCanonical = function() {
      //temporary fix to not remove newly created records if server returned null.
      //TODO remove once we have proper diffing
      if (this.inverseRecord && this.inverseRecord.get('isNew') && !this.canonicalState) {
        return;
      }
      this.inverseRecord = this.canonicalState;
      this.record.notifyBelongsToChanged(this.key);
      this._super$flushCanonical();
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$addRecord = ember$data$lib$system$relationships$state$relationship$$default.prototype.addRecord;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.addRecord = function(newRecord) {
      if (this.members.has(newRecord)) { return;}
      var type = this.relationshipMeta.type;
      Ember.assert("You cannot add a '" + newRecord.constructor.typeKey + "' record to the '" + this.record.constructor.typeKey + "." + this.key +"'. " + "You can only add a '" + type.typeKey + "' record to this relationship.", (function () {
        if (type.__isMixin) {
          return type.__mixin.detect(newRecord);
        }
        if (Ember.MODEL_FACTORY_INJECTIONS) {
          type = type.superclass;
        }
        return newRecord instanceof type;
      })());

      if (this.inverseRecord) {
        this.removeRecord(this.inverseRecord);
      }

      this.inverseRecord = newRecord;
      this._super$addRecord(newRecord);
      this.record.notifyBelongsToChanged(this.key);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.setRecordPromise = function(newPromise) {
      var content = newPromise.get && newPromise.get('content');
      Ember.assert("You passed in a promise that did not originate from an EmberData relationship. You can only pass promises that come from a belongsTo or hasMany relationship to the get call.", content !== undefined);
      this.setRecord(content);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$removeRecordFromOwn = ember$data$lib$system$relationships$state$relationship$$default.prototype.removeRecordFromOwn;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.removeRecordFromOwn = function(record) {
      if (!this.members.has(record)) { return;}
      this.inverseRecord = null;
      this._super$removeRecordFromOwn(record);
      this.record.notifyBelongsToChanged(this.key);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype._super$removeCanonicalRecordFromOwn = ember$data$lib$system$relationships$state$relationship$$default.prototype.removeCanonicalRecordFromOwn;
    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.removeCanonicalRecordFromOwn = function(record) {
      if (!this.canonicalMembers.has(record)) { return;}
      this.canonicalState = null;
      this._super$removeCanonicalRecordFromOwn(record);
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.findRecord = function() {
      if (this.inverseRecord) {
        return this.store._findByRecord(this.inverseRecord);
      } else {
        return Ember.RSVP.Promise.resolve(null);
      }
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.fetchLink = function() {
      var self = this;
      return this.store.findBelongsTo(this.record, this.link, this.relationshipMeta).then(function(record) {
        if (record) {
          self.addRecord(record);
        }
        return record;
      });
    };

    ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship.prototype.getRecord = function() {
      //TODO(Igor) flushCanonical here once our syncing is not stupid
      if (this.isAsync) {
        var promise;
        if (this.link) {
          var self = this;
          promise = this.findLink().then(function() {
            return self.findRecord();
          });
        } else {
          promise = this.findRecord();
        }

        return ember$data$lib$system$promise$proxies$$PromiseObject.create({
          promise: promise,
          content: this.inverseRecord
        });
      } else {
        Ember.assert("You looked up the '" + this.key + "' relationship on a '" + this.record.constructor.typeKey + "' with id " + this.record.get('id') +  " but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async (`DS.belongsTo({ async: true })`)", this.inverseRecord === null || !this.inverseRecord.get('isEmpty'));
        return this.inverseRecord;
      }
    };

    var ember$data$lib$system$relationships$state$belongs$to$$default = ember$data$lib$system$relationships$state$belongs$to$$BelongsToRelationship;

    var ember$data$lib$system$relationships$state$create$$createRelationshipFor = function(record, relationshipMeta, store) {
      var inverseKey;
      var inverse = record.constructor.inverseFor(relationshipMeta.key);

      if (inverse) {
        inverseKey = inverse.name;
      }

      if (relationshipMeta.kind === 'hasMany') {
        return new ember$data$lib$system$relationships$state$has$many$$default(store, record, inverseKey, relationshipMeta);
      } else {
        return new ember$data$lib$system$relationships$state$belongs$to$$default(store, record, inverseKey, relationshipMeta);
      }
    };

    var ember$data$lib$system$relationships$state$create$$default = ember$data$lib$system$relationships$state$create$$createRelationshipFor;

    var ember$data$lib$system$snapshot$$get = Ember.get;

    /**
      @class Snapshot
      @namespace DS
      @private
      @constructor
      @param {DS.Model} record The record to create a snapshot from
    */
    function ember$data$lib$system$snapshot$$Snapshot(record) {
      this._attributes = Ember.create(null);
      this._belongsToRelationships = Ember.create(null);
      this._belongsToIds = Ember.create(null);
      this._hasManyRelationships = Ember.create(null);
      this._hasManyIds = Ember.create(null);

      record.eachAttribute(function(keyName) {
        this._attributes[keyName] = ember$data$lib$system$snapshot$$get(record, keyName);
      }, this);

      this.id = ember$data$lib$system$snapshot$$get(record, 'id');
      this.record = record;
      this.type = record.constructor;
      this.typeKey = record.constructor.typeKey;

      // The following code is here to keep backwards compatibility when accessing
      // `constructor` directly.
      //
      // With snapshots you should use `type` instead of `constructor`.
      //
      // Remove for Ember Data 1.0.
      if (Ember.platform.hasPropertyAccessors) {
        var callDeprecate = true;

        Ember.defineProperty(this, 'constructor', {
          get: function() {
            // Ugly hack since accessing error.stack (done in `Ember.deprecate()`)
            // causes the internals of Chrome to access the constructor, which then
            // causes an infinite loop if accessed and calls `Ember.deprecate()`
            // again.
            if (callDeprecate) {
              callDeprecate = false;
              Ember.deprecate('Usage of `snapshot.constructor` is deprecated, use `snapshot.type` instead.');
              callDeprecate = true;
            }

            return this.type;
          }
        });
      } else {
        this.constructor = this.type;
      }
    }

    ember$data$lib$system$snapshot$$Snapshot.prototype = {
      constructor: ember$data$lib$system$snapshot$$Snapshot,

      /**
        The id of the snapshot's underlying record

        Example

        ```javascript
        // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
        postSnapshot.id; // => '1'
        ```

        @property id
        @type {String}
      */
      id: null,

      /**
        The underlying record for this snapshot. Can be used to access methods and
        properties defined on the record.

        Example

        ```javascript
        var json = snapshot.record.toJSON();
        ```

        @property record
        @type {DS.Model}
      */
      record: null,

      /**
        The type of the underlying record for this snapshot, as a subclass of DS.Model.

        @property type
        @type {subclass of DS.Model}
      */
      type: null,

      /**
        The name of the type of the underlying record for this snapshot, as a string.

        @property typeKey
        @type {String}
      */
      typeKey: null,

      /**
        Returns the value of an attribute.

        Example

        ```javascript
        // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
        postSnapshot.attr('author'); // => 'Tomster'
        postSnapshot.attr('title'); // => 'Ember.js rocks'
        ```

        Note: Values are loaded eagerly and cached when the snapshot is created.

        @method attr
        @param {String} keyName
        @return {Object} The attribute value or undefined
      */
      attr: function(keyName) {
        if (keyName in this._attributes) {
          return this._attributes[keyName];
        }
        throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no attribute named '" + keyName + "' defined.");
      },

      /**
        Returns all attributes and their corresponding values.

        Example

        ```javascript
        // store.push('post', { id: 1, author: 'Tomster', title: 'Hello World' });
        postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
        ```

        @method attributes
        @return {Object} All attributes of the current snapshot
      */
      attributes: function() {
        return Ember.copy(this._attributes);
      },

      /**
        Returns the current value of a belongsTo relationship.

        `belongsTo` takes an optional hash of options as a second parameter,
        currently supported options are:

       - `id`: set to `true` if you only want the ID of the related record to be
          returned.

        Example

        ```javascript
        // store.push('post', { id: 1, title: 'Hello World' });
        // store.createRecord('comment', { body: 'Lorem ipsum', post: post });
        commentSnapshot.belongsTo('post'); // => DS.Snapshot
        commentSnapshot.belongsTo('post', { id: true }); // => '1'

        // store.push('comment', { id: 1, body: 'Lorem ipsum' });
        commentSnapshot.belongsTo('post'); // => undefined
        ```

        Calling `belongsTo` will return a new Snapshot as long as there's any known
        data for the relationship available, such as an ID. If the relationship is
        known but unset, `belongsTo` will return `null`. If the contents of the
        relationship is unknown `belongsTo` will return `undefined`.

        Note: Relationships are loaded lazily and cached upon first access.

        @method belongsTo
        @param {String} keyName
        @param {Object} [options]
        @return {DS.Snapshot|String|null|undefined} A snapshot or ID of a known
          relationship or null if the relationship is known but unset. undefined
          will be returned if the contents of the relationship is unknown.
      */
      belongsTo: function(keyName, options) {
        var id = options && options.id;
        var relationship, inverseRecord, hasData;
        var result;

        if (id && keyName in this._belongsToIds) {
          return this._belongsToIds[keyName];
        }

        if (!id && keyName in this._belongsToRelationships) {
          return this._belongsToRelationships[keyName];
        }

        relationship = this.record._relationships[keyName];
        if (!(relationship && relationship.relationshipMeta.kind === 'belongsTo')) {
          throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no belongsTo relationship named '" + keyName + "' defined.");
        }

        hasData = ember$data$lib$system$snapshot$$get(relationship, 'hasData');
        inverseRecord = ember$data$lib$system$snapshot$$get(relationship, 'inverseRecord');

        if (hasData) {
          if (inverseRecord) {
            if (id) {
              result = ember$data$lib$system$snapshot$$get(inverseRecord, 'id');
            } else {
              result = inverseRecord._createSnapshot();
            }
          } else {
            result = null;
          }
        }

        if (id) {
          this._belongsToIds[keyName] = result;
        } else {
          this._belongsToRelationships[keyName] = result;
        }

        return result;
      },

      /**
        Returns the current value of a hasMany relationship.

        `hasMany` takes an optional hash of options as a second parameter,
        currently supported options are:

       - `ids`: set to `true` if you only want the IDs of the related records to be
          returned.

        Example

        ```javascript
        // store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
        postSnapshot.hasMany('comments'); // => [DS.Snapshot, DS.Snapshot]
        postSnapshot.hasMany('comments', { ids: true }); // => ['2', '3']

        // store.push('post', { id: 1, title: 'Hello World' });
        postSnapshot.hasMany('comments'); // => undefined
        ```

        Note: Relationships are loaded lazily and cached upon first access.

        @method hasMany
        @param {String} keyName
        @param {Object} [options]
        @return {Array|undefined} An array of snapshots or IDs of a known
          relationship or an empty array if the relationship is known but unset.
          undefined will be returned if the contents of the relationship is unknown.
      */
      hasMany: function(keyName, options) {
        var ids = options && options.ids;
        var relationship, members, hasData;
        var results;

        if (ids && keyName in this._hasManyIds) {
          return this._hasManyIds[keyName];
        }

        if (!ids && keyName in this._hasManyRelationships) {
          return this._hasManyRelationships[keyName];
        }

        relationship = this.record._relationships[keyName];
        if (!(relationship && relationship.relationshipMeta.kind === 'hasMany')) {
          throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no hasMany relationship named '" + keyName + "' defined.");
        }

        hasData = ember$data$lib$system$snapshot$$get(relationship, 'hasData');
        members = ember$data$lib$system$snapshot$$get(relationship, 'members');

        if (hasData) {
          results = [];
          members.forEach(function(member) {
            if (ids) {
              results.push(ember$data$lib$system$snapshot$$get(member, 'id'));
            } else {
              results.push(member._createSnapshot());
            }
          });
        }

        if (ids) {
          this._hasManyIds[keyName] = results;
        } else {
          this._hasManyRelationships[keyName] = results;
        }

        return results;
      },

      /**
        Iterates through all the attributes of the model, calling the passed
        function on each attribute.

        Example

        ```javascript
        snapshot.eachAttribute(function(name, meta) {
          // ...
        });
        ```

        @method eachAttribute
        @param {Function} callback the callback to execute
        @param {Object} [binding] the value to which the callback's `this` should be bound
      */
      eachAttribute: function(callback, binding) {
        this.record.eachAttribute(callback, binding);
      },

      /**
        Iterates through all the relationships of the model, calling the passed
        function on each relationship.

        Example

        ```javascript
        snapshot.eachRelationship(function(name, relationship) {
          // ...
        });
        ```

        @method eachRelationship
        @param {Function} callback the callback to execute
        @param {Object} [binding] the value to which the callback's `this` should be bound
      */
      eachRelationship: function(callback, binding) {
        this.record.eachRelationship(callback, binding);
      },

      /**
        @method get
        @param {String} keyName
        @return {Object} The property value
        @deprecated Use [attr](#method_attr), [belongsTo](#method_belongsTo) or [hasMany](#method_hasMany) instead
      */
      get: function(keyName) {
        Ember.deprecate('Using DS.Snapshot.get() is deprecated. Use .attr(), .belongsTo() or .hasMany() instead.');

        if (keyName === 'id') {
          return this.id;
        }

        if (keyName in this._attributes) {
          return this.attr(keyName);
        }

        var relationship = this.record._relationships[keyName];

        if (relationship && relationship.relationshipMeta.kind === 'belongsTo') {
          return this.belongsTo(keyName);
        }
        if (relationship && relationship.relationshipMeta.kind === 'hasMany') {
          return this.hasMany(keyName);
        }

        return ember$data$lib$system$snapshot$$get(this.record, keyName);
      },

      /**
        @method unknownProperty
        @param {String} keyName
        @return {Object} The property value
        @deprecated Use [attr](#method_attr), [belongsTo](#method_belongsTo) or [hasMany](#method_hasMany) instead
      */
      unknownProperty: function(keyName) {
        return this.get(keyName);
      },

      /**
        @method _createSnapshot
        @private
      */
      _createSnapshot: function() {
        Ember.deprecate("You called _createSnapshot on what's already a DS.Snapshot. You shouldn't manually create snapshots in your adapter since the store passes snapshots to adapters by default.");
        return this;
      }
    };

    var ember$data$lib$system$snapshot$$default = ember$data$lib$system$snapshot$$Snapshot;

    /**
      @module ember-data
    */

    var ember$data$lib$system$model$model$$get = Ember.get;
    var ember$data$lib$system$model$model$$set = Ember.set;
    var ember$data$lib$system$model$model$$Promise = Ember.RSVP.Promise;
    var ember$data$lib$system$model$model$$forEach = Ember.ArrayPolyfills.forEach;
    var ember$data$lib$system$model$model$$map = Ember.ArrayPolyfills.map;
    var ember$data$lib$system$model$model$$intersection = Ember.EnumerableUtils.intersection;
    var ember$data$lib$system$model$model$$RESERVED_MODEL_PROPS = [
      'currentState', 'data', 'store'
    ];

    var ember$data$lib$system$model$model$$retrieveFromCurrentState = Ember.computed('currentState', function(key) {
      return ember$data$lib$system$model$model$$get(ember$data$lib$system$model$model$$get(this, 'currentState'), key);
    }).readOnly();

    var ember$data$lib$system$model$model$$_extractPivotNameCache = Ember.create(null);
    var ember$data$lib$system$model$model$$_splitOnDotCache = Ember.create(null);

    function ember$data$lib$system$model$model$$splitOnDot(name) {
      return ember$data$lib$system$model$model$$_splitOnDotCache[name] || (
        (ember$data$lib$system$model$model$$_splitOnDotCache[name] = name.split('.'))
      );
    }

    function ember$data$lib$system$model$model$$extractPivotName(name) {
      return ember$data$lib$system$model$model$$_extractPivotNameCache[name] || (
        (ember$data$lib$system$model$model$$_extractPivotNameCache[name] = ember$data$lib$system$model$model$$splitOnDot(name)[0])
      );
    }

    // Like Ember.merge, but instead returns a list of keys
    // for values that fail a strict equality check
    // instead of the original object.
    function ember$data$lib$system$model$model$$mergeAndReturnChangedKeys(original, updates) {
      var changedKeys = [];

      if (!updates || typeof updates !== 'object') {
        return changedKeys;
      }

      var keys   = Ember.keys(updates);
      var length = keys.length;
      var i, val, key;

      for (i = 0; i < length; i++) {
        key = keys[i];
        val = updates[key];

        if (original[key] !== val) {
          changedKeys.push(key);
        }

        original[key] = val;
      }
      return changedKeys;
    }

    /**

      The model class that all Ember Data records descend from.

      @class Model
      @namespace DS
      @extends Ember.Object
      @uses Ember.Evented
    */
    var ember$data$lib$system$model$model$$Model = Ember.Object.extend(Ember.Evented, {
      _recordArrays: undefined,
      _relationships: undefined,

      store: null,

      /**
        If this property is `true` the record is in the `empty`
        state. Empty is the first state all records enter after they have
        been created. Most records created by the store will quickly
        transition to the `loading` state if data needs to be fetched from
        the server or the `created` state if the record is created on the
        client. A record can also enter the empty state if the adapter is
        unable to locate the record.

        @property isEmpty
        @type {Boolean}
        @readOnly
      */
      isEmpty: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `loading` state. A
        record enters this state when the store asks the adapter for its
        data. It remains in this state until the adapter provides the
        requested data.

        @property isLoading
        @type {Boolean}
        @readOnly
      */
      isLoading: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `loaded` state. A
        record enters this state when its data is populated. Most of a
        record's lifecycle is spent inside substates of the `loaded`
        state.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('isLoaded'); // true

        store.find('model', 1).then(function(model) {
          model.get('isLoaded'); // true
        });
        ```

        @property isLoaded
        @type {Boolean}
        @readOnly
      */
      isLoaded: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `dirty` state. The
        record has local changes that have not yet been saved by the
        adapter. This includes records that have been created (but not yet
        saved) or deleted.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('isDirty'); // true

        store.find('model', 1).then(function(model) {
          model.get('isDirty'); // false
          model.set('foo', 'some value');
          model.get('isDirty'); // true
        });
        ```

        @property isDirty
        @type {Boolean}
        @readOnly
      */
      isDirty: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `saving` state. A
        record enters the saving state when `save` is called, but the
        adapter has not yet acknowledged that the changes have been
        persisted to the backend.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('isSaving'); // false
        var promise = record.save();
        record.get('isSaving'); // true
        promise.then(function() {
          record.get('isSaving'); // false
        });
        ```

        @property isSaving
        @type {Boolean}
        @readOnly
      */
      isSaving: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `deleted` state
        and has been marked for deletion. When `isDeleted` is true and
        `isDirty` is true, the record is deleted locally but the deletion
        was not yet persisted. When `isSaving` is true, the change is
        in-flight. When both `isDirty` and `isSaving` are false, the
        change has persisted.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('isDeleted');    // false
        record.deleteRecord();

        // Locally deleted
        record.get('isDeleted');    // true
        record.get('isDirty');      // true
        record.get('isSaving');     // false

        // Persisting the deletion
        var promise = record.save();
        record.get('isDeleted');    // true
        record.get('isSaving');     // true

        // Deletion Persisted
        promise.then(function() {
          record.get('isDeleted');  // true
          record.get('isSaving');   // false
          record.get('isDirty');    // false
        });
        ```

        @property isDeleted
        @type {Boolean}
        @readOnly
      */
      isDeleted: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `new` state. A
        record will be in the `new` state when it has been created on the
        client and the adapter has not yet report that it was successfully
        saved.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('isNew'); // true

        record.save().then(function(model) {
          model.get('isNew'); // false
        });
        ```

        @property isNew
        @type {Boolean}
        @readOnly
      */
      isNew: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If this property is `true` the record is in the `valid` state.

        A record will be in the `valid` state when the adapter did not report any
        server-side validation failures.

        @property isValid
        @type {Boolean}
        @readOnly
      */
      isValid: ember$data$lib$system$model$model$$retrieveFromCurrentState,
      /**
        If the record is in the dirty state this property will report what
        kind of change has caused it to move into the dirty
        state. Possible values are:

        - `created` The record has been created by the client and not yet saved to the adapter.
        - `updated` The record has been updated by the client and not yet saved to the adapter.
        - `deleted` The record has been deleted by the client and not yet saved to the adapter.

        Example

        ```javascript
        var record = store.createRecord('model');
        record.get('dirtyType'); // 'created'
        ```

        @property dirtyType
        @type {String}
        @readOnly
      */
      dirtyType: ember$data$lib$system$model$model$$retrieveFromCurrentState,

      /**
        If `true` the adapter reported that it was unable to save local
        changes to the backend for any reason other than a server-side
        validation error.

        Example

        ```javascript
        record.get('isError'); // false
        record.set('foo', 'valid value');
        record.save().then(null, function() {
          record.get('isError'); // true
        });
        ```

        @property isError
        @type {Boolean}
        @readOnly
      */
      isError: false,
      /**
        If `true` the store is attempting to reload the record form the adapter.

        Example

        ```javascript
        record.get('isReloading'); // false
        record.reload();
        record.get('isReloading'); // true
        ```

        @property isReloading
        @type {Boolean}
        @readOnly
      */
      isReloading: false,

      /**
        The `clientId` property is a transient numerical identifier
        generated at runtime by the data store. It is important
        primarily because newly created objects may not yet have an
        externally generated id.

        @property clientId
        @private
        @type {Number|String}
      */
      clientId: null,
      /**
        All ember models have an id property. This is an identifier
        managed by an external source. These are always coerced to be
        strings before being used internally. Note when declaring the
        attributes for a model it is an error to declare an id
        attribute.

        ```javascript
        var record = store.createRecord('model');
        record.get('id'); // null

        store.find('model', 1).then(function(model) {
          model.get('id'); // '1'
        });
        ```

        @property id
        @type {String}
      */
      id: null,

      /**
        @property currentState
        @private
        @type {Object}
      */
      currentState: ember$data$lib$system$model$states$$default.empty,

      /**
        When the record is in the `invalid` state this object will contain
        any errors returned by the adapter. When present the errors hash
        contains keys corresponding to the invalid property names
        and values which are arrays of Javascript objects with two keys:

        - `message` A string containing the error message from the backend
        - `attribute` The name of the property associated with this error message

        ```javascript
        record.get('errors.length'); // 0
        record.set('foo', 'invalid value');
        record.save().catch(function() {
          record.get('errors').get('foo');
          // [{message: 'foo should be a number.', attribute: 'foo'}]
        });
        ```

        The `errors` property us useful for displaying error messages to
        the user.

        ```handlebars
        <label>Username: {{input value=username}} </label>
        {{#each model.errors.username as |error|}}
          <div class="error">
            {{error.message}}
          </div>
        {{/each}}
        <label>Email: {{input value=email}} </label>
        {{#each model.errors.email as |error|}}
          <div class="error">
            {{error.message}}
          </div>
        {{/each}}
        ```


        You can also access the special `messages` property on the error
        object to get an array of all the error strings.

        ```handlebars
        {{#each model.errors.messages as |message|}}
          <div class="error">
            {{message}}
          </div>
        {{/each}}
        ```

        @property errors
        @type {DS.Errors}
      */
      errors: Ember.computed(function() {
        var errors = ember$data$lib$system$model$errors$$default.create();

        errors.registerHandlers(this, function() {
          this.send('becameInvalid');
        }, function() {
          this.send('becameValid');
        });

        return errors;
      }).readOnly(),

      /**
        Create a JSON representation of the record, using the serialization
        strategy of the store's adapter.

       `serialize` takes an optional hash as a parameter, currently
        supported options are:

       - `includeId`: `true` if the record's ID should be included in the
          JSON representation.

        @method serialize
        @param {Object} options
        @return {Object} an object whose values are primitive JSON values only
      */
      serialize: function(options) {
        return this.store.serialize(this, options);
      },

      /**
        Use [DS.JSONSerializer](DS.JSONSerializer.html) to
        get the JSON representation of a record.

        `toJSON` takes an optional hash as a parameter, currently
        supported options are:

        - `includeId`: `true` if the record's ID should be included in the
          JSON representation.

        @method toJSON
        @param {Object} options
        @return {Object} A JSON representation of the object.
      */
      toJSON: function(options) {
        // container is for lazy transform lookups
        var serializer = ember$data$lib$serializers$json$serializer$$default.create({ container: this.container });
        var snapshot = this._createSnapshot();

        return serializer.serialize(snapshot, options);
      },

      /**
        Fired when the record is ready to be interacted with,
        that is either loaded from the server or created locally.

        @event ready
      */
      ready: function() {
        this.store.recordArrayManager.recordWasLoaded(this);
      },
      /**
        Fired when the record is loaded from the server.

        @event didLoad
      */
      didLoad: Ember.K,

      /**
        Fired when the record is updated.

        @event didUpdate
      */
      didUpdate: Ember.K,

      /**
        Fired when a new record is commited to the server.

        @event didCreate
      */
      didCreate: Ember.K,

      /**
        Fired when the record is deleted.

        @event didDelete
      */
      didDelete: Ember.K,

      /**
        Fired when the record becomes invalid.

        @event becameInvalid
      */
      becameInvalid: Ember.K,

      /**
        Fired when the record enters the error state.

        @event becameError
      */
      becameError: Ember.K,

      /**
        Fired when the record is rolled back.

        @event rolledBack
      */
      rolledBack: Ember.K,

      /**
        @property data
        @private
        @type {Object}
      */
      data: Ember.computed(function() {
        this._data = this._data || {};
        return this._data;
      }).readOnly(),

      _data: null,

      init: function() {
        this._super.apply(this, arguments);
        this._setup();
      },

      _setup: function() {
        this._changesToSync = {};
        this._deferredTriggers = [];
        this._data = {};
        this._attributes = Ember.create(null);
        this._inFlightAttributes = Ember.create(null);
        this._relationships = {};
        /*
          implicit relationships are relationship which have not been declared but the inverse side exists on
          another record somewhere
          For example if there was
          ```
            App.Comment = DS.Model.extend({
              name: DS.attr()
            })
          ```
          but there is also
          ```
            App.Post = DS.Model.extend({
              name: DS.attr(),
              comments: DS.hasMany('comment')
            })
          ```

          would have a implicit post relationship in order to be do things like remove ourselves from the post
          when we are deleted
        */
        this._implicitRelationships = Ember.create(null);
        var model = this;
        //TODO Move into a getter for better perf
        this.constructor.eachRelationship(function(key, descriptor) {
          model._relationships[key] = ember$data$lib$system$relationships$state$create$$default(model, descriptor, model.store);
        });

      },

      /**
        @method send
        @private
        @param {String} name
        @param {Object} context
      */
      send: function(name, context) {
        var currentState = ember$data$lib$system$model$model$$get(this, 'currentState');

        if (!currentState[name]) {
          this._unhandledEvent(currentState, name, context);
        }

        return currentState[name](this, context);
      },

      /**
        @method transitionTo
        @private
        @param {String} name
      */
      transitionTo: function(name) {
        // POSSIBLE TODO: Remove this code and replace with
        // always having direct references to state objects

        var pivotName = ember$data$lib$system$model$model$$extractPivotName(name);
        var currentState = ember$data$lib$system$model$model$$get(this, 'currentState');
        var state = currentState;

        do {
          if (state.exit) { state.exit(this); }
          state = state.parentState;
        } while (!state.hasOwnProperty(pivotName));

        var path = ember$data$lib$system$model$model$$splitOnDot(name);
        var setups = [];
        var enters = [];
        var i, l;

        for (i=0, l=path.length; i<l; i++) {
          state = state[path[i]];

          if (state.enter) { enters.push(state); }
          if (state.setup) { setups.push(state); }
        }

        for (i=0, l=enters.length; i<l; i++) {
          enters[i].enter(this);
        }

        ember$data$lib$system$model$model$$set(this, 'currentState', state);

        for (i=0, l=setups.length; i<l; i++) {
          setups[i].setup(this);
        }

        this.updateRecordArraysLater();
      },

      _unhandledEvent: function(state, name, context) {
        var errorMessage = "Attempted to handle event `" + name + "` ";
        errorMessage    += "on " + String(this) + " while in state ";
        errorMessage    += state.stateName + ". ";

        if (context !== undefined) {
          errorMessage  += "Called with " + Ember.inspect(context) + ".";
        }

        throw new Ember.Error(errorMessage);
      },

      withTransaction: function(fn) {
        var transaction = ember$data$lib$system$model$model$$get(this, 'transaction');
        if (transaction) { fn(transaction); }
      },

      /**
        @method loadingData
        @private
        @param {Promise} promise
      */
      loadingData: function(promise) {
        this.send('loadingData', promise);
      },

      /**
        @method loadedData
        @private
      */
      loadedData: function() {
        this.send('loadedData');
      },

      /**
        @method notFound
        @private
      */
      notFound: function() {
        this.send('notFound');
      },

      /**
        @method pushedData
        @private
      */
      pushedData: function() {
        this.send('pushedData');
      },

      /**
        Marks the record as deleted but does not save it. You must call
        `save` afterwards if you want to persist it. You might use this
        method if you want to allow the user to still `rollback()` a
        delete after it was made.

        Example

        ```javascript
        App.ModelDeleteRoute = Ember.Route.extend({
          actions: {
            softDelete: function() {
              this.controller.get('model').deleteRecord();
            },
            confirm: function() {
              this.controller.get('model').save();
            },
            undo: function() {
              this.controller.get('model').rollback();
            }
          }
        });
        ```

        @method deleteRecord
      */
      deleteRecord: function() {
        this.send('deleteRecord');
      },

      /**
        Same as `deleteRecord`, but saves the record immediately.

        Example

        ```javascript
        App.ModelDeleteRoute = Ember.Route.extend({
          actions: {
            delete: function() {
              var controller = this.controller;
              controller.get('model').destroyRecord().then(function() {
                controller.transitionToRoute('model.index');
              });
            }
          }
        });
        ```

        @method destroyRecord
        @return {Promise} a promise that will be resolved when the adapter returns
        successfully or rejected if the adapter returns with an error.
      */
      destroyRecord: function() {
        this.deleteRecord();
        return this.save();
      },

      /**
        @method unloadRecord
        @private
      */
      unloadRecord: function() {
        if (this.isDestroyed) { return; }

        this.send('unloadRecord');
      },

      /**
        @method clearRelationships
        @private
      */
      clearRelationships: function() {
        this.eachRelationship(function(name, relationship) {
          var rel = this._relationships[name];
          if (rel) {
            //TODO(Igor) figure out whether we want to clear or disconnect
            rel.clear();
            rel.destroy();
          }
        }, this);
        var model = this;
        ember$data$lib$system$model$model$$forEach.call(Ember.keys(this._implicitRelationships), function(key) {
          model._implicitRelationships[key].clear();
          model._implicitRelationships[key].destroy();
        });
      },

      disconnectRelationships: function() {
        this.eachRelationship(function(name, relationship) {
          this._relationships[name].disconnect();
        }, this);
        var model = this;
        ember$data$lib$system$model$model$$forEach.call(Ember.keys(this._implicitRelationships), function(key) {
          model._implicitRelationships[key].disconnect();
        });
      },

      reconnectRelationships: function() {
        this.eachRelationship(function(name, relationship) {
          this._relationships[name].reconnect();
        }, this);
        var model = this;
        ember$data$lib$system$model$model$$forEach.call(Ember.keys(this._implicitRelationships), function(key) {
          model._implicitRelationships[key].reconnect();
        });
      },


      /**
        @method updateRecordArrays
        @private
      */
      updateRecordArrays: function() {
        this._updatingRecordArraysLater = false;
        this.store.dataWasUpdated(this.constructor, this);
      },

      /**
        When a find request is triggered on the store, the user can optionally pass in
        attributes and relationships to be preloaded. These are meant to behave as if they
        came back from the server, except the user obtained them out of band and is informing
        the store of their existence. The most common use case is for supporting client side
        nested URLs, such as `/posts/1/comments/2` so the user can do
        `store.find('comment', 2, {post:1})` without having to fetch the post.

        Preloaded data can be attributes and relationships passed in either as IDs or as actual
        models.

        @method _preloadData
        @private
        @param {Object} preload
      */
      _preloadData: function(preload) {
        var record = this;
        //TODO(Igor) consider the polymorphic case
        ember$data$lib$system$model$model$$forEach.call(Ember.keys(preload), function(key) {
          var preloadValue = ember$data$lib$system$model$model$$get(preload, key);
          var relationshipMeta = record.constructor.metaForProperty(key);
          if (relationshipMeta.isRelationship) {
            record._preloadRelationship(key, preloadValue);
          } else {
            ember$data$lib$system$model$model$$get(record, '_data')[key] = preloadValue;
          }
        });
      },

      _preloadRelationship: function(key, preloadValue) {
        var relationshipMeta = this.constructor.metaForProperty(key);
        var type = relationshipMeta.type;
        if (relationshipMeta.kind === 'hasMany') {
          this._preloadHasMany(key, preloadValue, type);
        } else {
          this._preloadBelongsTo(key, preloadValue, type);
        }
      },

      _preloadHasMany: function(key, preloadValue, type) {
        Ember.assert("You need to pass in an array to set a hasMany property on a record", Ember.isArray(preloadValue));
        var record = this;

        var recordsToSet = ember$data$lib$system$model$model$$map.call(preloadValue, function(recordToPush) {
          return record._convertStringOrNumberIntoRecord(recordToPush, type);
        });
        //We use the pathway of setting the hasMany as if it came from the adapter
        //because the user told us that they know this relationships exists already
        this._relationships[key].updateRecordsFromAdapter(recordsToSet);
      },

      _preloadBelongsTo: function(key, preloadValue, type) {
        var recordToSet = this._convertStringOrNumberIntoRecord(preloadValue, type);

        //We use the pathway of setting the hasMany as if it came from the adapter
        //because the user told us that they know this relationships exists already
        this._relationships[key].setRecord(recordToSet);
      },

      _convertStringOrNumberIntoRecord: function(value, type) {
        if (Ember.typeOf(value) === 'string' || Ember.typeOf(value) === 'number') {
          return this.store.recordForId(type, value);
        }
        return value;
      },

      /**
        @method _notifyProperties
        @private
      */
      _notifyProperties: function(keys) {
        Ember.beginPropertyChanges();
        var key;
        for (var i = 0, length = keys.length; i < length; i++) {
          key = keys[i];
          this.notifyPropertyChange(key);
        }
        Ember.endPropertyChanges();
      },

      /**
        Returns an object, whose keys are changed properties, and value is
        an [oldProp, newProp] array.

        Example

        ```javascript
        App.Mascot = DS.Model.extend({
          name: attr('string')
        });

        var person = store.createRecord('person');
        person.changedAttributes(); // {}
        person.set('name', 'Tomster');
        person.changedAttributes(); // {name: [undefined, 'Tomster']}
        ```

        @method changedAttributes
        @return {Object} an object, whose keys are changed properties,
          and value is an [oldProp, newProp] array.
      */
      changedAttributes: function() {
        var oldData = ember$data$lib$system$model$model$$get(this, '_data');
        var newData = ember$data$lib$system$model$model$$get(this, '_attributes');
        var diffData = {};
        var prop;

        for (prop in newData) {
          diffData[prop] = [oldData[prop], newData[prop]];
        }

        return diffData;
      },

      /**
        @method adapterWillCommit
        @private
      */
      adapterWillCommit: function() {
        this.send('willCommit');
      },

      /**
        If the adapter did not return a hash in response to a commit,
        merge the changed attributes and relationships into the existing
        saved data.

        @method adapterDidCommit
      */
      adapterDidCommit: function(data) {
        var changedKeys;
        ember$data$lib$system$model$model$$set(this, 'isError', false);

        if (data) {
          changedKeys = ember$data$lib$system$model$model$$mergeAndReturnChangedKeys(this._data, data);
        } else {
          ember$data$lib$system$merge$$default(this._data, this._inFlightAttributes);
        }

        this._inFlightAttributes = Ember.create(null);

        this.send('didCommit');
        this.updateRecordArraysLater();

        if (!data) { return; }

        this._notifyProperties(changedKeys);
      },

      /**
        @method adapterDidDirty
        @private
      */
      adapterDidDirty: function() {
        this.send('becomeDirty');
        this.updateRecordArraysLater();
      },


      /**
        @method updateRecordArraysLater
        @private
      */
      updateRecordArraysLater: function() {
        // quick hack (something like this could be pushed into run.once
        if (this._updatingRecordArraysLater) { return; }
        this._updatingRecordArraysLater = true;

        Ember.run.schedule('actions', this, this.updateRecordArrays);
      },

      /**
        @method setupData
        @private
        @param {Object} data
      */
      setupData: function(data) {
        Ember.assert("Expected an object as `data` in `setupData`", Ember.typeOf(data) === 'object');

        var changedKeys = ember$data$lib$system$model$model$$mergeAndReturnChangedKeys(this._data, data);

        this.pushedData();

        this._notifyProperties(changedKeys);
      },

      materializeId: function(id) {
        ember$data$lib$system$model$model$$set(this, 'id', id);
      },

      materializeAttributes: function(attributes) {
        Ember.assert("Must pass an object to materializeAttributes", !!attributes);
        ember$data$lib$system$merge$$default(this._data, attributes);
      },

      materializeAttribute: function(name, value) {
        this._data[name] = value;
      },

      /**
        If the model `isDirty` this function will discard any unsaved
        changes

        Example

        ```javascript
        record.get('name'); // 'Untitled Document'
        record.set('name', 'Doc 1');
        record.get('name'); // 'Doc 1'
        record.rollback();
        record.get('name'); // 'Untitled Document'
        ```

        @method rollback
      */
      rollback: function() {
        var dirtyKeys = Ember.keys(this._attributes);

        this._attributes = Ember.create(null);

        if (ember$data$lib$system$model$model$$get(this, 'isError')) {
          this._inFlightAttributes = Ember.create(null);
          ember$data$lib$system$model$model$$set(this, 'isError', false);
        }

        //Eventually rollback will always work for relationships
        //For now we support it only out of deleted state, because we
        //have an explicit way of knowing when the server acked the relationship change
        if (ember$data$lib$system$model$model$$get(this, 'isDeleted')) {
          this.reconnectRelationships();
        }

        if (ember$data$lib$system$model$model$$get(this, 'isNew')) {
          this.clearRelationships();
        }

        if (!ember$data$lib$system$model$model$$get(this, 'isValid')) {
          this._inFlightAttributes = Ember.create(null);
        }

        this.send('rolledBack');

        this._notifyProperties(dirtyKeys);
      },

      /**
        @method _createSnapshot
        @private
      */
      _createSnapshot: function() {
        return new ember$data$lib$system$snapshot$$default(this);
      },

      toStringExtension: function() {
        return ember$data$lib$system$model$model$$get(this, 'id');
      },

      /**
        Save the record and persist any changes to the record to an
        external source via the adapter.

        Example

        ```javascript
        record.set('name', 'Tomster');
        record.save().then(function() {
          // Success callback
        }, function() {
          // Error callback
        });
        ```
        @method save
        @return {Promise} a promise that will be resolved when the adapter returns
        successfully or rejected if the adapter returns with an error.
      */
      save: function() {
        var promiseLabel = "DS: Model#save " + this;
        var resolver = Ember.RSVP.defer(promiseLabel);

        this.store.scheduleSave(this, resolver);
        this._inFlightAttributes = this._attributes;
        this._attributes = Ember.create(null);

        return ember$data$lib$system$promise$proxies$$PromiseObject.create({
          promise: resolver.promise
        });
      },

      /**
        Reload the record from the adapter.

        This will only work if the record has already finished loading
        and has not yet been modified (`isLoaded` but not `isDirty`,
        or `isSaving`).

        Example

        ```javascript
        App.ModelViewRoute = Ember.Route.extend({
          actions: {
            reload: function() {
              this.controller.get('model').reload().then(function(model) {
                // do something with the reloaded model
              });
            }
          }
        });
        ```

        @method reload
        @return {Promise} a promise that will be resolved with the record when the
        adapter returns successfully or rejected if the adapter returns
        with an error.
      */
      reload: function() {
        ember$data$lib$system$model$model$$set(this, 'isReloading', true);

        var record = this;
        var promiseLabel = "DS: Model#reload of " + this;
        var promise = new ember$data$lib$system$model$model$$Promise(function(resolve) {
          record.send('reloadRecord', resolve);
        }, promiseLabel).then(function() {
          record.set('isError', false);
          return record;
        }, function(reason) {
          record.set('isError', true);
          throw reason;
        }, "DS: Model#reload complete, update flags")['finally'](function () {
          record.set('isReloading', false);
          record.updateRecordArrays();
        });

        return ember$data$lib$system$promise$proxies$$PromiseObject.create({
          promise: promise
        });
      },

      // FOR USE DURING COMMIT PROCESS

      /**
        @method adapterDidInvalidate
        @private
      */
      adapterDidInvalidate: function(errors) {
        var recordErrors = ember$data$lib$system$model$model$$get(this, 'errors');
        for (var key in errors) {
          if (!errors.hasOwnProperty(key)) {
            continue;
          }
          recordErrors.add(key, errors[key]);
        }
        this._saveWasRejected();
      },

      /**
        @method adapterDidError
        @private
      */
      adapterDidError: function() {
        this.send('becameError');
        ember$data$lib$system$model$model$$set(this, 'isError', true);
        this._saveWasRejected();
      },

      _saveWasRejected: function() {
        var keys = Ember.keys(this._inFlightAttributes);
        for (var i=0; i < keys.length; i++) {
          if (this._attributes[keys[i]] === undefined) {
            this._attributes[keys[i]] = this._inFlightAttributes[keys[i]];
          }
        }
        this._inFlightAttributes = Ember.create(null);
      },

      /**
        Override the default event firing from Ember.Evented to
        also call methods with the given name.

        @method trigger
        @private
        @param {String} name
      */
      trigger: function() {
        var length = arguments.length;
        var args = new Array(length - 1);
        var name = arguments[0];

        for (var i = 1; i < length; i++) {
          args[i - 1] = arguments[i];
        }

        Ember.tryInvoke(this, name, args);
        this._super.apply(this, arguments);
      },

      triggerLater: function() {
        var length = arguments.length;
        var args = new Array(length);

        for (var i = 0; i < length; i++) {
          args[i] = arguments[i];
        }

        if (this._deferredTriggers.push(args) !== 1) {
          return;
        }
        Ember.run.schedule('actions', this, '_triggerDeferredTriggers');
      },

      _triggerDeferredTriggers: function() {
        for (var i=0, l= this._deferredTriggers.length; i<l; i++) {
          this.trigger.apply(this, this._deferredTriggers[i]);
        }

        this._deferredTriggers.length = 0;
      },

      willDestroy: function() {
        this._super.apply(this, arguments);
        this.clearRelationships();
      },

      // This is a temporary solution until we refactor DS.Model to not
      // rely on the data property.
      willMergeMixin: function(props) {
        var constructor = this.constructor;
        Ember.assert('`' + ember$data$lib$system$model$model$$intersection(Ember.keys(props), ember$data$lib$system$model$model$$RESERVED_MODEL_PROPS)[0] + '` is a reserved property name on DS.Model objects. Please choose a different property name for ' + constructor.toString(), !ember$data$lib$system$model$model$$intersection(Ember.keys(props), ember$data$lib$system$model$model$$RESERVED_MODEL_PROPS)[0]);
      },

      attr: function() {
        Ember.assert("The `attr` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
      },

      belongsTo: function() {
        Ember.assert("The `belongsTo` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
      },

      hasMany: function() {
        Ember.assert("The `hasMany` method is not available on DS.Model, a DS.Snapshot was probably expected. Are you passing a DS.Model instead of a DS.Snapshot to your serializer?", false);
      }
    });

    ember$data$lib$system$model$model$$Model.reopenClass({
      /**
        Alias DS.Model's `create` method to `_create`. This allows us to create DS.Model
        instances from within the store, but if end users accidentally call `create()`
        (instead of `createRecord()`), we can raise an error.

        @method _create
        @private
        @static
      */
      _create: ember$data$lib$system$model$model$$Model.create,

      /**
        Override the class' `create()` method to raise an error. This
        prevents end users from inadvertently calling `create()` instead
        of `createRecord()`. The store is still able to create instances
        by calling the `_create()` method. To create an instance of a
        `DS.Model` use [store.createRecord](DS.Store.html#method_createRecord).

        @method create
        @private
        @static
      */
      create: function() {
        throw new Ember.Error("You should not call `create` on a model. Instead, call `store.createRecord` with the attributes you would like to set.");
      }
    });

    var ember$data$lib$system$model$model$$default = ember$data$lib$system$model$model$$Model;
    var ember$data$lib$utils$supports$computed$getter$setter$$supportsComputedGetterSetter;

    try {
      Ember.computed({
        get: function() { },
        set: function() { }
      });
      ember$data$lib$utils$supports$computed$getter$setter$$supportsComputedGetterSetter = true;
    } catch(e) {
      ember$data$lib$utils$supports$computed$getter$setter$$supportsComputedGetterSetter = false;
    }

    var ember$data$lib$utils$supports$computed$getter$setter$$default = ember$data$lib$utils$supports$computed$getter$setter$$supportsComputedGetterSetter;

    var ember$data$lib$utils$computed$polyfill$$computed = Ember.computed;

    var ember$data$lib$utils$computed$polyfill$$default = function() {
      var polyfillArguments = [];
      var config = arguments[arguments.length - 1];

      if (typeof config === 'function' || ember$data$lib$utils$supports$computed$getter$setter$$default) {
        return ember$data$lib$utils$computed$polyfill$$computed.apply(null, arguments);
      }

      for (var i = 0, l = arguments.length - 1; i < l; i++) {
        polyfillArguments.push(arguments[i]);
      }

      var func;
      if (config.set) {
        func = function(key, value) {
          if (arguments.length > 1) {
            return config.set.call(this, key, value);
          } else {
            return config.get.call(this, key);
          }
        };
      } else {
        func = function(key) {
          return config.get.call(this, key);
        };
      }

      polyfillArguments.push(func);

      return ember$data$lib$utils$computed$polyfill$$computed.apply(null, polyfillArguments);
    };

    /**
      @module ember-data
    */

    var ember$data$lib$system$model$attributes$$get = Ember.get;

    /**
      @class Model
      @namespace DS
    */
    ember$data$lib$system$model$model$$default.reopenClass({
      /**
        A map whose keys are the attributes of the model (properties
        described by DS.attr) and whose values are the meta object for the
        property.

        Example

        ```javascript

        App.Person = DS.Model.extend({
          firstName: attr('string'),
          lastName: attr('string'),
          birthday: attr('date')
        });

        var attributes = Ember.get(App.Person, 'attributes')

        attributes.forEach(function(name, meta) {
          console.log(name, meta);
        });

        // prints:
        // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
        // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
        // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
        ```

        @property attributes
        @static
        @type {Ember.Map}
        @readOnly
      */
      attributes: Ember.computed(function() {
        var map = ember$data$lib$system$map$$Map.create();

        this.eachComputedProperty(function(name, meta) {
          if (meta.isAttribute) {
            Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.toString(), name !== 'id');

            meta.name = name;
            map.set(name, meta);
          }
        });

        return map;
      }).readOnly(),

      /**
        A map whose keys are the attributes of the model (properties
        described by DS.attr) and whose values are type of transformation
        applied to each attribute. This map does not include any
        attributes that do not have an transformation type.

        Example

        ```javascript
        App.Person = DS.Model.extend({
          firstName: attr(),
          lastName: attr('string'),
          birthday: attr('date')
        });

        var transformedAttributes = Ember.get(App.Person, 'transformedAttributes')

        transformedAttributes.forEach(function(field, type) {
          console.log(field, type);
        });

        // prints:
        // lastName string
        // birthday date
        ```

        @property transformedAttributes
        @static
        @type {Ember.Map}
        @readOnly
      */
      transformedAttributes: Ember.computed(function() {
        var map = ember$data$lib$system$map$$Map.create();

        this.eachAttribute(function(key, meta) {
          if (meta.type) {
            map.set(key, meta.type);
          }
        });

        return map;
      }).readOnly(),

      /**
        Iterates through the attributes of the model, calling the passed function on each
        attribute.

        The callback method you provide should have the following signature (all
        parameters are optional):

        ```javascript
        function(name, meta);
        ```

        - `name` the name of the current property in the iteration
        - `meta` the meta object for the attribute property in the iteration

        Note that in addition to a callback, you can also pass an optional target
        object that will be set as `this` on the context.

        Example

        ```javascript
        App.Person = DS.Model.extend({
          firstName: attr('string'),
          lastName: attr('string'),
          birthday: attr('date')
        });

        App.Person.eachAttribute(function(name, meta) {
          console.log(name, meta);
        });

        // prints:
        // firstName {type: "string", isAttribute: true, options: Object, parentType: function, name: "firstName"}
        // lastName {type: "string", isAttribute: true, options: Object, parentType: function, name: "lastName"}
        // birthday {type: "date", isAttribute: true, options: Object, parentType: function, name: "birthday"}
       ```

        @method eachAttribute
        @param {Function} callback The callback to execute
        @param {Object} [target] The target object to use
        @static
      */
      eachAttribute: function(callback, binding) {
        ember$data$lib$system$model$attributes$$get(this, 'attributes').forEach(function(meta, name) {
          callback.call(binding, name, meta);
        }, binding);
      },

      /**
        Iterates through the transformedAttributes of the model, calling
        the passed function on each attribute. Note the callback will not be
        called for any attributes that do not have an transformation type.

        The callback method you provide should have the following signature (all
        parameters are optional):

        ```javascript
        function(name, type);
        ```

        - `name` the name of the current property in the iteration
        - `type` a string containing the name of the type of transformed
          applied to the attribute

        Note that in addition to a callback, you can also pass an optional target
        object that will be set as `this` on the context.

        Example

        ```javascript
        App.Person = DS.Model.extend({
          firstName: attr(),
          lastName: attr('string'),
          birthday: attr('date')
        });

        App.Person.eachTransformedAttribute(function(name, type) {
          console.log(name, type);
        });

        // prints:
        // lastName string
        // birthday date
       ```

        @method eachTransformedAttribute
        @param {Function} callback The callback to execute
        @param {Object} [target] The target object to use
        @static
      */
      eachTransformedAttribute: function(callback, binding) {
        ember$data$lib$system$model$attributes$$get(this, 'transformedAttributes').forEach(function(type, name) {
          callback.call(binding, name, type);
        });
      }
    });


    ember$data$lib$system$model$model$$default.reopen({
      eachAttribute: function(callback, binding) {
        this.constructor.eachAttribute(callback, binding);
      }
    });

    function ember$data$lib$system$model$attributes$$getDefaultValue(record, options, key) {
      if (typeof options.defaultValue === "function") {
        return options.defaultValue.apply(null, arguments);
      } else {
        return options.defaultValue;
      }
    }

    function ember$data$lib$system$model$attributes$$hasValue(record, key) {
      return key in record._attributes ||
             key in record._inFlightAttributes ||
             record._data.hasOwnProperty(key);
    }

    function ember$data$lib$system$model$attributes$$getValue(record, key) {
      if (key in record._attributes) {
        return record._attributes[key];
      } else if (key in record._inFlightAttributes) {
        return record._inFlightAttributes[key];
      } else {
        return record._data[key];
      }
    }

    function ember$data$lib$system$model$attributes$$attr(type, options) {
      if (typeof type === 'object') {
        options = type;
        type = undefined;
      } else {
        options = options || {};
      }

      var meta = {
        type: type,
        isAttribute: true,
        options: options
      };

      return ember$data$lib$utils$computed$polyfill$$default({
        get: function(key) {
          if (ember$data$lib$system$model$attributes$$hasValue(this, key)) {
            return ember$data$lib$system$model$attributes$$getValue(this, key);
          } else {
            return ember$data$lib$system$model$attributes$$getDefaultValue(this, options, key);
          }
        },
        set: function(key, value) {
          Ember.assert("You may not set `id` as an attribute on your model. Please remove any lines that look like: `id: DS.attr('<type>')` from " + this.constructor.toString(), key !== 'id');
          var oldValue = ember$data$lib$system$model$attributes$$getValue(this, key);

          if (value !== oldValue) {
            // Add the new value to the changed attributes hash; it will get deleted by
            // the 'didSetProperty' handler if it is no different from the original value
            this._attributes[key] = value;

            this.send('didSetProperty', {
              name: key,
              oldValue: oldValue,
              originalValue: this._data[key],
              value: value
            });
          }

          return value;
        }
      }).meta(meta);
    }
    var ember$data$lib$system$model$attributes$$default = ember$data$lib$system$model$attributes$$attr;
    var ember$data$lib$system$model$$default = ember$data$lib$system$model$model$$default;
    //Stanley told me to do this
    var ember$data$lib$system$store$$Backburner = Ember.__loader.require('backburner')['default'] || Ember.__loader.require('backburner')['Backburner'];

    //Shim Backburner.join
    if (!ember$data$lib$system$store$$Backburner.prototype.join) {
      var ember$data$lib$system$store$$isString = function(suspect) {
        return typeof suspect === 'string';
      };

      ember$data$lib$system$store$$Backburner.prototype.join = function(/*target, method, args */) {
        var method, target;

        if (this.currentInstance) {
          var length = arguments.length;
          if (length === 1) {
            method = arguments[0];
            target = null;
          } else {
            target = arguments[0];
            method = arguments[1];
          }

          if (ember$data$lib$system$store$$isString(method)) {
            method = target[method];
          }

          if (length === 1) {
            return method();
          } else if (length === 2) {
            return method.call(target);
          } else {
            var args = new Array(length - 2);
            for (var i =0, l = length - 2; i < l; i++) {
              args[i] = arguments[i + 2];
            }
            return method.apply(target, args);
          }
        } else {
          return this.run.apply(this, arguments);
        }
      };
    }


    var ember$data$lib$system$store$$get = Ember.get;
    var ember$data$lib$system$store$$set = Ember.set;
    var ember$data$lib$system$store$$once = Ember.run.once;
    var ember$data$lib$system$store$$isNone = Ember.isNone;
    var ember$data$lib$system$store$$forEach = Ember.EnumerableUtils.forEach;
    var ember$data$lib$system$store$$indexOf = Ember.EnumerableUtils.indexOf;
    var ember$data$lib$system$store$$map = Ember.EnumerableUtils.map;
    var ember$data$lib$system$store$$Promise = Ember.RSVP.Promise;
    var ember$data$lib$system$store$$copy = Ember.copy;
    var ember$data$lib$system$store$$Store;

    var ember$data$lib$system$store$$camelize = Ember.String.camelize;

    var ember$data$lib$system$store$$Service = Ember.Service;
    if (!ember$data$lib$system$store$$Service) {
      ember$data$lib$system$store$$Service = Ember.Object;
    }

    // Implementors Note:
    //
    //   The variables in this file are consistently named according to the following
    //   scheme:
    //
    //   * +id+ means an identifier managed by an external source, provided inside
    //     the data provided by that source. These are always coerced to be strings
    //     before being used internally.
    //   * +clientId+ means a transient numerical identifier generated at runtime by
    //     the data store. It is important primarily because newly created objects may
    //     not yet have an externally generated id.
    //   * +reference+ means a record reference object, which holds metadata about a
    //     record, even if it has not yet been fully materialized.
    //   * +type+ means a subclass of DS.Model.

    // Used by the store to normalize IDs entering the store.  Despite the fact
    // that developers may provide IDs as numbers (e.g., `store.find(Person, 1)`),
    // it is important that internally we use strings, since IDs may be serialized
    // and lose type information.  For example, Ember's router may put a record's
    // ID into the URL, and if we later try to deserialize that URL and find the
    // corresponding record, we will not know if it is a string or a number.
    function ember$data$lib$system$store$$coerceId(id) {
      return id == null ? null : id+'';
    }

    /**
      The store contains all of the data for records loaded from the server.
      It is also responsible for creating instances of `DS.Model` that wrap
      the individual data for a record, so that they can be bound to in your
      Handlebars templates.

      Define your application's store like this:

      ```javascript
      MyApp.ApplicationStore = DS.Store.extend();
      ```

      Most Ember.js applications will only have a single `DS.Store` that is
      automatically created by their `Ember.Application`.

      You can retrieve models from the store in several ways. To retrieve a record
      for a specific id, use `DS.Store`'s `find()` method:

      ```javascript
      store.find('person', 123).then(function (person) {
      });
      ```

      By default, the store will talk to your backend using a standard
      REST mechanism. You can customize how the store talks to your
      backend by specifying a custom adapter:

      ```javascript
      MyApp.ApplicationAdapter = MyApp.CustomAdapter
      ```

      You can learn more about writing a custom adapter by reading the `DS.Adapter`
      documentation.

      ### Store createRecord() vs. push() vs. pushPayload()

      The store provides multiple ways to create new record objects. They have
      some subtle differences in their use which are detailed below:

      [createRecord](#method_createRecord) is used for creating new
      records on the client side. This will return a new record in the
      `created.uncommitted` state. In order to persist this record to the
      backend you will need to call `record.save()`.

      [push](#method_push) is used to notify Ember Data's store of new or
      updated records that exist in the backend. This will return a record
      in the `loaded.saved` state. The primary use-case for `store#push` is
      to notify Ember Data about record updates (full or partial) that happen
      outside of the normal adapter methods (for example
      [SSE](http://dev.w3.org/html5/eventsource/) or [Web
      Sockets](http://www.w3.org/TR/2009/WD-websockets-20091222/)).

      [pushPayload](#method_pushPayload) is a convenience wrapper for
      `store#push` that will deserialize payloads if the
      Serializer implements a `pushPayload` method.

      Note: When creating a new record using any of the above methods
      Ember Data will update `DS.RecordArray`s such as those returned by
      `store#all()`, `store#findAll()` or `store#filter()`. This means any
      data bindings or computed properties that depend on the RecordArray
      will automatically be synced to include the new or updated record
      values.

      @class Store
      @namespace DS
      @extends Ember.Service
    */
    ember$data$lib$system$store$$Store = ember$data$lib$system$store$$Service.extend({

      /**
        @method init
        @private
      */
      init: function() {
        this._backburner = new ember$data$lib$system$store$$Backburner(['normalizeRelationships', 'syncRelationships', 'finished']);
        // internal bookkeeping; not observable
        this.typeMaps = {};
        this.recordArrayManager = ember$data$lib$system$record$array$manager$$default.create({
          store: this
        });
        this._pendingSave = [];
        this._containerCache = Ember.create(null);
        //Used to keep track of all the find requests that need to be coalesced
        this._pendingFetch = ember$data$lib$system$map$$Map.create();
      },

      /**
        The adapter to use to communicate to a backend server or other persistence layer.

        This can be specified as an instance, class, or string.

        If you want to specify `App.CustomAdapter` as a string, do:

        ```js
        adapter: 'custom'
        ```

        @property adapter
        @default DS.RESTAdapter
        @type {DS.Adapter|String}
      */
      adapter: '-rest',

      /**
        Returns a JSON representation of the record using a custom
        type-specific serializer, if one exists.

        The available options are:

        * `includeId`: `true` if the record's ID should be included in
          the JSON representation

        @method serialize
        @private
        @param {DS.Model} record the record to serialize
        @param {Object} options an options hash
      */
      serialize: function(record, options) {
        var snapshot = record._createSnapshot();
        return this.serializerFor(snapshot.typeKey).serialize(snapshot, options);
      },

      /**
        This property returns the adapter, after resolving a possible
        string key.

        If the supplied `adapter` was a class, or a String property
        path resolved to a class, this property will instantiate the
        class.

        This property is cacheable, so the same instance of a specified
        adapter class should be used for the lifetime of the store.

        @property defaultAdapter
        @private
        @return DS.Adapter
      */
      defaultAdapter: Ember.computed('adapter', function() {
        var adapter = ember$data$lib$system$store$$get(this, 'adapter');

        Ember.assert('You tried to set `adapter` property to an instance of `DS.Adapter`, where it should be a name or a factory', !(adapter instanceof ember$data$lib$system$adapter$$Adapter));

        if (typeof adapter === 'string') {
          adapter = this.container.lookup('adapter:' + adapter) || this.container.lookup('adapter:application') || this.container.lookup('adapter:-rest');
        }

        if (DS.Adapter.detect(adapter)) {
          adapter = adapter.create({
            container: this.container,
            store: this
          });
        }

        return adapter;
      }),

      // .....................
      // . CREATE NEW RECORD .
      // .....................

      /**
        Create a new record in the current store. The properties passed
        to this method are set on the newly created record.

        To create a new instance of `App.Post`:

        ```js
        store.createRecord('post', {
          title: "Rails is omakase"
        });
        ```

        @method createRecord
        @param {String} typeKey
        @param {Object} properties a hash of properties to set on the
          newly created record.
        @return {DS.Model} record
      */
      createRecord: function(typeKey, inputProperties) {
        var typeClass = this.modelFor(typeKey);
        var properties = ember$data$lib$system$store$$copy(inputProperties) || {};

        // If the passed properties do not include a primary key,
        // give the adapter an opportunity to generate one. Typically,
        // client-side ID generators will use something like uuid.js
        // to avoid conflicts.

        if (ember$data$lib$system$store$$isNone(properties.id)) {
          properties.id = this._generateId(typeClass, properties);
        }

        // Coerce ID to a string
        properties.id = ember$data$lib$system$store$$coerceId(properties.id);

        var record = this.buildRecord(typeClass, properties.id);

        // Move the record out of its initial `empty` state into
        // the `loaded` state.
        record.loadedData();

        // Set the properties specified on the record.
        record.setProperties(properties);

        record.eachRelationship(function(key, descriptor) {
          record._relationships[key].setHasData(true);
        });

        return record;
      },

      /**
        If possible, this method asks the adapter to generate an ID for
        a newly created record.

        @method _generateId
        @private
        @param {String} typeKey
        @param {Object} properties from the new record
        @return {String} if the adapter can generate one, an ID
      */
      _generateId: function(typeKey, properties) {
        var adapter = this.adapterFor(typeKey);

        if (adapter && adapter.generateIdForRecord) {
          return adapter.generateIdForRecord(this, typeKey, properties);
        }

        return null;
      },

      // .................
      // . DELETE RECORD .
      // .................

      /**
        For symmetry, a record can be deleted via the store.

        Example

        ```javascript
        var post = store.createRecord('post', {
          title: "Rails is omakase"
        });

        store.deleteRecord(post);
        ```

        @method deleteRecord
        @param {DS.Model} record
      */
      deleteRecord: function(record) {
        record.deleteRecord();
      },

      /**
        For symmetry, a record can be unloaded via the store. Only
        non-dirty records can be unloaded.

        Example

        ```javascript
        store.find('post', 1).then(function(post) {
          store.unloadRecord(post);
        });
        ```

        @method unloadRecord
        @param {DS.Model} record
      */
      unloadRecord: function(record) {
        record.unloadRecord();
      },

      // ................
      // . FIND RECORDS .
      // ................

      /**
        This is the main entry point into finding records. The first parameter to
        this method is the model's name as a string.

        ---

        To find a record by ID, pass the `id` as the second parameter:

        ```javascript
        store.find('person', 1);
        ```

        The `find` method will always return a **promise** that will be resolved
        with the record. If the record was already in the store, the promise will
        be resolved immediately. Otherwise, the store will ask the adapter's `find`
        method to find the necessary data.

        The `find` method will always resolve its promise with the same object for
        a given type and `id`.

        ---

        You can optionally `preload` specific attributes and relationships that you know of
        by passing them as the third argument to find.

        For example, if your Ember route looks like `/posts/1/comments/2` and your API route
        for the comment also looks like `/posts/1/comments/2` if you want to fetch the comment
        without fetching the post you can pass in the post to the `find` call:

        ```javascript
        store.find('comment', 2, {post: 1});
        ```

        If you have access to the post model you can also pass the model itself:

        ```javascript
        store.find('post', 1).then(function (myPostModel) {
          store.find('comment', 2, {post: myPostModel});
        });
        ```

        This way, your adapter's `find` or `buildURL` method will be able to look up the
        relationship on the record and construct the nested URL without having to first
        fetch the post.

        ---

        To find all records for a type, call `find` with no additional parameters:

        ```javascript
        store.find('person');
        ```

        This will ask the adapter's `findAll` method to find the records for the
        given type, and return a promise that will be resolved once the server
        returns the values. The promise will resolve into all records of this type
        present in the store, even if the server only returns a subset of them.

        ---

        To find a record by a query, call `find` with a hash as the second
        parameter:

        ```javascript
        store.find('person', { page: 1 });
        ```

        By passing an object `{page: 1}` as an argument to the find method, it
        delegates to the adapter's findQuery method. The adapter then makes
        a call to the server, transforming the object `{page: 1}` as parameters
        that are sent along, and will return a RecordArray when the promise
        resolves.

        Exposing queries this way seems preferable to creating an abstract query
        language for all server-side queries, and then require all adapters to
        implement them.

        The call made to the server, using a Rails backend, will look something like this:

        ```
        Started GET "/api/v1/person?page=1"
        Processing by Api::V1::PersonsController#index as HTML
        Parameters: {"page"=>"1"}
        ```

        If you do something like this:

        ```javascript
        store.find('person', {ids: [1, 2, 3]});
        ```

        The call to the server, using a Rails backend, will look something like this:

        ```
        Started GET "/api/v1/person?ids%5B%5D=1&ids%5B%5D=2&ids%5B%5D=3"
        Processing by Api::V1::PersonsController#index as HTML
        Parameters: {"ids"=>["1", "2", "3"]}
        ```

        @method find
        @param {String} typeKey
        @param {Object|String|Integer|null} id
        @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
        @return {Promise} promise
      */
      find: function(typeKey, id, preload) {
        Ember.assert("You need to pass a type to the store's find method", arguments.length >= 1);
        Ember.assert("You may not pass `" + id + "` as id to the store's find method", arguments.length === 1 || !Ember.isNone(id));

        if (arguments.length === 1) {
          return this.findAll(typeKey);
        }

        // We are passed a query instead of an id.
        if (Ember.typeOf(id) === 'object') {
          return this.findQuery(typeKey, id);
        }

        return this.findById(typeKey, ember$data$lib$system$store$$coerceId(id), preload);
      },

      /**
        This method returns a fresh record for a given type and id combination.

        If a record is available for the given type/id combination, then
        it will fetch this record from the store and call `reload()` on it.
        That will fire a request to server and return a promise that will
        resolve once the record has been reloaded.
        If there's no record corresponding in the store it will simply call
        `store.find`.

        Example

        ```javascript
        App.PostRoute = Ember.Route.extend({
          model: function(params) {
            return this.store.fetchById('post', params.post_id);
          }
        });
        ```

        @method fetchById
        @param {String} typeKey
        @param {String|Integer} id
        @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
        @return {Promise} promise
      */
      fetchById: function(typeKey, id, preload) {
        if (this.hasRecordForId(typeKey, id)) {
          return this.getById(typeKey, id).reload();
        } else {
          return this.find(typeKey, id, preload);
        }
      },

      /**
        This method returns a fresh collection from the server, regardless of if there is already records
        in the store or not.

        @method fetchAll
        @param {String} typeKey
        @return {Promise} promise
      */
      fetchAll: function(typeKey) {
        var typeClass = this.modelFor(typeKey);

        return this._fetchAll(typeClass, this.all(typeKey));
      },

      /**
        @method fetch
        @param {String} typeKey
        @param {String|Integer} id
        @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
        @return {Promise} promise
        @deprecated Use [fetchById](#method_fetchById) instead
      */
      fetch: function(typeKey, id, preload) {
        Ember.deprecate('Using store.fetch() has been deprecated. Use store.fetchById for fetching individual records or store.fetchAll for collections');
        return this.fetchById(typeKey, id, preload);
      },

      /**
        This method returns a record for a given type and id combination.

        @method findById
        @private
        @param {String} typeKey
        @param {String|Integer} id
        @param {Object} preload - optional set of attributes and relationships passed in either as IDs or as actual models
        @return {Promise} promise
      */
      findById: function(typeKey, id, preload) {

        var typeClass = this.modelFor(typeKey);
        var record = this.recordForId(typeClass, id);

        return this._findByRecord(record, preload);
      },

      _findByRecord: function(record, preload) {
        var fetchedRecord;

        if (preload) {
          record._preloadData(preload);
        }

        if (ember$data$lib$system$store$$get(record, 'isEmpty')) {
          fetchedRecord = this.scheduleFetch(record);
          //TODO double check about reloading
        } else if (ember$data$lib$system$store$$get(record, 'isLoading')) {
          fetchedRecord = record._loadingPromise;
        }

        return ember$data$lib$system$promise$proxies$$promiseObject(fetchedRecord || record, "DS: Store#findByRecord " + record.typeKey + " with id: " + ember$data$lib$system$store$$get(record, 'id'));
      },

      /**
        This method makes a series of requests to the adapter's `find` method
        and returns a promise that resolves once they are all loaded.

        @private
        @method findByIds
        @param {String} typeKey
        @param {Array} ids
        @return {Promise} promise
      */
      findByIds: function(typeKey, ids) {
        var store = this;

        return ember$data$lib$system$promise$proxies$$promiseArray(Ember.RSVP.all(ember$data$lib$system$store$$map(ids, function(id) {
          return store.findById(typeKey, id);
        })).then(Ember.A, null, "DS: Store#findByIds of " + typeKey + " complete"));
      },

      /**
        This method is called by `findById` if it discovers that a particular
        type/id pair hasn't been loaded yet to kick off a request to the
        adapter.

        @method fetchRecord
        @private
        @param {DS.Model} record
        @return {Promise} promise
      */
      fetchRecord: function(record) {
        var typeClass = record.constructor;
        var id = ember$data$lib$system$store$$get(record, 'id');
        var adapter = this.adapterFor(typeClass);

        Ember.assert("You tried to find a record but you have no adapter (for " + typeClass + ")", adapter);
        Ember.assert("You tried to find a record but your adapter (for " + typeClass + ") does not implement 'find'", typeof adapter.find === 'function');

        var promise = ember$data$lib$system$store$finders$$_find(adapter, this, typeClass, id, record);
        return promise;
      },

      scheduleFetchMany: function(records) {
        return ember$data$lib$system$store$$Promise.all(ember$data$lib$system$store$$map(records, this.scheduleFetch, this));
      },

      scheduleFetch: function(record) {
        var typeClass = record.constructor;
        if (ember$data$lib$system$store$$isNone(record)) { return null; }
        if (record._loadingPromise) { return record._loadingPromise; }

        var resolver = Ember.RSVP.defer('Fetching ' + typeClass + 'with id: ' + record.get('id'));
        var recordResolverPair = {
          record: record,
          resolver: resolver
        };
        var promise = resolver.promise;

        record.loadingData(promise);

        if (!this._pendingFetch.get(typeClass)) {
          this._pendingFetch.set(typeClass, [recordResolverPair]);
        } else {
          this._pendingFetch.get(typeClass).push(recordResolverPair);
        }
        Ember.run.scheduleOnce('afterRender', this, this.flushAllPendingFetches);

        return promise;
      },

      flushAllPendingFetches: function() {
        if (this.isDestroyed || this.isDestroying) {
          return;
        }

        this._pendingFetch.forEach(this._flushPendingFetchForType, this);
        this._pendingFetch = ember$data$lib$system$map$$Map.create();
      },

      _flushPendingFetchForType: function (recordResolverPairs, typeClass) {
        var store = this;
        var adapter = store.adapterFor(typeClass);
        var shouldCoalesce = !!adapter.findMany && adapter.coalesceFindRequests;
        var records = Ember.A(recordResolverPairs).mapBy('record');

        function _fetchRecord(recordResolverPair) {
          recordResolverPair.resolver.resolve(store.fetchRecord(recordResolverPair.record));
        }

        function resolveFoundRecords(records) {
          ember$data$lib$system$store$$forEach(records, function(record) {
            var pair = Ember.A(recordResolverPairs).findBy('record', record);
            if (pair) {
              var resolver = pair.resolver;
              resolver.resolve(record);
            }
          });
          return records;
        }

        function makeMissingRecordsRejector(requestedRecords) {
          return function rejectMissingRecords(resolvedRecords) {
            resolvedRecords = Ember.A(resolvedRecords);
            var missingRecords = requestedRecords.reject(function(record) {
              return resolvedRecords.contains(record);
            });
            if (missingRecords.length) {
              Ember.warn('Ember Data expected to find records with the following ids in the adapter response but they were missing: ' + Ember.inspect(Ember.A(missingRecords).mapBy('id')), false);
            }
            rejectRecords(missingRecords);
          };
        }

        function makeRecordsRejector(records) {
          return function (error) {
            rejectRecords(records, error);
          };
        }

        function rejectRecords(records, error) {
          ember$data$lib$system$store$$forEach(records, function(record) {
            var pair = Ember.A(recordResolverPairs).findBy('record', record);
            if (pair) {
              var resolver = pair.resolver;
              resolver.reject(error);
            }
          });
        }

        if (recordResolverPairs.length === 1) {
          _fetchRecord(recordResolverPairs[0]);
        } else if (shouldCoalesce) {

          // TODO: Improve records => snapshots => records => snapshots
          //
          // We want to provide records to all store methods and snapshots to all
          // adapter methods. To make sure we're doing that we're providing an array
          // of snapshots to adapter.groupRecordsForFindMany(), which in turn will
          // return grouped snapshots instead of grouped records.
          //
          // But since the _findMany() finder is a store method we need to get the
          // records from the grouped snapshots even though the _findMany() finder
          // will once again convert the records to snapshots for adapter.findMany()

          var snapshots = Ember.A(records).invoke('_createSnapshot');
          var groups = adapter.groupRecordsForFindMany(this, snapshots);
          ember$data$lib$system$store$$forEach(groups, function (groupOfSnapshots) {
            var groupOfRecords = Ember.A(groupOfSnapshots).mapBy('record');
            var requestedRecords = Ember.A(groupOfRecords);
            var ids = requestedRecords.mapBy('id');
            if (ids.length > 1) {
              ember$data$lib$system$store$finders$$_findMany(adapter, store, typeClass, ids, requestedRecords).
                then(resolveFoundRecords).
                then(makeMissingRecordsRejector(requestedRecords)).
                then(null, makeRecordsRejector(requestedRecords));
            } else if (ids.length === 1) {
              var pair = Ember.A(recordResolverPairs).findBy('record', groupOfRecords[0]);
              _fetchRecord(pair);
            } else {
              Ember.assert("You cannot return an empty array from adapter's method groupRecordsForFindMany", false);
            }
          });
        } else {
          ember$data$lib$system$store$$forEach(recordResolverPairs, _fetchRecord);
        }
      },

      /**
        Get a record by a given type and ID without triggering a fetch.

        This method will synchronously return the record if it is available in the store,
        otherwise it will return `null`. A record is available if it has been fetched earlier, or
        pushed manually into the store.

        _Note: This is an synchronous method and does not return a promise._

        ```js
        var post = store.getById('post', 1);

        post.get('id'); // 1
        ```

        @method getById
        @param {String or subclass of DS.Model} type
        @param {String|Integer} id
        @return {DS.Model|null} record
      */
      getById: function(type, id) {
        if (this.hasRecordForId(type, id)) {
          return this.recordForId(type, id);
        } else {
          return null;
        }
      },

      /**
        This method is called by the record's `reload` method.

        This method calls the adapter's `find` method, which returns a promise. When
        **that** promise resolves, `reloadRecord` will resolve the promise returned
        by the record's `reload`.

        @method reloadRecord
        @private
        @param {DS.Model} record
        @return {Promise} promise
      */
      reloadRecord: function(record) {
        var type = record.constructor;
        var adapter = this.adapterFor(type);
        var id = ember$data$lib$system$store$$get(record, 'id');

        Ember.assert("You cannot reload a record without an ID", id);
        Ember.assert("You tried to reload a record but you have no adapter (for " + type + ")", adapter);
        Ember.assert("You tried to reload a record but your adapter does not implement `find`", typeof adapter.find === 'function');

        return this.scheduleFetch(record);
      },

      /**
        Returns true if a record for a given type and ID is already loaded.

        @method hasRecordForId
        @param {String or subclass of DS.Model} type
        @param {String|Integer} id
        @return {Boolean}
      */
      hasRecordForId: function(typeKey, inputId) {
        var typeClass = this.modelFor(typeKey);
        var id = ember$data$lib$system$store$$coerceId(inputId);
        var record = this.typeMapFor(typeClass).idToRecord[id];
        return !!record && ember$data$lib$system$store$$get(record, 'isLoaded');
      },

      /**
        Returns id record for a given type and ID. If one isn't already loaded,
        it builds a new record and leaves it in the `empty` state.

        @method recordForId
        @private
        @param {String} typeKey
        @param {String|Integer} id
        @return {DS.Model} record
      */
      recordForId: function(typeKey, inputId) {
        var typeClass = this.modelFor(typeKey);
        var id = ember$data$lib$system$store$$coerceId(inputId);
        var idToRecord = this.typeMapFor(typeClass).idToRecord;
        var record = idToRecord[id];

        if (!record || !idToRecord[id]) {
          record = this.buildRecord(typeClass, id);
        }

        return record;
      },

      /**
        @method findMany
        @private
        @param {DS.Model} owner
        @param {Array} records
        @param {String or subclass of DS.Model} type
        @param {Resolver} resolver
        @return {Promise} promise
      */
      findMany: function(records) {
        var store = this;
        return ember$data$lib$system$store$$Promise.all(ember$data$lib$system$store$$map(records, function(record) {
          return store._findByRecord(record);
        }));
      },


      /**
        If a relationship was originally populated by the adapter as a link
        (as opposed to a list of IDs), this method is called when the
        relationship is fetched.

        The link (which is usually a URL) is passed through unchanged, so the
        adapter can make whatever request it wants.

        The usual use-case is for the server to register a URL as a link, and
        then use that URL in the future to make a request for the relationship.

        @method findHasMany
        @private
        @param {DS.Model} owner
        @param {any} link
        @param {String or subclass of DS.Model} type
        @return {Promise} promise
      */
      findHasMany: function(owner, link, type) {
        var adapter = this.adapterFor(owner.constructor);

        Ember.assert("You tried to load a hasMany relationship but you have no adapter (for " + owner.constructor + ")", adapter);
        Ember.assert("You tried to load a hasMany relationship from a specified `link` in the original payload but your adapter does not implement `findHasMany`", typeof adapter.findHasMany === 'function');

        return ember$data$lib$system$store$finders$$_findHasMany(adapter, this, owner, link, type);
      },

      /**
        @method findBelongsTo
        @private
        @param {DS.Model} owner
        @param {any} link
        @param {Relationship} relationship
        @return {Promise} promise
      */
      findBelongsTo: function(owner, link, relationship) {
        var adapter = this.adapterFor(owner.constructor);

        Ember.assert("You tried to load a belongsTo relationship but you have no adapter (for " + owner.constructor + ")", adapter);
        Ember.assert("You tried to load a belongsTo relationship from a specified `link` in the original payload but your adapter does not implement `findBelongsTo`", typeof adapter.findBelongsTo === 'function');

        return ember$data$lib$system$store$finders$$_findBelongsTo(adapter, this, owner, link, relationship);
      },

      /**
        This method delegates a query to the adapter. This is the one place where
        adapter-level semantics are exposed to the application.

        Exposing queries this way seems preferable to creating an abstract query
        language for all server-side queries, and then require all adapters to
        implement them.

        This method returns a promise, which is resolved with a `RecordArray`
        once the server returns.

        @method findQuery
        @private
        @param {String or subclass of DS.Model} type
        @param {any} query an opaque query to be used by the adapter
        @return {Promise} promise
      */
      findQuery: function(typeName, query) {
        var type = this.modelFor(typeName);
        var array = this.recordArrayManager
          .createAdapterPopulatedRecordArray(type, query);

        var adapter = this.adapterFor(type);

        Ember.assert("You tried to load a query but you have no adapter (for " + type + ")", adapter);
        Ember.assert("You tried to load a query but your adapter does not implement `findQuery`", typeof adapter.findQuery === 'function');

        return ember$data$lib$system$promise$proxies$$promiseArray(ember$data$lib$system$store$finders$$_findQuery(adapter, this, type, query, array));
      },

      /**
        This method returns an array of all records adapter can find.
        It triggers the adapter's `findAll` method to give it an opportunity to populate
        the array with records of that type.

        @method findAll
        @private
        @param {String} typeKey
        @return {DS.AdapterPopulatedRecordArray}
      */
      findAll: function(typeKey) {
        return this.fetchAll(typeKey);
      },

      /**
        @method _fetchAll
        @private
        @param {DS.Model} typeClass
        @param {DS.RecordArray} array
        @return {Promise} promise
      */
      _fetchAll: function(typeClass, array) {
        var adapter = this.adapterFor(typeClass);
        var sinceToken = this.typeMapFor(typeClass).metadata.since;

        ember$data$lib$system$store$$set(array, 'isUpdating', true);

        Ember.assert("You tried to load all records but you have no adapter (for " + typeClass + ")", adapter);
        Ember.assert("You tried to load all records but your adapter does not implement `findAll`", typeof adapter.findAll === 'function');

        return ember$data$lib$system$promise$proxies$$promiseArray(ember$data$lib$system$store$finders$$_findAll(adapter, this, typeClass, sinceToken));
      },

      /**
        @method didUpdateAll
        @param {DS.Model} typeClass
      */
      didUpdateAll: function(typeClass) {
        var findAllCache = this.typeMapFor(typeClass).findAllCache;
        ember$data$lib$system$store$$set(findAllCache, 'isUpdating', false);
      },

      /**
        This method returns a filtered array that contains all of the
        known records for a given type in the store.

        Note that because it's just a filter, the result will contain any
        locally created records of the type, however, it will not make a
        request to the backend to retrieve additional records. If you
        would like to request all the records from the backend please use
        [store.find](#method_find).

        Also note that multiple calls to `all` for a given type will always
        return the same `RecordArray`.

        Example

        ```javascript
        var localPosts = store.all('post');
        ```

        @method all
        @param {String} typeKey
        @return {DS.RecordArray}
      */
      all: function(typeKey) {
        var typeClass = this.modelFor(typeKey);
        var typeMap = this.typeMapFor(typeClass);
        var findAllCache = typeMap.findAllCache;

        if (findAllCache) {
          this.recordArrayManager.updateFilter(findAllCache, typeClass);
          return findAllCache;
        }

        var array = this.recordArrayManager.createRecordArray(typeClass);

        typeMap.findAllCache = array;
        return array;
      },

      /**
       This method unloads all records in the store.

       Optionally you can pass a type which unload all records for a given type.

       ```javascript
       store.unloadAll();
       store.unloadAll('post');
       ```

       @method unloadAll
       @param {String} optional typeKey
      */
      unloadAll: function(typeKey) {
        if (arguments.length === 0) {
          var typeMaps = this.typeMaps;
          var keys = Ember.keys(typeMaps);

          var types = ember$data$lib$system$store$$map(keys, byType);

          ember$data$lib$system$store$$forEach(types, this.unloadAll, this);
        } else {
          var typeClass = this.modelFor(typeKey);
          var typeMap = this.typeMapFor(typeClass);
          var records = typeMap.records.slice();
          var record;

          for (var i = 0; i < records.length; i++) {
            record = records[i];
            record.unloadRecord();
            record.destroy(); // maybe within unloadRecord
          }

          typeMap.findAllCache = null;
          typeMap.metadata = Ember.create(null);
        }

        function byType(entry) {
          return typeMaps[entry]['type'];
        }
      },

      /**
        Takes a type and filter function, and returns a live RecordArray that
        remains up to date as new records are loaded into the store or created
        locally.

        The filter function takes a materialized record, and returns true
        if the record should be included in the filter and false if it should
        not.

        Example

        ```javascript
        store.filter('post', function(post) {
          return post.get('unread');
        });
        ```

        The filter function is called once on all records for the type when
        it is created, and then once on each newly loaded or created record.

        If any of a record's properties change, or if it changes state, the
        filter function will be invoked again to determine whether it should
        still be in the array.

        Optionally you can pass a query, which is the equivalent of calling
        [find](#method_find) with that same query, to fetch additional records
        from the server. The results returned by the server could then appear
        in the filter if they match the filter function.

        The query itself is not used to filter records, it's only sent to your
        server for you to be able to do server-side filtering. The filter
        function will be applied on the returned results regardless.

        Example

        ```javascript
        store.filter('post', { unread: true }, function(post) {
          return post.get('unread');
        }).then(function(unreadPosts) {
          unreadPosts.get('length'); // 5
          var unreadPost = unreadPosts.objectAt(0);
          unreadPost.set('unread', false);
          unreadPosts.get('length'); // 4
        });
        ```

        @method filter
        @param {String or subclass of DS.Model} type
        @param {Object} query optional query
        @param {Function} filter
        @return {DS.PromiseArray}
      */
      filter: function(type, query, filter) {
        var promise;
        var length = arguments.length;
        var array;
        var hasQuery = length === 3;

        // allow an optional server query
        if (hasQuery) {
          promise = this.findQuery(type, query);
        } else if (arguments.length === 2) {
          filter = query;
        }

        type = this.modelFor(type);

        if (hasQuery) {
          array = this.recordArrayManager.createFilteredRecordArray(type, filter, query);
        } else {
          array = this.recordArrayManager.createFilteredRecordArray(type, filter);
        }

        promise = promise || ember$data$lib$system$store$$Promise.cast(array);

        return ember$data$lib$system$promise$proxies$$promiseArray(promise.then(function() {
          return array;
        }, null, "DS: Store#filter of " + type));
      },

      /**
        This method returns if a certain record is already loaded
        in the store. Use this function to know beforehand if a find()
        will result in a request or that it will be a cache hit.

         Example

        ```javascript
        store.recordIsLoaded('post', 1); // false
        store.find('post', 1).then(function() {
          store.recordIsLoaded('post', 1); // true
        });
        ```

        @method recordIsLoaded
        @param {String or subclass of DS.Model} type
        @param {string} id
        @return {boolean}
      */
      recordIsLoaded: function(type, id) {
        if (!this.hasRecordForId(type, id)) { return false; }
        return !ember$data$lib$system$store$$get(this.recordForId(type, id), 'isEmpty');
      },

      /**
        This method returns the metadata for a specific type.

        @method metadataFor
        @param {String or subclass of DS.Model} typeName
        @return {object}
      */
      metadataFor: function(typeName) {
        var typeClass = this.modelFor(typeName);
        return this.typeMapFor(typeClass).metadata;
      },

      /**
        This method sets the metadata for a specific type.

        @method setMetadataFor
        @param {String or subclass of DS.Model} typeName
        @param {Object} metadata metadata to set
        @return {object}
      */
      setMetadataFor: function(typeName, metadata) {
        var typeClass = this.modelFor(typeName);
        Ember.merge(this.typeMapFor(typeClass).metadata, metadata);
      },

      // ............
      // . UPDATING .
      // ............

      /**
        If the adapter updates attributes the record will notify
        the store to update its  membership in any filters.
        To avoid thrashing, this method is invoked only once per
        run loop per record.

        @method dataWasUpdated
        @private
        @param {Class} type
        @param {DS.Model} record
      */
      dataWasUpdated: function(type, record) {
        this.recordArrayManager.recordDidChange(record);
      },

      // ..............
      // . PERSISTING .
      // ..............

      /**
        This method is called by `record.save`, and gets passed a
        resolver for the promise that `record.save` returns.

        It schedules saving to happen at the end of the run loop.

        @method scheduleSave
        @private
        @param {DS.Model} record
        @param {Resolver} resolver
      */
      scheduleSave: function(record, resolver) {
        record.adapterWillCommit();
        this._pendingSave.push([record, resolver]);
        ember$data$lib$system$store$$once(this, 'flushPendingSave');
      },

      /**
        This method is called at the end of the run loop, and
        flushes any records passed into `scheduleSave`

        @method flushPendingSave
        @private
      */
      flushPendingSave: function() {
        var pending = this._pendingSave.slice();
        this._pendingSave = [];

        ember$data$lib$system$store$$forEach(pending, function(tuple) {
          var record = tuple[0];
          var resolver = tuple[1];
          var adapter = this.adapterFor(record.constructor);
          var operation;

          if (ember$data$lib$system$store$$get(record, 'currentState.stateName') === 'root.deleted.saved') {
            return resolver.resolve(record);
          } else if (ember$data$lib$system$store$$get(record, 'isNew')) {
            operation = 'createRecord';
          } else if (ember$data$lib$system$store$$get(record, 'isDeleted')) {
            operation = 'deleteRecord';
          } else {
            operation = 'updateRecord';
          }

          resolver.resolve(ember$data$lib$system$store$$_commit(adapter, this, operation, record));
        }, this);
      },

      /**
        This method is called once the promise returned by an
        adapter's `createRecord`, `updateRecord` or `deleteRecord`
        is resolved.

        If the data provides a server-generated ID, it will
        update the record and the store's indexes.

        @method didSaveRecord
        @private
        @param {DS.Model} record the in-flight record
        @param {Object} data optional data (see above)
      */
      didSaveRecord: function(record, data) {
        if (data) {
          // normalize relationship IDs into records
          this._backburner.schedule('normalizeRelationships', this, '_setupRelationships', record, record.constructor, data);
          this.updateId(record, data);
        }

        //We first make sure the primary data has been updated
        //TODO try to move notification to the user to the end of the runloop
        record.adapterDidCommit(data);
      },

      /**
        This method is called once the promise returned by an
        adapter's `createRecord`, `updateRecord` or `deleteRecord`
        is rejected with a `DS.InvalidError`.

        @method recordWasInvalid
        @private
        @param {DS.Model} record
        @param {Object} errors
      */
      recordWasInvalid: function(record, errors) {
        record.adapterDidInvalidate(errors);
      },

      /**
        This method is called once the promise returned by an
        adapter's `createRecord`, `updateRecord` or `deleteRecord`
        is rejected (with anything other than a `DS.InvalidError`).

        @method recordWasError
        @private
        @param {DS.Model} record
      */
      recordWasError: function(record) {
        record.adapterDidError();
      },

      /**
        When an adapter's `createRecord`, `updateRecord` or `deleteRecord`
        resolves with data, this method extracts the ID from the supplied
        data.

        @method updateId
        @private
        @param {DS.Model} record
        @param {Object} data
      */
      updateId: function(record, data) {
        var oldId = ember$data$lib$system$store$$get(record, 'id');
        var id = ember$data$lib$system$store$$coerceId(data.id);

        Ember.assert("An adapter cannot assign a new id to a record that already has an id. " + record + " had id: " + oldId + " and you tried to update it with " + id + ". This likely happened because your server returned data in response to a find or update that had a different id than the one you sent.", oldId === null || id === oldId);

        this.typeMapFor(record.constructor).idToRecord[id] = record;

        ember$data$lib$system$store$$set(record, 'id', id);
      },

      /**
        Returns a map of IDs to client IDs for a given type.

        @method typeMapFor
        @private
        @param {subclass of DS.Model} typeClass
        @return {Object} typeMap
      */
      typeMapFor: function(typeClass) {
        var typeMaps = ember$data$lib$system$store$$get(this, 'typeMaps');
        var guid = Ember.guidFor(typeClass);
        var typeMap = typeMaps[guid];

        if (typeMap) { return typeMap; }

        typeMap = {
          idToRecord: Ember.create(null),
          records: [],
          metadata: Ember.create(null),
          type: typeClass
        };

        typeMaps[guid] = typeMap;

        return typeMap;
      },

      // ................
      // . LOADING DATA .
      // ................

      /**
        This internal method is used by `push`.

        @method _load
        @private
        @param {String or subclass of DS.Model} type
        @param {Object} data
      */
      _load: function(type, data) {
        var id = ember$data$lib$system$store$$coerceId(data.id);
        var record = this.recordForId(type, id);

        record.setupData(data);
        this.recordArrayManager.recordDidChange(record);

        return record;
      },

      /*
        In case someone defined a relationship to a mixin, for example:
        ```
          var Comment = DS.Model.extend({
            owner: belongsTo('commentable'. { polymorphic: true})
          });
          var Commentable = Ember.Mixin.create({
            comments: hasMany('comment')
          });
        ```
        we want to look up a Commentable class which has all the necessary
        relationship metadata. Thus, we look up the mixin and create a mock
        DS.Model, so we can access the relationship CPs of the mixin (`comments`)
        in this case
      */

      _modelForMixin: function(key) {
        var registry = this.container._registry ? this.container._registry : this.container;
        var mixin = registry.resolve('mixin:' + key);
        if (mixin) {
          //Cache the class as a model
          registry.register('model:' + key, DS.Model.extend(mixin));
        }
        var factory = this.modelFactoryFor(key);
        if (factory) {
          factory.__isMixin = true;
          factory.__mixin = mixin;
        }

        return factory;
      },

      /**
        Returns a model class for a particular key. Used by
        methods that take a type key (like `find`, `createRecord`,
        etc.)

        @method modelFor
        @param {String or subclass of DS.Model} key
        @return {subclass of DS.Model}
      */
      modelFor: function(key) {
        var factory;

        if (typeof key === 'string') {
          factory = this.modelFactoryFor(key);
          if (!factory) {
            //Support looking up mixins as base types for polymorphic relationships
            factory = this._modelForMixin(key);
          }
          if (!factory) {
            throw new Ember.Error("No model was found for '" + key + "'");
          }
          factory.typeKey = factory.typeKey || this._normalizeTypeKey(key);
        } else {
          // A factory already supplied. Ensure it has a normalized key.
          factory = key;
          if (factory.typeKey) {
            factory.typeKey = this._normalizeTypeKey(factory.typeKey);
          }
        }

        factory.store = this;
        return factory;
      },

      modelFactoryFor: function(key) {
        return this.container.lookupFactory('model:' + key);
      },

      /**
        Push some data for a given type into the store.

        This method expects normalized data:

        * The ID is a key named `id` (an ID is mandatory)
        * The names of attributes are the ones you used in
          your model's `DS.attr`s.
        * Your relationships must be:
          * represented as IDs or Arrays of IDs
          * represented as model instances
          * represented as URLs, under the `links` key

        For this model:

        ```js
        App.Person = DS.Model.extend({
          firstName: DS.attr(),
          lastName: DS.attr(),

          children: DS.hasMany('person')
        });
        ```

        To represent the children as IDs:

        ```js
        {
          id: 1,
          firstName: "Tom",
          lastName: "Dale",
          children: [1, 2, 3]
        }
        ```

        To represent the children relationship as a URL:

        ```js
        {
          id: 1,
          firstName: "Tom",
          lastName: "Dale",
          links: {
            children: "/people/1/children"
          }
        }
        ```

        If you're streaming data or implementing an adapter, make sure
        that you have converted the incoming data into this form. The
        store's [normalize](#method_normalize) method is a convenience
        helper for converting a json payload into the form Ember Data
        expects.

        ```js
        store.push('person', store.normalize('person', data));
        ```

        This method can be used both to push in brand new
        records, as well as to update existing records.

        @method push
        @param {String or subclass of DS.Model} type
        @param {Object} data
        @return {DS.Model} the record that was created or
          updated.
      */
      push: function(typeName, data) {
        Ember.assert("Expected an object as `data` in a call to `push` for " + typeName + " , but was " + data, Ember.typeOf(data) === 'object');
        Ember.assert("You must include an `id` for " + typeName + " in an object passed to `push`", data.id != null && data.id !== '');

        var type = this.modelFor(typeName);
        var filter = Ember.EnumerableUtils.filter;

        // If Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS is set to true and the payload
        // contains unknown keys, log a warning.
        if (Ember.ENV.DS_WARN_ON_UNKNOWN_KEYS) {
          Ember.warn("The payload for '" + type.typeKey + "' contains these unknown keys: " +
            Ember.inspect(filter(Ember.keys(data), function(key) {
              return !(key === 'id' || key === 'links' || ember$data$lib$system$store$$get(type, 'fields').has(key) || key.match(/Type$/));
            })) + ". Make sure they've been defined in your model.",
            filter(Ember.keys(data), function(key) {
              return !(key === 'id' || key === 'links' || ember$data$lib$system$store$$get(type, 'fields').has(key) || key.match(/Type$/));
            }).length === 0
          );
        }

        // Actually load the record into the store.

        this._load(type, data);

        var record = this.recordForId(type, data.id);
        var store = this;

        this._backburner.join(function() {
          store._backburner.schedule('normalizeRelationships', store, '_setupRelationships', record, type, data);
        });

        return record;
      },

      _setupRelationships: function(record, type, data) {
        // If the payload contains relationships that are specified as
        // IDs, normalizeRelationships will convert them into DS.Model instances
        // (possibly unloaded) before we push the payload into the
        // store.

        data = ember$data$lib$system$store$$normalizeRelationships(this, type, data);


        // Now that the pushed record as well as any related records
        // are in the store, create the data structures used to track
        // relationships.
        ember$data$lib$system$store$$setupRelationships(this, record, data);
      },

      /**
        Push some raw data into the store.

        This method can be used both to push in brand new
        records, as well as to update existing records. You
        can push in more than one type of object at once.
        All objects should be in the format expected by the
        serializer.

        ```js
        App.ApplicationSerializer = DS.ActiveModelSerializer;

        var pushData = {
          posts: [
            {id: 1, post_title: "Great post", comment_ids: [2]}
          ],
          comments: [
            {id: 2, comment_body: "Insightful comment"}
          ]
        }

        store.pushPayload(pushData);
        ```

        By default, the data will be deserialized using a default
        serializer (the application serializer if it exists).

        Alternatively, `pushPayload` will accept a model type which
        will determine which serializer will process the payload.
        However, the serializer itself (processing this data via
        `normalizePayload`) will not know which model it is
        deserializing.

        ```js
        App.ApplicationSerializer = DS.ActiveModelSerializer;
        App.PostSerializer = DS.JSONSerializer;
        store.pushPayload('comment', pushData); // Will use the ApplicationSerializer
        store.pushPayload('post', pushData); // Will use the PostSerializer
        ```

        @method pushPayload
        @param {String} type Optionally, a model used to determine which serializer will be used
        @param {Object} payload
      */
      pushPayload: function (type, inputPayload) {
        var serializer;
        var payload;
        if (!inputPayload) {
          payload = type;
          serializer = ember$data$lib$system$store$$defaultSerializer(this.container);
          Ember.assert("You cannot use `store#pushPayload` without a type unless your default serializer defines `pushPayload`", typeof serializer.pushPayload === 'function');
        } else {
          payload = inputPayload;
          serializer = this.serializerFor(type);
        }
        var store = this;
        this._adapterRun(function() {
          serializer.pushPayload(store, payload);
        });
      },

      /**
        `normalize` converts a json payload into the normalized form that
        [push](#method_push) expects.

        Example

        ```js
        socket.on('message', function(message) {
          var modelName = message.model;
          var data = message.data;
          store.push(modelName, store.normalize(modelName, data));
        });
        ```

        @method normalize
        @param {String} type The name of the model type for this payload
        @param {Object} payload
        @return {Object} The normalized payload
      */
      normalize: function (type, payload) {
        var serializer = this.serializerFor(type);
        var model = this.modelFor(type);
        return serializer.normalize(model, payload);
      },

      /**
        @method update
        @param {String} type
        @param {Object} data
        @return {DS.Model} the record that was updated.
        @deprecated Use [push](#method_push) instead
      */
      update: function(type, data) {
        Ember.deprecate('Using store.update() has been deprecated since store.push() now handles partial updates. You should use store.push() instead.');
        return this.push(type, data);
      },

      /**
        If you have an Array of normalized data to push,
        you can call `pushMany` with the Array, and it will
        call `push` repeatedly for you.

        @method pushMany
        @param {String or subclass of DS.Model} type
        @param {Array} datas
        @return {Array}
      */
      pushMany: function(type, datas) {
        var length = datas.length;
        var result = new Array(length);

        for (var i = 0; i < length; i++) {
          result[i] = this.push(type, datas[i]);
        }

        return result;
      },

      /**
        @method metaForType
        @param {String or subclass of DS.Model} typeName
        @param {Object} metadata
        @deprecated Use [setMetadataFor](#method_setMetadataFor) instead
      */
      metaForType: function(typeName, metadata) {
        Ember.deprecate('Using store.metaForType() has been deprecated. Use store.setMetadataFor() to set metadata for a specific type.');
        this.setMetadataFor(typeName, metadata);
      },

      /**
        Build a brand new record for a given type, ID, and
        initial data.

        @method buildRecord
        @private
        @param {subclass of DS.Model} type
        @param {String} id
        @param {Object} data
        @return {DS.Model} record
      */
      buildRecord: function(type, id, data) {
        var typeMap = this.typeMapFor(type);
        var idToRecord = typeMap.idToRecord;

        Ember.assert('The id ' + id + ' has already been used with another record of type ' + type.toString() + '.', !id || !idToRecord[id]);
        Ember.assert("`" + Ember.inspect(type)+ "` does not appear to be an ember-data model", (typeof type._create === 'function') );

        // lookupFactory should really return an object that creates
        // instances with the injections applied
        var record = type._create({
          id: id,
          store: this,
          container: this.container
        });

        if (data) {
          record.setupData(data);
        }

        // if we're creating an item, this process will be done
        // later, once the object has been persisted.
        if (id) {
          idToRecord[id] = record;
        }

        typeMap.records.push(record);

        return record;
      },

      //Called by the state machine to notify the store that the record is ready to be interacted with
      recordWasLoaded: function(record) {
        this.recordArrayManager.recordWasLoaded(record);
      },

      // ...............
      // . DESTRUCTION .
      // ...............

      /**
        @method dematerializeRecord
        @private
        @param {DS.Model} record
        @deprecated Use [unloadRecord](#method_unloadRecord) instead
      */
      dematerializeRecord: function(record) {
        Ember.deprecate('Using store.dematerializeRecord() has been deprecated since it was intended for private use only. You should use store.unloadRecord() instead.');
        this._dematerializeRecord(record);
      },

      /**
        When a record is destroyed, this un-indexes it and
        removes it from any record arrays so it can be GCed.

        @method _dematerializeRecord
        @private
        @param {DS.Model} record
      */
      _dematerializeRecord: function(record) {
        var type = record.constructor;
        var typeMap = this.typeMapFor(type);
        var id = ember$data$lib$system$store$$get(record, 'id');

        record.updateRecordArrays();

        if (id) {
          delete typeMap.idToRecord[id];
        }

        var loc = ember$data$lib$system$store$$indexOf(typeMap.records, record);
        typeMap.records.splice(loc, 1);
      },

      // ......................
      // . PER-TYPE ADAPTERS
      // ......................

      /**
        Returns an instance of the adapter for a given type. For
        example, `adapterFor('person')` will return an instance of
        `App.PersonAdapter`.

        If no `App.PersonAdapter` is found, this method will look
        for an `App.ApplicationAdapter` (the default adapter for
        your entire application).

        If no `App.ApplicationAdapter` is found, it will return
        the value of the `defaultAdapter`.

        @method adapterFor
        @private
        @param {String or subclass of DS.Model} type
        @return DS.Adapter
      */
      adapterFor: function(type) {
        if (type !== 'application') {
          type = this.modelFor(type);
        }

        var adapter = this.lookupAdapter(type.typeKey) || this.lookupAdapter('application');

        return adapter || ember$data$lib$system$store$$get(this, 'defaultAdapter');
      },

      _adapterRun: function (fn) {
        return this._backburner.run(fn);
      },

      // ..............................
      // . RECORD CHANGE NOTIFICATION .
      // ..............................

      /**
        Returns an instance of the serializer for a given type. For
        example, `serializerFor('person')` will return an instance of
        `App.PersonSerializer`.

        If no `App.PersonSerializer` is found, this method will look
        for an `App.ApplicationSerializer` (the default serializer for
        your entire application).

        if no `App.ApplicationSerializer` is found, it will attempt
        to get the `defaultSerializer` from the `PersonAdapter`
        (`adapterFor('person')`).

        If a serializer cannot be found on the adapter, it will fall back
        to an instance of `DS.JSONSerializer`.

        @method serializerFor
        @private
        @param {String or subclass of DS.Model} type the record to serialize
        @return {DS.Serializer}
      */
      serializerFor: function(type) {
        if (type !== 'application') {
          type = this.modelFor(type);
        }

        var serializer = this.lookupSerializer(type.typeKey) || this.lookupSerializer('application');

        if (!serializer) {
          var adapter = this.adapterFor(type);
          serializer = this.lookupSerializer(ember$data$lib$system$store$$get(adapter, 'defaultSerializer'));
        }

        if (!serializer) {
          serializer = this.lookupSerializer('-default');
        }

        return serializer;
      },

      /**
        Retrieve a particular instance from the
        container cache. If not found, creates it and
        placing it in the cache.

        Enabled a store to manage local instances of
        adapters and serializers.

        @method retrieveManagedInstance
        @private
        @param {String} type the object type
        @param {String} type the object name
        @return {Ember.Object}
      */
      retrieveManagedInstance: function(type, name) {
        var key = type+":"+name;

        if (!this._containerCache[key]) {
          var instance = this.container.lookup(key);

          if (instance) {
            ember$data$lib$system$store$$set(instance, 'store', this);
            this._containerCache[key] = instance;
          }
        }

        return this._containerCache[key];
      },

      lookupAdapter: function(name) {
        return this.retrieveManagedInstance('adapter', name);
      },

      lookupSerializer: function(name) {
        return this.retrieveManagedInstance('serializer', name);
      },

      willDestroy: function() {
        this.recordArrayManager.destroy();

        this.unloadAll();

        for (var cacheKey in this._containerCache) {
          this._containerCache[cacheKey].destroy();
          delete this._containerCache[cacheKey];
        }

        delete this._containerCache;
      },

      /**
        All typeKeys are camelCase internally. Changing this function may
        require changes to other normalization hooks (such as typeForRoot).

        @method _normalizeTypeKey
        @private
        @param {String} type
        @return {String} if the adapter can generate one, an ID
      */
      _normalizeTypeKey: function(key) {
        return ember$data$lib$system$store$$camelize(ember$inflector$lib$lib$system$string$$singularize(key));
      }
    });


    function ember$data$lib$system$store$$normalizeRelationships(store, type, data, record) {
      type.eachRelationship(function(key, relationship) {
        var kind = relationship.kind;
        var value = data[key];
        if (kind === 'belongsTo') {
          ember$data$lib$system$store$$deserializeRecordId(store, data, key, relationship, value);
        } else if (kind === 'hasMany') {
          ember$data$lib$system$store$$deserializeRecordIds(store, data, key, relationship, value);
        }
      });

      return data;
    }

    function ember$data$lib$system$store$$deserializeRecordId(store, data, key, relationship, id) {
      if (ember$data$lib$system$store$$isNone(id) || id instanceof ember$data$lib$system$model$$default) {
        return;
      }
      Ember.assert("A " + relationship.parentType + " record was pushed into the store with the value of " + key + " being " + Ember.inspect(id) + ", but " + key + " is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.", !Ember.isArray(id));

      var type;

      if (typeof id === 'number' || typeof id === 'string') {
        type = ember$data$lib$system$store$$typeFor(relationship, key, data);
        data[key] = store.recordForId(type, id);
      } else if (typeof id === 'object') {
        // hasMany polymorphic
        Ember.assert('Ember Data expected a number or string to represent the record(s) in the `' + relationship.key + '` relationship instead it found an object. If this is a polymorphic relationship please specify a `type` key. If this is an embedded relationship please include the `DS.EmbeddedRecordsMixin` and specify the `' + relationship.key +'` property in your serializer\'s attrs object.', id.type);
        data[key] = store.recordForId(id.type, id.id);
      }
    }

    function ember$data$lib$system$store$$typeFor(relationship, key, data) {
      if (relationship.options.polymorphic) {
        return data[key + "Type"];
      } else {
        return relationship.type;
      }
    }

    function ember$data$lib$system$store$$deserializeRecordIds(store, data, key, relationship, ids) {
      if (ember$data$lib$system$store$$isNone(ids)) {
        return;
      }

      Ember.assert("A " + relationship.parentType + " record was pushed into the store with the value of " + key + " being '" + Ember.inspect(ids) + "', but " + key + " is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.", Ember.isArray(ids));
      for (var i=0, l=ids.length; i<l; i++) {
        ember$data$lib$system$store$$deserializeRecordId(store, ids, i, relationship, ids[i]);
      }
    }

    // Delegation to the adapter and promise management



    function ember$data$lib$system$store$$defaultSerializer(container) {
      return container.lookup('serializer:application') ||
             container.lookup('serializer:-default');
    }

    function ember$data$lib$system$store$$_commit(adapter, store, operation, record) {
      var type = record.constructor;
      var snapshot = record._createSnapshot();
      var promise = adapter[operation](store, type, snapshot);
      var serializer = ember$data$lib$system$store$serializers$$serializerForAdapter(store, adapter, type);
      var label = "DS: Extract and notify about " + operation + " completion of " + record;

      Ember.assert("Your adapter's '" + operation + "' method must return a value, but it returned `undefined", promise !==undefined);

      promise = ember$data$lib$system$store$$Promise.cast(promise, label);
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, store));
      promise = ember$data$lib$system$store$common$$_guard(promise, ember$data$lib$system$store$common$$_bind(ember$data$lib$system$store$common$$_objectIsAlive, record));

      return promise.then(function(adapterPayload) {
        var payload;

        store._adapterRun(function() {
          if (adapterPayload) {
            payload = serializer.extract(store, type, adapterPayload, ember$data$lib$system$store$$get(record, 'id'), operation);
          }
          store.didSaveRecord(record, payload);
        });

        return record;
      }, function(reason) {
        if (reason instanceof ember$data$lib$system$model$errors$invalid$$default) {
          var errors = serializer.extractErrors(store, type, reason.errors, ember$data$lib$system$store$$get(record, 'id'));
          store.recordWasInvalid(record, errors);
          reason = new ember$data$lib$system$model$errors$invalid$$default(errors);
        } else {
          store.recordWasError(record, reason);
        }

        throw reason;
      }, label);
    }

    function ember$data$lib$system$store$$setupRelationships(store, record, data) {
      var typeClass = record.constructor;

      typeClass.eachRelationship(function(key, descriptor) {
        var kind = descriptor.kind;
        var value = data[key];
        var relationship = record._relationships[key];

        if (data.links && data.links[key]) {
          relationship.updateLink(data.links[key]);
        }

        if (value !== undefined) {
          if (kind === 'belongsTo') {
            relationship.setCanonicalRecord(value);
          } else if (kind === 'hasMany') {
            relationship.updateRecordsFromAdapter(value);
          }
        }
      });
    }

    var ember$data$lib$system$store$$default = ember$data$lib$system$store$$Store;
    function ember$data$lib$initializers$store$$initializeStore(registry, application) {
      Ember.deprecate('Specifying a custom Store for Ember Data on your global namespace as `App.Store` ' +
                      'has been deprecated. Please use `App.ApplicationStore` instead.', !(application && application.Store));

      registry.optionsForType('serializer', { singleton: false });
      registry.optionsForType('adapter', { singleton: false });

      registry.register('store:main', registry.lookupFactory('store:application') || (application && application.Store) || ember$data$lib$system$store$$default);

      // allow older names to be looked up

      var proxy = new ember$data$lib$system$container$proxy$$default(registry);
      proxy.registerDeprecations([
        { deprecated: 'serializer:_default',  valid: 'serializer:-default' },
        { deprecated: 'serializer:_rest',     valid: 'serializer:-rest' },
        { deprecated: 'adapter:_rest',        valid: 'adapter:-rest' }
      ]);

      // new go forward paths
      registry.register('serializer:-default', ember$data$lib$serializers$json$serializer$$default);
      registry.register('serializer:-rest', ember$data$lib$serializers$rest$serializer$$default);
      registry.register('adapter:-rest', ember$data$lib$adapters$rest$adapter$$default);

      // Eagerly generate the store so defaultStore is populated.
      // TODO: Do this in a finisher hook
      var store = registry.lookup('store:main');
      registry.register('service:store', store, { instantiate: false });
    }
    var ember$data$lib$initializers$store$$default = ember$data$lib$initializers$store$$initializeStore;

    var ember$data$lib$transforms$base$$default = Ember.Object.extend({
      /**
        When given a deserialized value from a record attribute this
        method must return the serialized value.

        Example

        ```javascript
        serialize: function(deserialized) {
          return Ember.isEmpty(deserialized) ? null : Number(deserialized);
        }
        ```

        @method serialize
        @param {mixed} deserialized The deserialized value
        @return {mixed} The serialized value
      */
      serialize: null,

      /**
        When given a serialize value from a JSON object this method must
        return the deserialized value for the record attribute.

        Example

        ```javascript
        deserialize: function(serialized) {
          return empty(serialized) ? null : Number(serialized);
        }
        ```

        @method deserialize
        @param {mixed} serialized The serialized value
        @return {mixed} The deserialized value
      */
      deserialize: null
    });

    var ember$data$lib$transforms$number$$empty = Ember.isEmpty;

    function ember$data$lib$transforms$number$$isNumber(value) {
      return value === value && value !== Infinity && value !== -Infinity;
    }

    var ember$data$lib$transforms$number$$default = ember$data$lib$transforms$base$$default.extend({
      deserialize: function(serialized) {
        var transformed;

        if (ember$data$lib$transforms$number$$empty(serialized)) {
          return null;
        } else {
          transformed = Number(serialized);

          return ember$data$lib$transforms$number$$isNumber(transformed) ? transformed : null;
        }
      },

      serialize: function(deserialized) {
        var transformed;

        if (ember$data$lib$transforms$number$$empty(deserialized)) {
          return null;
        } else {
          transformed = Number(deserialized);

          return ember$data$lib$transforms$number$$isNumber(transformed) ? transformed : null;
        }
      }
    });

    // Date.prototype.toISOString shim
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
    var ember$data$lib$transforms$date$$toISOString = Date.prototype.toISOString || function() {
      function pad(number) {
        if ( number < 10 ) {
          return '0' + number;
        }
        return number;
      }

      return this.getUTCFullYear() +
        '-' + pad(this.getUTCMonth() + 1) +
        '-' + pad(this.getUTCDate()) +
        'T' + pad(this.getUTCHours()) +
        ':' + pad(this.getUTCMinutes()) +
        ':' + pad(this.getUTCSeconds()) +
        '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
        'Z';
    };

    if (Ember.SHIM_ES5) {
      if (!Date.prototype.toISOString) {
        Date.prototype.toISOString = ember$data$lib$transforms$date$$toISOString;
      }
    }

    var ember$data$lib$transforms$date$$default = ember$data$lib$transforms$base$$default.extend({
      deserialize: function(serialized) {
        var type = typeof serialized;

        if (type === "string") {
          return new Date(Ember.Date.parse(serialized));
        } else if (type === "number") {
          return new Date(serialized);
        } else if (serialized === null || serialized === undefined) {
          // if the value is not present in the data,
          // return undefined, not null.
          return serialized;
        } else {
          return null;
        }
      },

      serialize: function(date) {
        if (date instanceof Date) {
          return ember$data$lib$transforms$date$$toISOString.call(date);
        } else {
          return null;
        }
      }
    });

    var ember$data$lib$transforms$string$$none = Ember.isNone;

    var ember$data$lib$transforms$string$$default = ember$data$lib$transforms$base$$default.extend({
      deserialize: function(serialized) {
        return ember$data$lib$transforms$string$$none(serialized) ? null : String(serialized);
      },
      serialize: function(deserialized) {
        return ember$data$lib$transforms$string$$none(deserialized) ? null : String(deserialized);
      }
    });

    var ember$data$lib$transforms$boolean$$default = ember$data$lib$transforms$base$$default.extend({
      deserialize: function(serialized) {
        var type = typeof serialized;

        if (type === "boolean") {
          return serialized;
        } else if (type === "string") {
          return serialized.match(/^true$|^t$|^1$/i) !== null;
        } else if (type === "number") {
          return serialized === 1;
        } else {
          return false;
        }
      },

      serialize: function(deserialized) {
        return Boolean(deserialized);
      }
    });

    function ember$data$lib$initializers$transforms$$initializeTransforms(registry) {
      registry.register('transform:boolean', ember$data$lib$transforms$boolean$$default);
      registry.register('transform:date', ember$data$lib$transforms$date$$default);
      registry.register('transform:number', ember$data$lib$transforms$number$$default);
      registry.register('transform:string', ember$data$lib$transforms$string$$default);
    }
    var ember$data$lib$initializers$transforms$$default = ember$data$lib$initializers$transforms$$initializeTransforms;
    function ember$data$lib$initializers$store$injections$$initializeStoreInjections(registry) {
      registry.injection('controller', 'store', 'store:main');
      registry.injection('route', 'store', 'store:main');
      registry.injection('data-adapter', 'store', 'store:main');
    }
    var ember$data$lib$initializers$store$injections$$default = ember$data$lib$initializers$store$injections$$initializeStoreInjections;
    var ember$data$lib$system$debug$debug$adapter$$get = Ember.get;
    var ember$data$lib$system$debug$debug$adapter$$capitalize = Ember.String.capitalize;
    var ember$data$lib$system$debug$debug$adapter$$underscore = Ember.String.underscore;

    var ember$data$lib$system$debug$debug$adapter$$default = Ember.DataAdapter.extend({
      getFilters: function() {
        return [
          { name: 'isNew', desc: 'New' },
          { name: 'isModified', desc: 'Modified' },
          { name: 'isClean', desc: 'Clean' }
        ];
      },

      detect: function(typeClass) {
        return typeClass !== ember$data$lib$system$model$$default && ember$data$lib$system$model$$default.detect(typeClass);
      },

      columnsForType: function(typeClass) {
        var columns = [{
          name: 'id',
          desc: 'Id'
        }];
        var count = 0;
        var self = this;
        ember$data$lib$system$debug$debug$adapter$$get(typeClass, 'attributes').forEach(function(meta, name) {
          if (count++ > self.attributeLimit) { return false; }
          var desc = ember$data$lib$system$debug$debug$adapter$$capitalize(ember$data$lib$system$debug$debug$adapter$$underscore(name).replace('_', ' '));
          columns.push({ name: name, desc: desc });
        });
        return columns;
      },

      getRecords: function(typeKey) {
        return this.get('store').all(typeKey);
      },

      getRecordColumnValues: function(record) {
        var self = this;
        var count = 0;
        var columnValues = { id: ember$data$lib$system$debug$debug$adapter$$get(record, 'id') };

        record.eachAttribute(function(key) {
          if (count++ > self.attributeLimit) {
            return false;
          }
          var value = ember$data$lib$system$debug$debug$adapter$$get(record, key);
          columnValues[key] = value;
        });
        return columnValues;
      },

      getRecordKeywords: function(record) {
        var keywords = [];
        var keys = Ember.A(['id']);
        record.eachAttribute(function(key) {
          keys.push(key);
        });
        keys.forEach(function(key) {
          keywords.push(ember$data$lib$system$debug$debug$adapter$$get(record, key));
        });
        return keywords;
      },

      getRecordFilterValues: function(record) {
        return {
          isNew: record.get('isNew'),
          isModified: record.get('isDirty') && !record.get('isNew'),
          isClean: !record.get('isDirty')
        };
      },

      getRecordColor: function(record) {
        var color = 'black';
        if (record.get('isNew')) {
          color = 'green';
        } else if (record.get('isDirty')) {
          color = 'blue';
        }
        return color;
      },

      observeRecord: function(record, recordUpdated) {
        var releaseMethods = Ember.A();
        var self = this;
        var keysToObserve = Ember.A(['id', 'isNew', 'isDirty']);

        record.eachAttribute(function(key) {
          keysToObserve.push(key);
        });

        keysToObserve.forEach(function(key) {
          var handler = function() {
            recordUpdated(self.wrapRecord(record));
          };
          Ember.addObserver(record, key, handler);
          releaseMethods.push(function() {
            Ember.removeObserver(record, key, handler);
          });
        });

        var release = function() {
          releaseMethods.forEach(function(fn) { fn(); } );
        };

        return release;
      }

    });

    function ember$data$lib$initializers$data$adapter$$initializeDebugAdapter(registry) {
      registry.register('data-adapter:main', ember$data$lib$system$debug$debug$adapter$$default);
    }
    var ember$data$lib$initializers$data$adapter$$default = ember$data$lib$initializers$data$adapter$$initializeDebugAdapter;
    function ember$data$lib$setup$container$$setupContainer(container, application) {
      // application is not a required argument. This ensures
      // testing setups can setup a container without booting an
      // entire ember application.

      ember$data$lib$initializers$data$adapter$$default(container, application);
      ember$data$lib$initializers$transforms$$default(container, application);
      ember$data$lib$initializers$store$injections$$default(container, application);
      ember$data$lib$initializers$store$$default(container, application);
      activemodel$adapter$lib$setup$container$$default(container, application);
    }
    var ember$data$lib$setup$container$$default = ember$data$lib$setup$container$$setupContainer;

    var ember$data$lib$ember$initializer$$K = Ember.K;

    /**
      @module ember-data
    */

    /*

      This code initializes Ember-Data onto an Ember application.

      If an Ember.js developer defines a subclass of DS.Store on their application,
      as `App.ApplicationStore` (or via a module system that resolves to `store:application`)
      this code will automatically instantiate it and make it available on the
      router.

      Additionally, after an application's controllers have been injected, they will
      each have the store made available to them.

      For example, imagine an Ember.js application with the following classes:

      App.ApplicationStore = DS.Store.extend({
        adapter: 'custom'
      });

      App.PostsController = Ember.ArrayController.extend({
        // ...
      });

      When the application is initialized, `App.ApplicationStore` will automatically be
      instantiated, and the instance of `App.PostsController` will have its `store`
      property set to that instance.

      Note that this code will only be run if the `ember-application` package is
      loaded. If Ember Data is being used in an environment other than a
      typical application (e.g., node.js where only `ember-runtime` is available),
      this code will be ignored.
    */

    Ember.onLoad('Ember.Application', function(Application) {

      Application.initializer({
        name:       "ember-data",
        initialize: ember$data$lib$setup$container$$default
      });

      // Deprecated initializers to satisfy old code that depended on them

      Application.initializer({
        name:       "store",
        after:      "ember-data",
        initialize: ember$data$lib$ember$initializer$$K
      });

      Application.initializer({
        name:       "activeModelAdapter",
        before:     "store",
        initialize: ember$data$lib$ember$initializer$$K
      });

      Application.initializer({
        name:       "transforms",
        before:     "store",
        initialize: ember$data$lib$ember$initializer$$K
      });

      Application.initializer({
        name:       "data-adapter",
        before:     "store",
        initialize: ember$data$lib$ember$initializer$$K
      });

      Application.initializer({
        name:       "injectStore",
        before:     "store",
        initialize: ember$data$lib$ember$initializer$$K
      });
    });
    Ember.Date = Ember.Date || {};

    var origParse = Date.parse;
    var numericKeys = [1, 4, 5, 6, 7, 10, 11];

    /**
      @method parse
      @param {Date} date
      @return {Number} timestamp
    */
    Ember.Date.parse = function (date) {
      var timestamp, struct;
      var minutesOffset = 0;

      // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
      // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
      // implementations could be faster
      //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
      if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
        // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
        for (var i = 0, k; (k = numericKeys[i]); ++i) {
          struct[k] = +struct[k] || 0;
        }

        // allow undefined days and months
        struct[2] = (+struct[2] || 1) - 1;
        struct[3] = +struct[3] || 1;

        if (struct[8] !== 'Z' && struct[9] !== undefined) {
          minutesOffset = struct[10] * 60 + struct[11];

          if (struct[9] === '+') {
            minutesOffset = 0 - minutesOffset;
          }
        }

        timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
      } else {
        timestamp = origParse ? origParse(date) : NaN;
      }

      return timestamp;
    };

    if (Ember.EXTEND_PROTOTYPES === true || Ember.EXTEND_PROTOTYPES.Date) {
      Date.parse = Ember.Date.parse;
    }

    ember$data$lib$system$model$$default.reopen({

      /**
        Provides info about the model for debugging purposes
        by grouping the properties into more semantic groups.

        Meant to be used by debugging tools such as the Chrome Ember Extension.

        - Groups all attributes in "Attributes" group.
        - Groups all belongsTo relationships in "Belongs To" group.
        - Groups all hasMany relationships in "Has Many" group.
        - Groups all flags in "Flags" group.
        - Flags relationship CPs as expensive properties.

        @method _debugInfo
        @for DS.Model
        @private
      */
      _debugInfo: function() {
        var attributes = ['id'];
        var relationships = { belongsTo: [], hasMany: [] };
        var expensiveProperties = [];

        this.eachAttribute(function(name, meta) {
          attributes.push(name);
        }, this);

        this.eachRelationship(function(name, relationship) {
          relationships[relationship.kind].push(name);
          expensiveProperties.push(name);
        });

        var groups = [
          {
            name: 'Attributes',
            properties: attributes,
            expand: true
          },
          {
            name: 'Belongs To',
            properties: relationships.belongsTo,
            expand: true
          },
          {
            name: 'Has Many',
            properties: relationships.hasMany,
            expand: true
          },
          {
            name: 'Flags',
            properties: ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid']
          }
        ];

        return {
          propertyInfo: {
            // include all other mixins / properties (not just the grouped ones)
            includeOtherProperties: true,
            groups: groups,
            // don't pre-calculate unless cached
            expensiveProperties: expensiveProperties
          }
        };
      }
    });

    var ember$data$lib$system$debug$debug$info$$default = ember$data$lib$system$model$$default;
    var ember$data$lib$system$debug$$default = ember$data$lib$system$debug$debug$adapter$$default;
    var ember$data$lib$serializers$embedded$records$mixin$$get = Ember.get;
    var ember$data$lib$serializers$embedded$records$mixin$$forEach = Ember.EnumerableUtils.forEach;
    var ember$data$lib$serializers$embedded$records$mixin$$camelize = Ember.String.camelize;

    /**
      ## Using Embedded Records

      `DS.EmbeddedRecordsMixin` supports serializing embedded records.

      To set up embedded records, include the mixin when extending a serializer
      then define and configure embedded (model) relationships.

      Below is an example of a per-type serializer ('post' type).

      ```js
      App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
        attrs: {
          author: { embedded: 'always' },
          comments: { serialize: 'ids' }
        }
      });
      ```
      Note that this use of `{ embedded: 'always' }` is unrelated to
      the `{ embedded: 'always' }` that is defined as an option on `DS.attr` as part of
      defining a model while working with the ActiveModelSerializer.  Nevertheless,
      using `{ embedded: 'always' }` as an option to DS.attr is not a valid way to setup
      embedded records.

      The `attrs` option for a resource `{ embedded: 'always' }` is shorthand for:

      ```js
      {
        serialize: 'records',
        deserialize: 'records'
      }
      ```

      ### Configuring Attrs

      A resource's `attrs` option may be set to use `ids`, `records` or false for the
      `serialize`  and `deserialize` settings.

      The `attrs` property can be set on the ApplicationSerializer or a per-type
      serializer.

      In the case where embedded JSON is expected while extracting a payload (reading)
      the setting is `deserialize: 'records'`, there is no need to use `ids` when
      extracting as that is the default behavior without this mixin if you are using
      the vanilla EmbeddedRecordsMixin. Likewise, to embed JSON in the payload while
      serializing `serialize: 'records'` is the setting to use. There is an option of
      not embedding JSON in the serialized payload by using `serialize: 'ids'`. If you
      do not want the relationship sent at all, you can use `serialize: false`.


      ### EmbeddedRecordsMixin defaults
      If you do not overwrite `attrs` for a specific relationship, the `EmbeddedRecordsMixin`
      will behave in the following way:

      BelongsTo: `{ serialize: 'id', deserialize: 'id' }`
      HasMany:   `{ serialize: false, deserialize: 'ids' }`

      ### Model Relationships

      Embedded records must have a model defined to be extracted and serialized. Note that
      when defining any relationships on your model such as `belongsTo` and `hasMany`, you
      should not both specify `async:true` and also indicate through the serializer's
      `attrs` attribute that the related model should be embedded for deserialization.
      If a model is declared embedded for deserialization (`embedded: 'always'`,
      `deserialize: 'record'` or `deserialize: 'records'`), then do not use `async:true`.

      To successfully extract and serialize embedded records the model relationships
      must be setup correcty See the
      [defining relationships](/guides/models/defining-models/#toc_defining-relationships)
      section of the **Defining Models** guide page.

      Records without an `id` property are not considered embedded records, model
      instances must have an `id` property to be used with Ember Data.

      ### Example JSON payloads, Models and Serializers

      **When customizing a serializer it is important to grok what the customizations
      are. Please read the docs for the methods this mixin provides, in case you need
      to modify it to fit your specific needs.**

      For example review the docs for each method of this mixin:
      * [normalize](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_normalize)
      * [serializeBelongsTo](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_serializeBelongsTo)
      * [serializeHasMany](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_serializeHasMany)

      @class EmbeddedRecordsMixin
      @namespace DS
    */
    var ember$data$lib$serializers$embedded$records$mixin$$EmbeddedRecordsMixin = Ember.Mixin.create({

      /**
        Normalize the record and recursively normalize/extract all the embedded records
        while pushing them into the store as they are encountered

        A payload with an attr configured for embedded records needs to be extracted:

        ```js
        {
          "post": {
            "id": "1"
            "title": "Rails is omakase",
            "comments": [{
              "id": "1",
              "body": "Rails is unagi"
            }, {
              "id": "2",
              "body": "Omakase O_o"
            }]
          }
        }
        ```
       @method normalize
       @param {subclass of DS.Model} typeClass
       @param {Object} hash to be normalized
       @param {String} key the hash has been referenced by
       @return {Object} the normalized hash
      **/
      normalize: function(typeClass, hash, prop) {
        var normalizedHash = this._super(typeClass, hash, prop);
        return ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedRecords(this, this.store, typeClass, normalizedHash);
      },

      keyForRelationship: function(key, typeClass, method) {
        if ((method === 'serialize' && this.hasSerializeRecordsOption(key)) ||
            (method === 'deserialize' && this.hasDeserializeRecordsOption(key))) {
          return this.keyForAttribute(key, method);
        } else {
          return this._super(key, typeClass, method) || key;
        }
      },

      /**
        Serialize `belongsTo` relationship when it is configured as an embedded object.

        This example of an author model belongs to a post model:

        ```js
        Post = DS.Model.extend({
          title:    DS.attr('string'),
          body:     DS.attr('string'),
          author:   DS.belongsTo('author')
        });

        Author = DS.Model.extend({
          name:     DS.attr('string'),
          post:     DS.belongsTo('post')
        });
        ```

        Use a custom (type) serializer for the post model to configure embedded author

        ```js
        App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
          attrs: {
            author: {embedded: 'always'}
          }
        })
        ```

        A payload with an attribute configured for embedded records can serialize
        the records together under the root attribute's payload:

        ```js
        {
          "post": {
            "id": "1"
            "title": "Rails is omakase",
            "author": {
              "id": "2"
              "name": "dhh"
            }
          }
        }
        ```

        @method serializeBelongsTo
        @param {DS.Snapshot} snapshot
        @param {Object} json
        @param {Object} relationship
      */
      serializeBelongsTo: function(snapshot, json, relationship) {
        var attr = relationship.key;
        if (this.noSerializeOptionSpecified(attr)) {
          this._super(snapshot, json, relationship);
          return;
        }
        var includeIds = this.hasSerializeIdsOption(attr);
        var includeRecords = this.hasSerializeRecordsOption(attr);
        var embeddedSnapshot = snapshot.belongsTo(attr);
        var key;
        if (includeIds) {
          key = this.keyForRelationship(attr, relationship.kind, 'serialize');
          if (!embeddedSnapshot) {
            json[key] = null;
          } else {
            json[key] = embeddedSnapshot.id;
          }
        } else if (includeRecords) {
          key = this.keyForAttribute(attr, 'serialize');
          if (!embeddedSnapshot) {
            json[key] = null;
          } else {
            json[key] = embeddedSnapshot.record.serialize({ includeId: true });
            this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, json[key]);
          }
        }
      },

      /**
        Serialize `hasMany` relationship when it is configured as embedded objects.

        This example of a post model has many comments:

        ```js
        Post = DS.Model.extend({
          title:    DS.attr('string'),
          body:     DS.attr('string'),
          comments: DS.hasMany('comment')
        });

        Comment = DS.Model.extend({
          body:     DS.attr('string'),
          post:     DS.belongsTo('post')
        });
        ```

        Use a custom (type) serializer for the post model to configure embedded comments

        ```js
        App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
          attrs: {
            comments: {embedded: 'always'}
          }
        })
        ```

        A payload with an attribute configured for embedded records can serialize
        the records together under the root attribute's payload:

        ```js
        {
          "post": {
            "id": "1"
            "title": "Rails is omakase",
            "body": "I want this for my ORM, I want that for my template language..."
            "comments": [{
              "id": "1",
              "body": "Rails is unagi"
            }, {
              "id": "2",
              "body": "Omakase O_o"
            }]
          }
        }
        ```

        The attrs options object can use more specific instruction for extracting and
        serializing. When serializing, an option to embed `ids` or `records` can be set.
        When extracting the only option is `records`.

        So `{embedded: 'always'}` is shorthand for:
        `{serialize: 'records', deserialize: 'records'}`

        To embed the `ids` for a related object (using a hasMany relationship):

        ```js
        App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
          attrs: {
            comments: {serialize: 'ids', deserialize: 'records'}
          }
        })
        ```

        ```js
        {
          "post": {
            "id": "1"
            "title": "Rails is omakase",
            "body": "I want this for my ORM, I want that for my template language..."
            "comments": ["1", "2"]
          }
        }
        ```

        @method serializeHasMany
        @param {DS.Snapshot} snapshot
        @param {Object} json
        @param {Object} relationship
      */
      serializeHasMany: function(snapshot, json, relationship) {
        var attr = relationship.key;
        if (this.noSerializeOptionSpecified(attr)) {
          this._super(snapshot, json, relationship);
          return;
        }
        var includeIds = this.hasSerializeIdsOption(attr);
        var includeRecords = this.hasSerializeRecordsOption(attr);
        var key;
        if (includeIds) {
          key = this.keyForRelationship(attr, relationship.kind, 'serialize');
          json[key] = snapshot.hasMany(attr, { ids: true });
        } else if (includeRecords) {
          key = this.keyForAttribute(attr, 'serialize');
          json[key] = snapshot.hasMany(attr).map(function(embeddedSnapshot) {
            var embeddedJson = embeddedSnapshot.record.serialize({ includeId: true });
            this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, embeddedJson);
            return embeddedJson;
          }, this);
        }
      },

      /**
        When serializing an embedded record, modify the property (in the json payload)
        that refers to the parent record (foreign key for relationship).

        Serializing a `belongsTo` relationship removes the property that refers to the
        parent record

        Serializing a `hasMany` relationship does not remove the property that refers to
        the parent record.

        @method removeEmbeddedForeignKey
        @param {DS.Snapshot} snapshot
        @param {DS.Snapshot} embeddedSnapshot
        @param {Object} relationship
        @param {Object} json
      */
      removeEmbeddedForeignKey: function (snapshot, embeddedSnapshot, relationship, json) {
        if (relationship.kind === 'hasMany') {
          return;
        } else if (relationship.kind === 'belongsTo') {
          var parentRecord = snapshot.type.inverseFor(relationship.key);
          if (parentRecord) {
            var name = parentRecord.name;
            var embeddedSerializer = this.store.serializerFor(embeddedSnapshot.type);
            var parentKey = embeddedSerializer.keyForRelationship(name, parentRecord.kind, 'deserialize');
            if (parentKey) {
              delete json[parentKey];
            }
          }
        }
      },

      // checks config for attrs option to embedded (always) - serialize and deserialize
      hasEmbeddedAlwaysOption: function (attr) {
        var option = this.attrsOption(attr);
        return option && option.embedded === 'always';
      },

      // checks config for attrs option to serialize ids
      hasSerializeRecordsOption: function(attr) {
        var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
        var option = this.attrsOption(attr);
        return alwaysEmbed || (option && (option.serialize === 'records'));
      },

      // checks config for attrs option to serialize records
      hasSerializeIdsOption: function(attr) {
        var option = this.attrsOption(attr);
        return option && (option.serialize === 'ids' || option.serialize === 'id');
      },

      // checks config for attrs option to serialize records
      noSerializeOptionSpecified: function(attr) {
        var option = this.attrsOption(attr);
        return !(option && (option.serialize || option.embedded));
      },

      // checks config for attrs option to deserialize records
      // a defined option object for a resource is treated the same as
      // `deserialize: 'records'`
      hasDeserializeRecordsOption: function(attr) {
        var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
        var option = this.attrsOption(attr);
        return alwaysEmbed || (option && option.deserialize === 'records');
      },

      attrsOption: function(attr) {
        var attrs = this.get('attrs');
        return attrs && (attrs[ember$data$lib$serializers$embedded$records$mixin$$camelize(attr)] || attrs[attr]);
      }
    });

    // chooses a relationship kind to branch which function is used to update payload
    // does not change payload if attr is not embedded
    function ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedRecords(serializer, store, typeClass, partial) {

      typeClass.eachRelationship(function(key, relationship) {
        if (serializer.hasDeserializeRecordsOption(key)) {
          var embeddedTypeClass = store.modelFor(relationship.type.typeKey);
          if (relationship.kind === "hasMany") {
            if (relationship.options.polymorphic) {
              ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedHasManyPolymorphic(store, key, partial);
            } else {
              ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedHasMany(store, key, embeddedTypeClass, partial);
            }
          }
          if (relationship.kind === "belongsTo") {
            if (relationship.options.polymorphic) {
              ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedBelongsToPolymorphic(store, key, partial);
            } else {
              ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedBelongsTo(store, key, embeddedTypeClass, partial);
            }
          }
        }
      });

      return partial;
    }

    // handles embedding for `hasMany` relationship
    function ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedHasMany(store, key, embeddedTypeClass, hash) {
      if (!hash[key]) {
        return hash;
      }

      var ids = [];

      var embeddedSerializer = store.serializerFor(embeddedTypeClass.typeKey);
      ember$data$lib$serializers$embedded$records$mixin$$forEach(hash[key], function(data) {
        var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
        store.push(embeddedTypeClass, embeddedRecord);
        ids.push(embeddedRecord.id);
      });

      hash[key] = ids;
      return hash;
    }

    function ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedHasManyPolymorphic(store, key, hash) {
      if (!hash[key]) {
        return hash;
      }

      var ids = [];

      ember$data$lib$serializers$embedded$records$mixin$$forEach(hash[key], function(data) {
        var typeKey = data.type;
        var embeddedSerializer = store.serializerFor(typeKey);
        var embeddedTypeClass = store.modelFor(typeKey);
        var primaryKey = ember$data$lib$serializers$embedded$records$mixin$$get(embeddedSerializer, 'primaryKey');

        var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
        store.push(embeddedTypeClass, embeddedRecord);
        ids.push({ id: embeddedRecord[primaryKey], type: typeKey });
      });

      hash[key] = ids;
      return hash;
    }

    function ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedBelongsTo(store, key, embeddedTypeClass, hash) {
      if (!hash[key]) {
        return hash;
      }

      var embeddedSerializer = store.serializerFor(embeddedTypeClass.typeKey);
      var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, hash[key], null);
      store.push(embeddedTypeClass, embeddedRecord);

      hash[key] = embeddedRecord.id;
      //TODO Need to add a reference to the parent later so relationship works between both `belongsTo` records
      return hash;
    }

    function ember$data$lib$serializers$embedded$records$mixin$$extractEmbeddedBelongsToPolymorphic(store, key, hash) {
      if (!hash[key]) {
        return hash;
      }

      var data = hash[key];
      var typeKey = data.type;
      var embeddedSerializer = store.serializerFor(typeKey);
      var embeddedTypeClass = store.modelFor(typeKey);
      var primaryKey = ember$data$lib$serializers$embedded$records$mixin$$get(embeddedSerializer, 'primaryKey');

      var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
      store.push(embeddedTypeClass, embeddedRecord);

      hash[key] = embeddedRecord[primaryKey];
      hash[key + 'Type'] = typeKey;
      return hash;
    }

    var ember$data$lib$serializers$embedded$records$mixin$$default = ember$data$lib$serializers$embedded$records$mixin$$EmbeddedRecordsMixin;

    /**
      `DS.belongsTo` is used to define One-To-One and One-To-Many
      relationships on a [DS.Model](/api/data/classes/DS.Model.html).


      `DS.belongsTo` takes an optional hash as a second parameter, currently
      supported options are:

      - `async`: A boolean value used to explicitly declare this to be an async relationship.
      - `inverse`: A string used to identify the inverse property on a
        related model in a One-To-Many relationship. See [Explicit Inverses](#toc_explicit-inverses)

      #### One-To-One
      To declare a one-to-one relationship between two models, use
      `DS.belongsTo`:

      ```javascript
      App.User = DS.Model.extend({
        profile: DS.belongsTo('profile')
      });

      App.Profile = DS.Model.extend({
        user: DS.belongsTo('user')
      });
      ```

      #### One-To-Many
      To declare a one-to-many relationship between two models, use
      `DS.belongsTo` in combination with `DS.hasMany`, like this:

      ```javascript
      App.Post = DS.Model.extend({
        comments: DS.hasMany('comment')
      });

      App.Comment = DS.Model.extend({
        post: DS.belongsTo('post')
      });
      ```

      You can avoid passing a string as the first parameter. In that case Ember Data
      will infer the type from the key name.

      ```javascript
      App.Comment = DS.Model.extend({
        post: DS.belongsTo()
      });
      ```

      will lookup for a Post type.

      @namespace
      @method belongsTo
      @for DS
      @param {String} type (optional) type of the relationship
      @param {Object} options (optional) a hash of options
      @return {Ember.computed} relationship
    */
    function ember$data$lib$system$relationships$belongs$to$$belongsTo(type, options) {
      if (typeof type === 'object') {
        options = type;
        type = undefined;
      }

      Ember.assert("The first argument to DS.belongsTo must be a string representing a model type key, not an instance of " + Ember.inspect(type) + ". E.g., to define a relation to the Person model, use DS.belongsTo('person')", typeof type === 'string' || typeof type === 'undefined');

      options = options || {};

      var meta = {
        type: type,
        isRelationship: true,
        options: options,
        kind: 'belongsTo',
        key: null
      };

      return ember$data$lib$utils$computed$polyfill$$default({
        get: function(key) {
          return this._relationships[key].getRecord();
        },
        set: function(key, value) {
          if (value === undefined) {
            value = null;
          }
          if (value && value.then) {
            this._relationships[key].setRecordPromise(value);
          } else {
            this._relationships[key].setRecord(value);
          }

          return this._relationships[key].getRecord();
        }
      }).meta(meta);
    }

    /*
      These observers observe all `belongsTo` relationships on the record. See
      `relationships/ext` to see how these observers get their dependencies.
    */
    ember$data$lib$system$model$$default.reopen({
      notifyBelongsToChanged: function(key) {
        this.notifyPropertyChange(key);
      }
    });

    var ember$data$lib$system$relationships$belongs$to$$default = ember$data$lib$system$relationships$belongs$to$$belongsTo;

    /**
      `DS.hasMany` is used to define One-To-Many and Many-To-Many
      relationships on a [DS.Model](/api/data/classes/DS.Model.html).

      `DS.hasMany` takes an optional hash as a second parameter, currently
      supported options are:

      - `async`: A boolean value used to explicitly declare this to be an async relationship.
      - `inverse`: A string used to identify the inverse property on a related model.

      #### One-To-Many
      To declare a one-to-many relationship between two models, use
      `DS.belongsTo` in combination with `DS.hasMany`, like this:

      ```javascript
      App.Post = DS.Model.extend({
        comments: DS.hasMany('comment')
      });

      App.Comment = DS.Model.extend({
        post: DS.belongsTo('post')
      });
      ```

      #### Many-To-Many
      To declare a many-to-many relationship between two models, use
      `DS.hasMany`:

      ```javascript
      App.Post = DS.Model.extend({
        tags: DS.hasMany('tag')
      });

      App.Tag = DS.Model.extend({
        posts: DS.hasMany('post')
      });
      ```

      You can avoid passing a string as the first parameter. In that case Ember Data
      will infer the type from the singularized key name.

      ```javascript
      App.Post = DS.Model.extend({
        tags: DS.hasMany()
      });
      ```

      will lookup for a Tag type.

      #### Explicit Inverses

      Ember Data will do its best to discover which relationships map to
      one another. In the one-to-many code above, for example, Ember Data
      can figure out that changing the `comments` relationship should update
      the `post` relationship on the inverse because post is the only
      relationship to that model.

      However, sometimes you may have multiple `belongsTo`/`hasManys` for the
      same type. You can specify which property on the related model is
      the inverse using `DS.hasMany`'s `inverse` option:

      ```javascript
      var belongsTo = DS.belongsTo,
          hasMany = DS.hasMany;

      App.Comment = DS.Model.extend({
        onePost: belongsTo('post'),
        twoPost: belongsTo('post'),
        redPost: belongsTo('post'),
        bluePost: belongsTo('post')
      });

      App.Post = DS.Model.extend({
        comments: hasMany('comment', {
          inverse: 'redPost'
        })
      });
      ```

      You can also specify an inverse on a `belongsTo`, which works how
      you'd expect.

      @namespace
      @method hasMany
      @for DS
      @param {String} type (optional) type of the relationship
      @param {Object} options (optional) a hash of options
      @return {Ember.computed} relationship
    */
    function ember$data$lib$system$relationships$has$many$$hasMany(type, options) {
      if (typeof type === 'object') {
        options = type;
        type = undefined;
      }

      Ember.assert("The first argument to DS.hasMany must be a string representing a model type key, not an instance of " + Ember.inspect(type) + ". E.g., to define a relation to the Comment model, use DS.hasMany('comment')", typeof type === 'string' || typeof type === 'undefined');

      options = options || {};

      // Metadata about relationships is stored on the meta of
      // the relationship. This is used for introspection and
      // serialization. Note that `key` is populated lazily
      // the first time the CP is called.
      var meta = {
        type: type,
        isRelationship: true,
        options: options,
        kind: 'hasMany',
        key: null
      };

      return Ember.computed(function(key) {
        var relationship = this._relationships[key];
        return relationship.getRecords();
      }).meta(meta).readOnly();
    }

    ember$data$lib$system$model$$default.reopen({
      notifyHasManyAdded: function(key) {
        //We need to notifyPropertyChange in the adding case because we need to make sure
        //we fetch the newly added record in case it is unloaded
        //TODO(Igor): Consider whether we could do this only if the record state is unloaded

        //Goes away once hasMany is double promisified
        this.notifyPropertyChange(key);
      }
    });


    var ember$data$lib$system$relationships$has$many$$default = ember$data$lib$system$relationships$has$many$$hasMany;
    function ember$data$lib$system$relationship$meta$$typeForRelationshipMeta(store, meta) {
      var typeKey, typeClass;

      typeKey = meta.type || meta.key;
      if (typeof typeKey === 'string') {
        if (meta.kind === 'hasMany') {
          typeKey = ember$inflector$lib$lib$system$string$$singularize(typeKey);
        }
        typeClass = store.modelFor(typeKey);
      } else {
        typeClass = meta.type;
      }

      return typeClass;
    }

    function ember$data$lib$system$relationship$meta$$relationshipFromMeta(store, meta) {
      return {
        key:  meta.key,
        kind: meta.kind,
        type: ember$data$lib$system$relationship$meta$$typeForRelationshipMeta(store, meta),
        options:    meta.options,
        parentType: meta.parentType,
        isRelationship: true
      };
    }

    var ember$data$lib$system$relationships$ext$$get = Ember.get;
    var ember$data$lib$system$relationships$ext$$filter = Ember.ArrayPolyfills.filter;

    var ember$data$lib$system$relationships$ext$$relationshipsDescriptor = Ember.computed(function() {
      if (Ember.testing === true && ember$data$lib$system$relationships$ext$$relationshipsDescriptor._cacheable === true) {
        ember$data$lib$system$relationships$ext$$relationshipsDescriptor._cacheable = false;
      }

      var map = new ember$data$lib$system$map$$MapWithDefault({
        defaultValue: function() { return []; }
      });

      // Loop through each computed property on the class
      this.eachComputedProperty(function(name, meta) {
        // If the computed property is a relationship, add
        // it to the map.
        if (meta.isRelationship) {
          meta.key = name;
          var relationshipsForType = map.get(ember$data$lib$system$relationship$meta$$typeForRelationshipMeta(this.store, meta));

          relationshipsForType.push({
            name: name,
            kind: meta.kind
          });
        }
      });

      return map;
    }).readOnly();

    var ember$data$lib$system$relationships$ext$$relatedTypesDescriptor = Ember.computed(function() {
      if (Ember.testing === true && ember$data$lib$system$relationships$ext$$relatedTypesDescriptor._cacheable === true) {
        ember$data$lib$system$relationships$ext$$relatedTypesDescriptor._cacheable = false;
      }

      var typeKey;
      var types = Ember.A();

      // Loop through each computed property on the class,
      // and create an array of the unique types involved
      // in relationships
      this.eachComputedProperty(function(name, meta) {
        if (meta.isRelationship) {
          meta.key = name;
          typeKey = ember$data$lib$system$relationship$meta$$typeForRelationshipMeta(this.store, meta);

          Ember.assert("You specified a hasMany (" + meta.type + ") on " + meta.parentType + " but " + meta.type + " was not found.", typeKey);

          if (!types.contains(typeKey)) {
            Ember.assert("Trying to sideload " + name + " on " + this.toString() + " but the type doesn't exist.", !!typeKey);
            types.push(typeKey);
          }
        }
      });

      return types;
    }).readOnly();

    var ember$data$lib$system$relationships$ext$$relationshipsByNameDescriptor = Ember.computed(function() {
      if (Ember.testing === true && ember$data$lib$system$relationships$ext$$relationshipsByNameDescriptor._cacheable === true) {
        ember$data$lib$system$relationships$ext$$relationshipsByNameDescriptor._cacheable = false;
      }

      var map = ember$data$lib$system$map$$Map.create();

      this.eachComputedProperty(function(name, meta) {
        if (meta.isRelationship) {
          meta.key = name;
          var relationship = ember$data$lib$system$relationship$meta$$relationshipFromMeta(this.store, meta);
          relationship.type = ember$data$lib$system$relationship$meta$$typeForRelationshipMeta(this.store, meta);
          map.set(name, relationship);
        }
      });

      return map;
    }).readOnly();

    /**
      @module ember-data
    */

    /*
      This file defines several extensions to the base `DS.Model` class that
      add support for one-to-many relationships.
    */

    /**
      @class Model
      @namespace DS
    */
    ember$data$lib$system$model$$default.reopen({

      /**
        This Ember.js hook allows an object to be notified when a property
        is defined.

        In this case, we use it to be notified when an Ember Data user defines a
        belongs-to relationship. In that case, we need to set up observers for
        each one, allowing us to track relationship changes and automatically
        reflect changes in the inverse has-many array.

        This hook passes the class being set up, as well as the key and value
        being defined. So, for example, when the user does this:

        ```javascript
        DS.Model.extend({
          parent: DS.belongsTo('user')
        });
        ```

        This hook would be called with "parent" as the key and the computed
        property returned by `DS.belongsTo` as the value.

        @method didDefineProperty
        @param {Object} proto
        @param {String} key
        @param {Ember.ComputedProperty} value
      */
      didDefineProperty: function(proto, key, value) {
        // Check if the value being set is a computed property.
        if (value instanceof Ember.ComputedProperty) {

          // If it is, get the metadata for the relationship. This is
          // populated by the `DS.belongsTo` helper when it is creating
          // the computed property.
          var meta = value.meta();

          meta.parentType = proto.constructor;
        }
      }
    });

    /*
      These DS.Model extensions add class methods that provide relationship
      introspection abilities about relationships.

      A note about the computed properties contained here:

      **These properties are effectively sealed once called for the first time.**
      To avoid repeatedly doing expensive iteration over a model's fields, these
      values are computed once and then cached for the remainder of the runtime of
      your application.

      If your application needs to modify a class after its initial definition
      (for example, using `reopen()` to add additional attributes), make sure you
      do it before using your model with the store, which uses these properties
      extensively.
    */

    ember$data$lib$system$model$$default.reopenClass({

      /**
        For a given relationship name, returns the model type of the relationship.

        For example, if you define a model like this:

       ```javascript
        App.Post = DS.Model.extend({
          comments: DS.hasMany('comment')
        });
       ```

        Calling `App.Post.typeForRelationship('comments')` will return `App.Comment`.

        @method typeForRelationship
        @static
        @param {String} name the name of the relationship
        @return {subclass of DS.Model} the type of the relationship, or undefined
      */
      typeForRelationship: function(name) {
        var relationship = ember$data$lib$system$relationships$ext$$get(this, 'relationshipsByName').get(name);
        return relationship && relationship.type;
      },

      inverseMap: Ember.computed(function() {
        return Ember.create(null);
      }),

      /**
        Find the relationship which is the inverse of the one asked for.

        For example, if you define models like this:

       ```javascript
          App.Post = DS.Model.extend({
            comments: DS.hasMany('message')
          });

          App.Message = DS.Model.extend({
            owner: DS.belongsTo('post')
          });
        ```

        App.Post.inverseFor('comments') -> {type: App.Message, name:'owner', kind:'belongsTo'}
        App.Message.inverseFor('owner') -> {type: App.Post, name:'comments', kind:'hasMany'}

        @method inverseFor
        @static
        @param {String} name the name of the relationship
        @return {Object} the inverse relationship, or null
      */
      inverseFor: function(name) {
        var inverseMap = ember$data$lib$system$relationships$ext$$get(this, 'inverseMap');
        if (inverseMap[name]) {
          return inverseMap[name];
        } else {
          var inverse = this._findInverseFor(name);
          inverseMap[name] = inverse;
          return inverse;
        }
      },

      //Calculate the inverse, ignoring the cache
      _findInverseFor: function(name) {

        var inverseType = this.typeForRelationship(name);
        if (!inverseType) {
          return null;
        }

        var propertyMeta = this.metaForProperty(name);
        //If inverse is manually specified to be null, like  `comments: DS.hasMany('message', {inverse: null})`
        var options = propertyMeta.options;
        if (options.inverse === null) { return null; }

        var inverseName, inverseKind, inverse;

        Ember.warn("Detected a reflexive relationship by the name of '" + name + "' without an inverse option. Look at http://emberjs.com/guides/models/defining-models/#toc_reflexive-relation for how to explicitly specify inverses.", options.inverse || propertyMeta.type !== propertyMeta.parentType.typeKey);

        //If inverse is specified manually, return the inverse
        if (options.inverse) {
          inverseName = options.inverse;
          inverse = Ember.get(inverseType, 'relationshipsByName').get(inverseName);

          Ember.assert("We found no inverse relationships by the name of '" + inverseName + "' on the '" + inverseType.typeKey +
            "' model. This is most likely due to a missing attribute on your model definition.", !Ember.isNone(inverse));

          inverseKind = inverse.kind;
        } else {
          //No inverse was specified manually, we need to use a heuristic to guess one
          var possibleRelationships = findPossibleInverses(this, inverseType);

          if (possibleRelationships.length === 0) { return null; }

          var filteredRelationships = ember$data$lib$system$relationships$ext$$filter.call(possibleRelationships, function(possibleRelationship) {
            var optionsForRelationship = inverseType.metaForProperty(possibleRelationship.name).options;
            return name === optionsForRelationship.inverse;
          });

          Ember.assert("You defined the '" + name + "' relationship on " + this + ", but you defined the inverse relationships of type " +
            inverseType.toString() + " multiple times. Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
            filteredRelationships.length < 2);

          if (filteredRelationships.length === 1 ) {
            possibleRelationships = filteredRelationships;
          }

          Ember.assert("You defined the '" + name + "' relationship on " + this + ", but multiple possible inverse relationships of type " +
            this + " were found on " + inverseType + ". Look at http://emberjs.com/guides/models/defining-models/#toc_explicit-inverses for how to explicitly specify inverses",
            possibleRelationships.length === 1);

          inverseName = possibleRelationships[0].name;
          inverseKind = possibleRelationships[0].kind;
        }

        function findPossibleInverses(type, inverseType, relationshipsSoFar) {
          var possibleRelationships = relationshipsSoFar || [];

          var relationshipMap = ember$data$lib$system$relationships$ext$$get(inverseType, 'relationships');
          if (!relationshipMap) { return; }

          var relationships = relationshipMap.get(type);

          relationships = ember$data$lib$system$relationships$ext$$filter.call(relationships, function(relationship) {
            var optionsForRelationship = inverseType.metaForProperty(relationship.name).options;

            if (!optionsForRelationship.inverse) {
              return true;
            }

            return name === optionsForRelationship.inverse;
          });

          if (relationships) {
            possibleRelationships.push.apply(possibleRelationships, relationships);
          }

          //Recurse to support polymorphism
          if (type.superclass) {
            findPossibleInverses(type.superclass, inverseType, possibleRelationships);
          }

          return possibleRelationships;
        }

        return {
          type: inverseType,
          name: inverseName,
          kind: inverseKind
        };
      },

      /**
        The model's relationships as a map, keyed on the type of the
        relationship. The value of each entry is an array containing a descriptor
        for each relationship with that type, describing the name of the relationship
        as well as the type.

        For example, given the following model definition:

        ```javascript
        App.Blog = DS.Model.extend({
          users: DS.hasMany('user'),
          owner: DS.belongsTo('user'),
          posts: DS.hasMany('post')
        });
        ```

        This computed property would return a map describing these
        relationships, like this:

        ```javascript
        var relationships = Ember.get(App.Blog, 'relationships');
        relationships.get(App.User);
        //=> [ { name: 'users', kind: 'hasMany' },
        //     { name: 'owner', kind: 'belongsTo' } ]
        relationships.get(App.Post);
        //=> [ { name: 'posts', kind: 'hasMany' } ]
        ```

        @property relationships
        @static
        @type Ember.Map
        @readOnly
      */

      relationships: ember$data$lib$system$relationships$ext$$relationshipsDescriptor,

      /**
        A hash containing lists of the model's relationships, grouped
        by the relationship kind. For example, given a model with this
        definition:

        ```javascript
        App.Blog = DS.Model.extend({
          users: DS.hasMany('user'),
          owner: DS.belongsTo('user'),

          posts: DS.hasMany('post')
        });
        ```

        This property would contain the following:

        ```javascript
        var relationshipNames = Ember.get(App.Blog, 'relationshipNames');
        relationshipNames.hasMany;
        //=> ['users', 'posts']
        relationshipNames.belongsTo;
        //=> ['owner']
        ```

        @property relationshipNames
        @static
        @type Object
        @readOnly
      */
      relationshipNames: Ember.computed(function() {
        var names = {
          hasMany: [],
          belongsTo: []
        };

        this.eachComputedProperty(function(name, meta) {
          if (meta.isRelationship) {
            names[meta.kind].push(name);
          }
        });

        return names;
      }),

      /**
        An array of types directly related to a model. Each type will be
        included once, regardless of the number of relationships it has with
        the model.

        For example, given a model with this definition:

        ```javascript
        App.Blog = DS.Model.extend({
          users: DS.hasMany('user'),
          owner: DS.belongsTo('user'),

          posts: DS.hasMany('post')
        });
        ```

        This property would contain the following:

        ```javascript
        var relatedTypes = Ember.get(App.Blog, 'relatedTypes');
        //=> [ App.User, App.Post ]
        ```

        @property relatedTypes
        @static
        @type Ember.Array
        @readOnly
      */
      relatedTypes: ember$data$lib$system$relationships$ext$$relatedTypesDescriptor,

      /**
        A map whose keys are the relationships of a model and whose values are
        relationship descriptors.

        For example, given a model with this
        definition:

        ```javascript
        App.Blog = DS.Model.extend({
          users: DS.hasMany('user'),
          owner: DS.belongsTo('user'),

          posts: DS.hasMany('post')
        });
        ```

        This property would contain the following:

        ```javascript
        var relationshipsByName = Ember.get(App.Blog, 'relationshipsByName');
        relationshipsByName.get('users');
        //=> { key: 'users', kind: 'hasMany', type: App.User }
        relationshipsByName.get('owner');
        //=> { key: 'owner', kind: 'belongsTo', type: App.User }
        ```

        @property relationshipsByName
        @static
        @type Ember.Map
        @readOnly
      */
      relationshipsByName: ember$data$lib$system$relationships$ext$$relationshipsByNameDescriptor,

      /**
        A map whose keys are the fields of the model and whose values are strings
        describing the kind of the field. A model's fields are the union of all of its
        attributes and relationships.

        For example:

        ```javascript

        App.Blog = DS.Model.extend({
          users: DS.hasMany('user'),
          owner: DS.belongsTo('user'),

          posts: DS.hasMany('post'),

          title: DS.attr('string')
        });

        var fields = Ember.get(App.Blog, 'fields');
        fields.forEach(function(kind, field) {
          console.log(field, kind);
        });

        // prints:
        // users, hasMany
        // owner, belongsTo
        // posts, hasMany
        // title, attribute
        ```

        @property fields
        @static
        @type Ember.Map
        @readOnly
      */
      fields: Ember.computed(function() {
        var map = ember$data$lib$system$map$$Map.create();

        this.eachComputedProperty(function(name, meta) {
          if (meta.isRelationship) {
            map.set(name, meta.kind);
          } else if (meta.isAttribute) {
            map.set(name, 'attribute');
          }
        });

        return map;
      }).readOnly(),

      /**
        Given a callback, iterates over each of the relationships in the model,
        invoking the callback with the name of each relationship and its relationship
        descriptor.

        @method eachRelationship
        @static
        @param {Function} callback the callback to invoke
        @param {any} binding the value to which the callback's `this` should be bound
      */
      eachRelationship: function(callback, binding) {
        ember$data$lib$system$relationships$ext$$get(this, 'relationshipsByName').forEach(function(relationship, name) {
          callback.call(binding, name, relationship);
        });
      },

      /**
        Given a callback, iterates over each of the types related to a model,
        invoking the callback with the related type's class. Each type will be
        returned just once, regardless of how many different relationships it has
        with a model.

        @method eachRelatedType
        @static
        @param {Function} callback the callback to invoke
        @param {any} binding the value to which the callback's `this` should be bound
      */
      eachRelatedType: function(callback, binding) {
        ember$data$lib$system$relationships$ext$$get(this, 'relatedTypes').forEach(function(type) {
          callback.call(binding, type);
        });
      },

      determineRelationshipType: function(knownSide) {
        var knownKey = knownSide.key;
        var knownKind = knownSide.kind;
        var inverse = this.inverseFor(knownKey);
        var key, otherKind;

        if (!inverse) {
          return knownKind === 'belongsTo' ? 'oneToNone' : 'manyToNone';
        }

        key = inverse.name;
        otherKind = inverse.kind;

        if (otherKind === 'belongsTo') {
          return knownKind === 'belongsTo' ? 'oneToOne' : 'manyToOne';
        } else {
          return knownKind === 'belongsTo' ? 'oneToMany' : 'manyToMany';
        }
      }

    });

    ember$data$lib$system$model$$default.reopen({
      /**
        Given a callback, iterates over each of the relationships in the model,
        invoking the callback with the name of each relationship and its relationship
        descriptor.


        The callback method you provide should have the following signature (all
        parameters are optional):

        ```javascript
        function(name, descriptor);
        ```

        - `name` the name of the current property in the iteration
        - `descriptor` the meta object that describes this relationship

        The relationship descriptor argument is an object with the following properties.

       - **key** <span class="type">String</span> the name of this relationship on the Model
       - **kind** <span class="type">String</span> "hasMany" or "belongsTo"
       - **options** <span class="type">Object</span> the original options hash passed when the relationship was declared
       - **parentType** <span class="type">DS.Model</span> the type of the Model that owns this relationship
       - **type** <span class="type">DS.Model</span> the type of the related Model

        Note that in addition to a callback, you can also pass an optional target
        object that will be set as `this` on the context.

        Example

        ```javascript
        App.ApplicationSerializer = DS.JSONSerializer.extend({
          serialize: function(record, options) {
            var json = {};

            record.eachRelationship(function(name, descriptor) {
              if (descriptor.kind === 'hasMany') {
                var serializedHasManyName = name.toUpperCase() + '_IDS';
                json[name.toUpperCase()] = record.get(name).mapBy('id');
              }
            });

            return json;
          }
        });
        ```

        @method eachRelationship
        @param {Function} callback the callback to invoke
        @param {any} binding the value to which the callback's `this` should be bound
      */
      eachRelationship: function(callback, binding) {
        this.constructor.eachRelationship(callback, binding);
      },

      relationshipFor: function(name) {
        return ember$data$lib$system$relationships$ext$$get(this.constructor, 'relationshipsByName').get(name);
      },

      inverseFor: function(key) {
        return this.constructor.inverseFor(key);
      }

    });
    Ember.RSVP.Promise.cast = Ember.RSVP.Promise.cast || Ember.RSVP.resolve;

    Ember.runInDebug(function() {
      if (Ember.VERSION.match(/^1\.[0-7]\./)) {
        throw new Ember.Error("Ember Data requires at least Ember 1.8.0, but you have " +
                              Ember.VERSION +
                              ". Please upgrade your version of Ember, then upgrade Ember Data");
      }
    });

    ember$data$lib$core$$default.Store         = ember$data$lib$system$store$$Store;
    ember$data$lib$core$$default.PromiseArray  = ember$data$lib$system$promise$proxies$$PromiseArray;
    ember$data$lib$core$$default.PromiseObject = ember$data$lib$system$promise$proxies$$PromiseObject;

    ember$data$lib$core$$default.PromiseManyArray = ember$data$lib$system$promise$proxies$$PromiseManyArray;

    ember$data$lib$core$$default.Model     = ember$data$lib$system$model$$default;
    ember$data$lib$core$$default.RootState = ember$data$lib$system$model$states$$default;
    ember$data$lib$core$$default.attr      = ember$data$lib$system$model$attributes$$default;
    ember$data$lib$core$$default.Errors    = ember$data$lib$system$model$errors$$default;

    ember$data$lib$core$$default.Snapshot = ember$data$lib$system$snapshot$$default;

    ember$data$lib$core$$default.Adapter      = ember$data$lib$system$adapter$$Adapter;
    ember$data$lib$core$$default.InvalidError = ember$data$lib$system$model$errors$invalid$$default;

    ember$data$lib$core$$default.Serializer = ember$data$lib$system$serializer$$default;

    ember$data$lib$core$$default.DebugAdapter = ember$data$lib$system$debug$$default;

    ember$data$lib$core$$default.RecordArray                 = ember$data$lib$system$record$arrays$record$array$$default;
    ember$data$lib$core$$default.FilteredRecordArray         = ember$data$lib$system$record$arrays$filtered$record$array$$default;
    ember$data$lib$core$$default.AdapterPopulatedRecordArray = ember$data$lib$system$record$arrays$adapter$populated$record$array$$default;
    ember$data$lib$core$$default.ManyArray                   = ember$data$lib$system$many$array$$default;

    ember$data$lib$core$$default.RecordArrayManager = ember$data$lib$system$record$array$manager$$default;

    ember$data$lib$core$$default.RESTAdapter    = ember$data$lib$adapters$rest$adapter$$default;
    ember$data$lib$core$$default.BuildURLMixin  = ember$data$lib$adapters$build$url$mixin$$default;
    ember$data$lib$core$$default.FixtureAdapter = ember$data$lib$adapters$fixture$adapter$$default;

    ember$data$lib$core$$default.RESTSerializer = ember$data$lib$serializers$rest$serializer$$default;
    ember$data$lib$core$$default.JSONSerializer = ember$data$lib$serializers$json$serializer$$default;

    ember$data$lib$core$$default.Transform       = ember$data$lib$transforms$base$$default;
    ember$data$lib$core$$default.DateTransform   = ember$data$lib$transforms$date$$default;
    ember$data$lib$core$$default.StringTransform = ember$data$lib$transforms$string$$default;
    ember$data$lib$core$$default.NumberTransform = ember$data$lib$transforms$number$$default;
    ember$data$lib$core$$default.BooleanTransform = ember$data$lib$transforms$boolean$$default;

    ember$data$lib$core$$default.ActiveModelAdapter    = activemodel$adapter$lib$system$active$model$adapter$$default;
    ember$data$lib$core$$default.ActiveModelSerializer = activemodel$adapter$lib$system$active$model$serializer$$default;
    ember$data$lib$core$$default.EmbeddedRecordsMixin  = ember$data$lib$serializers$embedded$records$mixin$$default;

    ember$data$lib$core$$default.belongsTo = ember$data$lib$system$relationships$belongs$to$$default;
    ember$data$lib$core$$default.hasMany   = ember$data$lib$system$relationships$has$many$$default;

    ember$data$lib$core$$default.Relationship  = ember$data$lib$system$relationships$state$relationship$$default;

    ember$data$lib$core$$default.ContainerProxy = ember$data$lib$system$container$proxy$$default;

    ember$data$lib$core$$default._setupContainer = ember$data$lib$setup$container$$default;

    Ember.lookup.DS = ember$data$lib$core$$default;

    var ember$data$lib$main$$default = ember$data$lib$core$$default;
}).call(this);


/*! VelocityJS.org (1.2.2). (C) 2014 Julian Shapiro. MIT @license: en.wikipedia.org/wiki/MIT_License */

/*************************
   Velocity jQuery Shim
*************************/

/*! VelocityJS.org jQuery Shim (1.0.1). (C) 2014 The jQuery Foundation. MIT @license: en.wikipedia.org/wiki/MIT_License. */

/* This file contains the jQuery functions that Velocity relies on, thereby removing Velocity's dependency on a full copy of jQuery, and allowing it to work in any environment. */
/* These shimmed functions are only used if jQuery isn't present. If both this shim and jQuery are loaded, Velocity defaults to jQuery proper. */
/* Browser support: Using this shim instead of jQuery proper removes support for IE8. */

;(function (window) {
    /***************
         Setup
    ***************/

    /* If jQuery is already loaded, there's no point in loading this shim. */
    if (window.jQuery) {
        return;
    }

    /* jQuery base. */
    var $ = function (selector, context) {
        return new $.fn.init(selector, context);
    };

    /********************
       Private Methods
    ********************/

    /* jQuery */
    $.isWindow = function (obj) {
        /* jshint eqeqeq: false */
        return obj != null && obj == obj.window;
    };

    /* jQuery */
    $.type = function (obj) {
        if (obj == null) {
            return obj + "";
        }

        return typeof obj === "object" || typeof obj === "function" ?
            class2type[toString.call(obj)] || "object" :
            typeof obj;
    };

    /* jQuery */
    $.isArray = Array.isArray || function (obj) {
        return $.type(obj) === "array";
    };

    /* jQuery */
    function isArraylike (obj) {
        var length = obj.length,
            type = $.type(obj);

        if (type === "function" || $.isWindow(obj)) {
            return false;
        }

        if (obj.nodeType === 1 && length) {
            return true;
        }

        return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj;
    }

    /***************
       $ Methods
    ***************/

    /* jQuery: Support removed for IE<9. */
    $.isPlainObject = function (obj) {
        var key;

        if (!obj || $.type(obj) !== "object" || obj.nodeType || $.isWindow(obj)) {
            return false;
        }

        try {
            if (obj.constructor &&
                !hasOwn.call(obj, "constructor") &&
                !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
                return false;
            }
        } catch (e) {
            return false;
        }

        for (key in obj) {}

        return key === undefined || hasOwn.call(obj, key);
    };

    /* jQuery */
    $.each = function(obj, callback, args) {
        var value,
            i = 0,
            length = obj.length,
            isArray = isArraylike(obj);

        if (args) {
            if (isArray) {
                for (; i < length; i++) {
                    value = callback.apply(obj[i], args);

                    if (value === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    value = callback.apply(obj[i], args);

                    if (value === false) {
                        break;
                    }
                }
            }

        } else {
            if (isArray) {
                for (; i < length; i++) {
                    value = callback.call(obj[i], i, obj[i]);

                    if (value === false) {
                        break;
                    }
                }
            } else {
                for (i in obj) {
                    value = callback.call(obj[i], i, obj[i]);

                    if (value === false) {
                        break;
                    }
                }
            }
        }

        return obj;
    };

    /* Custom */
    $.data = function (node, key, value) {
        /* $.getData() */
        if (value === undefined) {
            var id = node[$.expando],
                store = id && cache[id];

            if (key === undefined) {
                return store;
            } else if (store) {
                if (key in store) {
                    return store[key];
                }
            }
        /* $.setData() */
        } else if (key !== undefined) {
            var id = node[$.expando] || (node[$.expando] = ++$.uuid);

            cache[id] = cache[id] || {};
            cache[id][key] = value;

            return value;
        }
    };

    /* Custom */
    $.removeData = function (node, keys) {
        var id = node[$.expando],
            store = id && cache[id];

        if (store) {
            $.each(keys, function(_, key) {
                delete store[key];
            });
        }
    };

    /* jQuery */
    $.extend = function () {
        var src, copyIsArray, copy, name, options, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false;

        if (typeof target === "boolean") {
            deep = target;

            target = arguments[i] || {};
            i++;
        }

        if (typeof target !== "object" && $.type(target) !== "function") {
            target = {};
        }

        if (i === length) {
            target = this;
            i--;
        }

        for (; i < length; i++) {
            if ((options = arguments[i]) != null) {
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    if (target === copy) {
                        continue;
                    }

                    if (deep && copy && ($.isPlainObject(copy) || (copyIsArray = $.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && $.isArray(src) ? src : [];

                        } else {
                            clone = src && $.isPlainObject(src) ? src : {};
                        }

                        target[name] = $.extend(deep, clone, copy);

                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        return target;
    };

    /* jQuery 1.4.3 */
    $.queue = function (elem, type, data) {
        function $makeArray (arr, results) {
            var ret = results || [];

            if (arr != null) {
                if (isArraylike(Object(arr))) {
                    /* $.merge */
                    (function(first, second) {
                        var len = +second.length,
                            j = 0,
                            i = first.length;

                        while (j < len) {
                            first[i++] = second[j++];
                        }

                        if (len !== len) {
                            while (second[j] !== undefined) {
                                first[i++] = second[j++];
                            }
                        }

                        first.length = i;

                        return first;
                    })(ret, typeof arr === "string" ? [arr] : arr);
                } else {
                    [].push.call(ret, arr);
                }
            }

            return ret;
        }

        if (!elem) {
            return;
        }

        type = (type || "fx") + "queue";

        var q = $.data(elem, type);

        if (!data) {
            return q || [];
        }

        if (!q || $.isArray(data)) {
            q = $.data(elem, type, $makeArray(data));
        } else {
            q.push(data);
        }

        return q;
    };

    /* jQuery 1.4.3 */
    $.dequeue = function (elems, type) {
        /* Custom: Embed element iteration. */
        $.each(elems.nodeType ? [ elems ] : elems, function(i, elem) {
            type = type || "fx";

            var queue = $.queue(elem, type),
                fn = queue.shift();

            if (fn === "inprogress") {
                fn = queue.shift();
            }

            if (fn) {
                if (type === "fx") {
                    queue.unshift("inprogress");
                }

                fn.call(elem, function() {
                    $.dequeue(elem, type);
                });
            }
        });
    };

    /******************
       $.fn Methods
    ******************/

    /* jQuery */
    $.fn = $.prototype = {
        init: function (selector) {
            /* Just return the element wrapped inside an array; don't proceed with the actual jQuery node wrapping process. */
            if (selector.nodeType) {
                this[0] = selector;

                return this;
            } else {
                throw new Error("Not a DOM node.");
            }
        },

        offset: function () {
            /* jQuery altered code: Dropped disconnected DOM node checking. */
            var box = this[0].getBoundingClientRect ? this[0].getBoundingClientRect() : { top: 0, left: 0 };

            return {
                top: box.top + (window.pageYOffset || document.scrollTop  || 0)  - (document.clientTop  || 0),
                left: box.left + (window.pageXOffset || document.scrollLeft  || 0) - (document.clientLeft || 0)
            };
        },

        position: function () {
            /* jQuery */
            function offsetParent() {
                var offsetParent = this.offsetParent || document;

                while (offsetParent && (!offsetParent.nodeType.toLowerCase === "html" && offsetParent.style.position === "static")) {
                    offsetParent = offsetParent.offsetParent;
                }

                return offsetParent || document;
            }

            /* Zepto */
            var elem = this[0],
                offsetParent = offsetParent.apply(elem),
                offset = this.offset(),
                parentOffset = /^(?:body|html)$/i.test(offsetParent.nodeName) ? { top: 0, left: 0 } : $(offsetParent).offset()

            offset.top -= parseFloat(elem.style.marginTop) || 0;
            offset.left -= parseFloat(elem.style.marginLeft) || 0;

            if (offsetParent.style) {
                parentOffset.top += parseFloat(offsetParent.style.borderTopWidth) || 0
                parentOffset.left += parseFloat(offsetParent.style.borderLeftWidth) || 0
            }

            return {
                top: offset.top - parentOffset.top,
                left: offset.left - parentOffset.left
            };
        }
    };

    /**********************
       Private Variables
    **********************/

    /* For $.data() */
    var cache = {};
    $.expando = "velocity" + (new Date().getTime());
    $.uuid = 0;

    /* For $.queue() */
    var class2type = {},
        hasOwn = class2type.hasOwnProperty,
        toString = class2type.toString;

    var types = "Boolean Number String Function Array Date RegExp Object Error".split(" ");
    for (var i = 0; i < types.length; i++) {
        class2type["[object " + types[i] + "]"] = types[i].toLowerCase();
    }

    /* Makes $(node) possible, without having to call init. */
    $.fn.init.prototype = $.fn;

    /* Globalize Velocity onto the window, and assign its Utilities property. */
    window.Velocity = { Utilities: $ };
})(window);

/******************
    Velocity.js
******************/

;(function (factory) {
    /* CommonJS module. */
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory();
    /* AMD module. */
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    /* Browser globals. */
    } else {
        factory();
    }
}(function() {
return function (global, window, document, undefined) {

    /***************
        Summary
    ***************/

    /*
    - CSS: CSS stack that works independently from the rest of Velocity.
    - animate(): Core animation method that iterates over the targeted elements and queues the incoming call onto each element individually.
      - Pre-Queueing: Prepare the element for animation by instantiating its data cache and processing the call's options.
      - Queueing: The logic that runs once the call has reached its point of execution in the element's $.queue() stack.
                  Most logic is placed here to avoid risking it becoming stale (if the element's properties have changed).
      - Pushing: Consolidation of the tween data followed by its push onto the global in-progress calls container.
    - tick(): The single requestAnimationFrame loop responsible for tweening all in-progress calls.
    - completeCall(): Handles the cleanup process for each Velocity call.
    */

    /*********************
       Helper Functions
    *********************/

    /* IE detection. Gist: https://gist.github.com/julianshapiro/9098609 */
    var IE = (function() {
        if (document.documentMode) {
            return document.documentMode;
        } else {
            for (var i = 7; i > 4; i--) {
                var div = document.createElement("div");

                div.innerHTML = "<!--[if IE " + i + "]><span></span><![endif]-->";

                if (div.getElementsByTagName("span").length) {
                    div = null;

                    return i;
                }
            }
        }

        return undefined;
    })();

    /* rAF shim. Gist: https://gist.github.com/julianshapiro/9497513 */
    var rAFShim = (function() {
        var timeLast = 0;

        return window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
            var timeCurrent = (new Date()).getTime(),
                timeDelta;

            /* Dynamically set delay on a per-tick basis to match 60fps. */
            /* Technique by Erik Moller. MIT license: https://gist.github.com/paulirish/1579671 */
            timeDelta = Math.max(0, 16 - (timeCurrent - timeLast));
            timeLast = timeCurrent + timeDelta;

            return setTimeout(function() { callback(timeCurrent + timeDelta); }, timeDelta);
        };
    })();

    /* Array compacting. Copyright Lo-Dash. MIT License: https://github.com/lodash/lodash/blob/master/LICENSE.txt */
    function compactSparseArray (array) {
        var index = -1,
            length = array ? array.length : 0,
            result = [];

        while (++index < length) {
            var value = array[index];

            if (value) {
                result.push(value);
            }
        }

        return result;
    }

    function sanitizeElements (elements) {
        /* Unwrap jQuery/Zepto objects. */
        if (Type.isWrapped(elements)) {
            elements = [].slice.call(elements);
        /* Wrap a single element in an array so that $.each() can iterate with the element instead of its node's children. */
        } else if (Type.isNode(elements)) {
            elements = [ elements ];
        }

        return elements;
    }

    var Type = {
        isString: function (variable) {
            return (typeof variable === "string");
        },
        isArray: Array.isArray || function (variable) {
            return Object.prototype.toString.call(variable) === "[object Array]";
        },
        isFunction: function (variable) {
            return Object.prototype.toString.call(variable) === "[object Function]";
        },
        isNode: function (variable) {
            return variable && variable.nodeType;
        },
        /* Copyright Martin Bohm. MIT License: https://gist.github.com/Tomalak/818a78a226a0738eaade */
        isNodeList: function (variable) {
            return typeof variable === "object" &&
                /^\[object (HTMLCollection|NodeList|Object)\]$/.test(Object.prototype.toString.call(variable)) &&
                variable.length !== undefined &&
                (variable.length === 0 || (typeof variable[0] === "object" && variable[0].nodeType > 0));
        },
        /* Determine if variable is a wrapped jQuery or Zepto element. */
        isWrapped: function (variable) {
            return variable && (variable.jquery || (window.Zepto && window.Zepto.zepto.isZ(variable)));
        },
        isSVG: function (variable) {
            return window.SVGElement && (variable instanceof window.SVGElement);
        },
        isEmptyObject: function (variable) {
            for (var name in variable) {
                return false;
            }

            return true;
        }
    };

    /*****************
       Dependencies
    *****************/

    var $,
        isJQuery = false;

    if (global.fn && global.fn.jquery) {
        $ = global;
        isJQuery = true;
    } else {
        $ = window.Velocity.Utilities;
    }

    if (IE <= 8 && !isJQuery) {
        throw new Error("Velocity: IE8 and below require jQuery to be loaded before Velocity.");
    } else if (IE <= 7) {
        /* Revert to jQuery's $.animate(), and lose Velocity's extra features. */
        jQuery.fn.velocity = jQuery.fn.animate;

        /* Now that $.fn.velocity is aliased, abort this Velocity declaration. */
        return;
    }

    /*****************
        Constants
    *****************/

    var DURATION_DEFAULT = 400,
        EASING_DEFAULT = "swing";

    /*************
        State
    *************/

    var Velocity = {
        /* Container for page-wide Velocity state data. */
        State: {
            /* Detect mobile devices to determine if mobileHA should be turned on. */
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
            /* The mobileHA option's behavior changes on older Android devices (Gingerbread, versions 2.3.3-2.3.7). */
            isAndroid: /Android/i.test(navigator.userAgent),
            isGingerbread: /Android 2\.3\.[3-7]/i.test(navigator.userAgent),
            isChrome: window.chrome,
            isFirefox: /Firefox/i.test(navigator.userAgent),
            /* Create a cached element for re-use when checking for CSS property prefixes. */
            prefixElement: document.createElement("div"),
            /* Cache every prefix match to avoid repeating lookups. */
            prefixMatches: {},
            /* Cache the anchor used for animating window scrolling. */
            scrollAnchor: null,
            /* Cache the browser-specific property names associated with the scroll anchor. */
            scrollPropertyLeft: null,
            scrollPropertyTop: null,
            /* Keep track of whether our RAF tick is running. */
            isTicking: false,
            /* Container for every in-progress call to Velocity. */
            calls: []
        },
        /* Velocity's custom CSS stack. Made global for unit testing. */
        CSS: { /* Defined below. */ },
        /* A shim of the jQuery utility functions used by Velocity -- provided by Velocity's optional jQuery shim. */
        Utilities: $,
        /* Container for the user's custom animation redirects that are referenced by name in place of the properties map argument. */
        Redirects: { /* Manually registered by the user. */ },
        Easings: { /* Defined below. */ },
        /* Attempt to use ES6 Promises by default. Users can override this with a third-party promises library. */
        Promise: window.Promise,
        /* Velocity option defaults, which can be overriden by the user. */
        defaults: {
            queue: "",
            duration: DURATION_DEFAULT,
            easing: EASING_DEFAULT,
            begin: undefined,
            complete: undefined,
            progress: undefined,
            display: undefined,
            visibility: undefined,
            loop: false,
            delay: false,
            mobileHA: true,
            /* Advanced: Set to false to prevent property values from being cached between consecutive Velocity-initiated chain calls. */
            _cacheValues: true
        },
        /* A design goal of Velocity is to cache data wherever possible in order to avoid DOM requerying. Accordingly, each element has a data cache. */
        init: function (element) {
            $.data(element, "velocity", {
                /* Store whether this is an SVG element, since its properties are retrieved and updated differently than standard HTML elements. */
                isSVG: Type.isSVG(element),
                /* Keep track of whether the element is currently being animated by Velocity.
                   This is used to ensure that property values are not transferred between non-consecutive (stale) calls. */
                isAnimating: false,
                /* A reference to the element's live computedStyle object. Learn more here: https://developer.mozilla.org/en/docs/Web/API/window.getComputedStyle */
                computedStyle: null,
                /* Tween data is cached for each animation on the element so that data can be passed across calls --
                   in particular, end values are used as subsequent start values in consecutive Velocity calls. */
                tweensContainer: null,
                /* The full root property values of each CSS hook being animated on this element are cached so that:
                   1) Concurrently-animating hooks sharing the same root can have their root values' merged into one while tweening.
                   2) Post-hook-injection root values can be transferred over to consecutively chained Velocity calls as starting root values. */
                rootPropertyValueCache: {},
                /* A cache for transform updates, which must be manually flushed via CSS.flushTransformCache(). */
                transformCache: {}
            });
        },
        /* A parallel to jQuery's $.css(), used for getting/setting Velocity's hooked CSS properties. */
        hook: null, /* Defined below. */
        /* Velocity-wide animation time remapping for testing purposes. */
        mock: false,
        version: { major: 1, minor: 2, patch: 2 },
        /* Set to 1 or 2 (most verbose) to output debug info to console. */
        debug: false
    };

    /* Retrieve the appropriate scroll anchor and property name for the browser: https://developer.mozilla.org/en-US/docs/Web/API/Window.scrollY */
    if (window.pageYOffset !== undefined) {
        Velocity.State.scrollAnchor = window;
        Velocity.State.scrollPropertyLeft = "pageXOffset";
        Velocity.State.scrollPropertyTop = "pageYOffset";
    } else {
        Velocity.State.scrollAnchor = document.documentElement || document.body.parentNode || document.body;
        Velocity.State.scrollPropertyLeft = "scrollLeft";
        Velocity.State.scrollPropertyTop = "scrollTop";
    }

    /* Shorthand alias for jQuery's $.data() utility. */
    function Data (element) {
        /* Hardcode a reference to the plugin name. */
        var response = $.data(element, "velocity");

        /* jQuery <=1.4.2 returns null instead of undefined when no match is found. We normalize this behavior. */
        return response === null ? undefined : response;
    };

    /**************
        Easing
    **************/

    /* Step easing generator. */
    function generateStep (steps) {
        return function (p) {
            return Math.round(p * steps) * (1 / steps);
        };
    }

    /* Bezier curve function generator. Copyright Gaetan Renaudeau. MIT License: http://en.wikipedia.org/wiki/MIT_License */
    function generateBezier (mX1, mY1, mX2, mY2) {
        var NEWTON_ITERATIONS = 4,
            NEWTON_MIN_SLOPE = 0.001,
            SUBDIVISION_PRECISION = 0.0000001,
            SUBDIVISION_MAX_ITERATIONS = 10,
            kSplineTableSize = 11,
            kSampleStepSize = 1.0 / (kSplineTableSize - 1.0),
            float32ArraySupported = "Float32Array" in window;

        /* Must contain four arguments. */
        if (arguments.length !== 4) {
            return false;
        }

        /* Arguments must be numbers. */
        for (var i = 0; i < 4; ++i) {
            if (typeof arguments[i] !== "number" || isNaN(arguments[i]) || !isFinite(arguments[i])) {
                return false;
            }
        }

        /* X values must be in the [0, 1] range. */
        mX1 = Math.min(mX1, 1);
        mX2 = Math.min(mX2, 1);
        mX1 = Math.max(mX1, 0);
        mX2 = Math.max(mX2, 0);

        var mSampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array(kSplineTableSize);

        function A (aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1; }
        function B (aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1; }
        function C (aA1)      { return 3.0 * aA1; }

        function calcBezier (aT, aA1, aA2) {
            return ((A(aA1, aA2)*aT + B(aA1, aA2))*aT + C(aA1))*aT;
        }

        function getSlope (aT, aA1, aA2) {
            return 3.0 * A(aA1, aA2)*aT*aT + 2.0 * B(aA1, aA2) * aT + C(aA1);
        }

        function newtonRaphsonIterate (aX, aGuessT) {
            for (var i = 0; i < NEWTON_ITERATIONS; ++i) {
                var currentSlope = getSlope(aGuessT, mX1, mX2);

                if (currentSlope === 0.0) return aGuessT;

                var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
                aGuessT -= currentX / currentSlope;
            }

            return aGuessT;
        }

        function calcSampleValues () {
            for (var i = 0; i < kSplineTableSize; ++i) {
                mSampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
            }
        }

        function binarySubdivide (aX, aA, aB) {
            var currentX, currentT, i = 0;

            do {
                currentT = aA + (aB - aA) / 2.0;
                currentX = calcBezier(currentT, mX1, mX2) - aX;
                if (currentX > 0.0) {
                  aB = currentT;
                } else {
                  aA = currentT;
                }
            } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);

            return currentT;
        }

        function getTForX (aX) {
            var intervalStart = 0.0,
                currentSample = 1,
                lastSample = kSplineTableSize - 1;

            for (; currentSample != lastSample && mSampleValues[currentSample] <= aX; ++currentSample) {
                intervalStart += kSampleStepSize;
            }

            --currentSample;

            var dist = (aX - mSampleValues[currentSample]) / (mSampleValues[currentSample+1] - mSampleValues[currentSample]),
                guessForT = intervalStart + dist * kSampleStepSize,
                initialSlope = getSlope(guessForT, mX1, mX2);

            if (initialSlope >= NEWTON_MIN_SLOPE) {
                return newtonRaphsonIterate(aX, guessForT);
            } else if (initialSlope == 0.0) {
                return guessForT;
            } else {
                return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize);
            }
        }

        var _precomputed = false;

        function precompute() {
            _precomputed = true;
            if (mX1 != mY1 || mX2 != mY2) calcSampleValues();
        }

        var f = function (aX) {
            if (!_precomputed) precompute();
            if (mX1 === mY1 && mX2 === mY2) return aX;
            if (aX === 0) return 0;
            if (aX === 1) return 1;

            return calcBezier(getTForX(aX), mY1, mY2);
        };

        f.getControlPoints = function() { return [{ x: mX1, y: mY1 }, { x: mX2, y: mY2 }]; };

        var str = "generateBezier(" + [mX1, mY1, mX2, mY2] + ")";
        f.toString = function () { return str; };

        return f;
    }

    /* Runge-Kutta spring physics function generator. Adapted from Framer.js, copyright Koen Bok. MIT License: http://en.wikipedia.org/wiki/MIT_License */
    /* Given a tension, friction, and duration, a simulation at 60FPS will first run without a defined duration in order to calculate the full path. A second pass
       then adjusts the time delta -- using the relation between actual time and duration -- to calculate the path for the duration-constrained animation. */
    var generateSpringRK4 = (function () {
        function springAccelerationForState (state) {
            return (-state.tension * state.x) - (state.friction * state.v);
        }

        function springEvaluateStateWithDerivative (initialState, dt, derivative) {
            var state = {
                x: initialState.x + derivative.dx * dt,
                v: initialState.v + derivative.dv * dt,
                tension: initialState.tension,
                friction: initialState.friction
            };

            return { dx: state.v, dv: springAccelerationForState(state) };
        }

        function springIntegrateState (state, dt) {
            var a = {
                    dx: state.v,
                    dv: springAccelerationForState(state)
                },
                b = springEvaluateStateWithDerivative(state, dt * 0.5, a),
                c = springEvaluateStateWithDerivative(state, dt * 0.5, b),
                d = springEvaluateStateWithDerivative(state, dt, c),
                dxdt = 1.0 / 6.0 * (a.dx + 2.0 * (b.dx + c.dx) + d.dx),
                dvdt = 1.0 / 6.0 * (a.dv + 2.0 * (b.dv + c.dv) + d.dv);

            state.x = state.x + dxdt * dt;
            state.v = state.v + dvdt * dt;

            return state;
        }

        return function springRK4Factory (tension, friction, duration) {

            var initState = {
                    x: -1,
                    v: 0,
                    tension: null,
                    friction: null
                },
                path = [0],
                time_lapsed = 0,
                tolerance = 1 / 10000,
                DT = 16 / 1000,
                have_duration, dt, last_state;

            tension = parseFloat(tension) || 500;
            friction = parseFloat(friction) || 20;
            duration = duration || null;

            initState.tension = tension;
            initState.friction = friction;

            have_duration = duration !== null;

            /* Calculate the actual time it takes for this animation to complete with the provided conditions. */
            if (have_duration) {
                /* Run the simulation without a duration. */
                time_lapsed = springRK4Factory(tension, friction);
                /* Compute the adjusted time delta. */
                dt = time_lapsed / duration * DT;
            } else {
                dt = DT;
            }

            while (true) {
                /* Next/step function .*/
                last_state = springIntegrateState(last_state || initState, dt);
                /* Store the position. */
                path.push(1 + last_state.x);
                time_lapsed += 16;
                /* If the change threshold is reached, break. */
                if (!(Math.abs(last_state.x) > tolerance && Math.abs(last_state.v) > tolerance)) {
                    break;
                }
            }

            /* If duration is not defined, return the actual time required for completing this animation. Otherwise, return a closure that holds the
               computed path and returns a snapshot of the position according to a given percentComplete. */
            return !have_duration ? time_lapsed : function(percentComplete) { return path[ (percentComplete * (path.length - 1)) | 0 ]; };
        };
    }());

    /* jQuery easings. */
    Velocity.Easings = {
        linear: function(p) { return p; },
        swing: function(p) { return 0.5 - Math.cos( p * Math.PI ) / 2 },
        /* Bonus "spring" easing, which is a less exaggerated version of easeInOutElastic. */
        spring: function(p) { return 1 - (Math.cos(p * 4.5 * Math.PI) * Math.exp(-p * 6)); }
    };

    /* CSS3 and Robert Penner easings. */
    $.each(
        [
            [ "ease", [ 0.25, 0.1, 0.25, 1.0 ] ],
            [ "ease-in", [ 0.42, 0.0, 1.00, 1.0 ] ],
            [ "ease-out", [ 0.00, 0.0, 0.58, 1.0 ] ],
            [ "ease-in-out", [ 0.42, 0.0, 0.58, 1.0 ] ],
            [ "easeInSine", [ 0.47, 0, 0.745, 0.715 ] ],
            [ "easeOutSine", [ 0.39, 0.575, 0.565, 1 ] ],
            [ "easeInOutSine", [ 0.445, 0.05, 0.55, 0.95 ] ],
            [ "easeInQuad", [ 0.55, 0.085, 0.68, 0.53 ] ],
            [ "easeOutQuad", [ 0.25, 0.46, 0.45, 0.94 ] ],
            [ "easeInOutQuad", [ 0.455, 0.03, 0.515, 0.955 ] ],
            [ "easeInCubic", [ 0.55, 0.055, 0.675, 0.19 ] ],
            [ "easeOutCubic", [ 0.215, 0.61, 0.355, 1 ] ],
            [ "easeInOutCubic", [ 0.645, 0.045, 0.355, 1 ] ],
            [ "easeInQuart", [ 0.895, 0.03, 0.685, 0.22 ] ],
            [ "easeOutQuart", [ 0.165, 0.84, 0.44, 1 ] ],
            [ "easeInOutQuart", [ 0.77, 0, 0.175, 1 ] ],
            [ "easeInQuint", [ 0.755, 0.05, 0.855, 0.06 ] ],
            [ "easeOutQuint", [ 0.23, 1, 0.32, 1 ] ],
            [ "easeInOutQuint", [ 0.86, 0, 0.07, 1 ] ],
            [ "easeInExpo", [ 0.95, 0.05, 0.795, 0.035 ] ],
            [ "easeOutExpo", [ 0.19, 1, 0.22, 1 ] ],
            [ "easeInOutExpo", [ 1, 0, 0, 1 ] ],
            [ "easeInCirc", [ 0.6, 0.04, 0.98, 0.335 ] ],
            [ "easeOutCirc", [ 0.075, 0.82, 0.165, 1 ] ],
            [ "easeInOutCirc", [ 0.785, 0.135, 0.15, 0.86 ] ]
        ], function(i, easingArray) {
            Velocity.Easings[easingArray[0]] = generateBezier.apply(null, easingArray[1]);
        });

    /* Determine the appropriate easing type given an easing input. */
    function getEasing(value, duration) {
        var easing = value;

        /* The easing option can either be a string that references a pre-registered easing,
           or it can be a two-/four-item array of integers to be converted into a bezier/spring function. */
        if (Type.isString(value)) {
            /* Ensure that the easing has been assigned to jQuery's Velocity.Easings object. */
            if (!Velocity.Easings[value]) {
                easing = false;
            }
        } else if (Type.isArray(value) && value.length === 1) {
            easing = generateStep.apply(null, value);
        } else if (Type.isArray(value) && value.length === 2) {
            /* springRK4 must be passed the animation's duration. */
            /* Note: If the springRK4 array contains non-numbers, generateSpringRK4() returns an easing
               function generated with default tension and friction values. */
            easing = generateSpringRK4.apply(null, value.concat([ duration ]));
        } else if (Type.isArray(value) && value.length === 4) {
            /* Note: If the bezier array contains non-numbers, generateBezier() returns false. */
            easing = generateBezier.apply(null, value);
        } else {
            easing = false;
        }

        /* Revert to the Velocity-wide default easing type, or fall back to "swing" (which is also jQuery's default)
           if the Velocity-wide default has been incorrectly modified. */
        if (easing === false) {
            if (Velocity.Easings[Velocity.defaults.easing]) {
                easing = Velocity.defaults.easing;
            } else {
                easing = EASING_DEFAULT;
            }
        }

        return easing;
    }

    /*****************
        CSS Stack
    *****************/

    /* The CSS object is a highly condensed and performant CSS stack that fully replaces jQuery's.
       It handles the validation, getting, and setting of both standard CSS properties and CSS property hooks. */
    /* Note: A "CSS" shorthand is aliased so that our code is easier to read. */
    var CSS = Velocity.CSS = {

        /*************
            RegEx
        *************/

        RegEx: {
            isHex: /^#([A-f\d]{3}){1,2}$/i,
            /* Unwrap a property value's surrounding text, e.g. "rgba(4, 3, 2, 1)" ==> "4, 3, 2, 1" and "rect(4px 3px 2px 1px)" ==> "4px 3px 2px 1px". */
            valueUnwrap: /^[A-z]+\((.*)\)$/i,
            wrappedValueAlreadyExtracted: /[0-9.]+ [0-9.]+ [0-9.]+( [0-9.]+)?/,
            /* Split a multi-value property into an array of subvalues, e.g. "rgba(4, 3, 2, 1) 4px 3px 2px 1px" ==> [ "rgba(4, 3, 2, 1)", "4px", "3px", "2px", "1px" ]. */
            valueSplit: /([A-z]+\(.+\))|(([A-z0-9#-.]+?)(?=\s|$))/ig
        },

        /************
            Lists
        ************/

        Lists: {
            colors: [ "fill", "stroke", "stopColor", "color", "backgroundColor", "borderColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor", "outlineColor" ],
            transformsBase: [ "translateX", "translateY", "scale", "scaleX", "scaleY", "skewX", "skewY", "rotateZ" ],
            transforms3D: [ "transformPerspective", "translateZ", "scaleZ", "rotateX", "rotateY" ]
        },

        /************
            Hooks
        ************/

        /* Hooks allow a subproperty (e.g. "boxShadowBlur") of a compound-value CSS property
           (e.g. "boxShadow: X Y Blur Spread Color") to be animated as if it were a discrete property. */
        /* Note: Beyond enabling fine-grained property animation, hooking is necessary since Velocity only
           tweens properties with single numeric values; unlike CSS transitions, Velocity does not interpolate compound-values. */
        Hooks: {
            /********************
                Registration
            ********************/

            /* Templates are a concise way of indicating which subproperties must be individually registered for each compound-value CSS property. */
            /* Each template consists of the compound-value's base name, its constituent subproperty names, and those subproperties' default values. */
            templates: {
                "textShadow": [ "Color X Y Blur", "black 0px 0px 0px" ],
                "boxShadow": [ "Color X Y Blur Spread", "black 0px 0px 0px 0px" ],
                "clip": [ "Top Right Bottom Left", "0px 0px 0px 0px" ],
                "backgroundPosition": [ "X Y", "0% 0%" ],
                "transformOrigin": [ "X Y Z", "50% 50% 0px" ],
                "perspectiveOrigin": [ "X Y", "50% 50%" ]
            },

            /* A "registered" hook is one that has been converted from its template form into a live,
               tweenable property. It contains data to associate it with its root property. */
            registered: {
                /* Note: A registered hook looks like this ==> textShadowBlur: [ "textShadow", 3 ],
                   which consists of the subproperty's name, the associated root property's name,
                   and the subproperty's position in the root's value. */
            },
            /* Convert the templates into individual hooks then append them to the registered object above. */
            register: function () {
                /* Color hooks registration: Colors are defaulted to white -- as opposed to black -- since colors that are
                   currently set to "transparent" default to their respective template below when color-animated,
                   and white is typically a closer match to transparent than black is. An exception is made for text ("color"),
                   which is almost always set closer to black than white. */
                for (var i = 0; i < CSS.Lists.colors.length; i++) {
                    var rgbComponents = (CSS.Lists.colors[i] === "color") ? "0 0 0 1" : "255 255 255 1";
                    CSS.Hooks.templates[CSS.Lists.colors[i]] = [ "Red Green Blue Alpha", rgbComponents ];
                }

                var rootProperty,
                    hookTemplate,
                    hookNames;

                /* In IE, color values inside compound-value properties are positioned at the end the value instead of at the beginning.
                   Thus, we re-arrange the templates accordingly. */
                if (IE) {
                    for (rootProperty in CSS.Hooks.templates) {
                        hookTemplate = CSS.Hooks.templates[rootProperty];
                        hookNames = hookTemplate[0].split(" ");

                        var defaultValues = hookTemplate[1].match(CSS.RegEx.valueSplit);

                        if (hookNames[0] === "Color") {
                            /* Reposition both the hook's name and its default value to the end of their respective strings. */
                            hookNames.push(hookNames.shift());
                            defaultValues.push(defaultValues.shift());

                            /* Replace the existing template for the hook's root property. */
                            CSS.Hooks.templates[rootProperty] = [ hookNames.join(" "), defaultValues.join(" ") ];
                        }
                    }
                }

                /* Hook registration. */
                for (rootProperty in CSS.Hooks.templates) {
                    hookTemplate = CSS.Hooks.templates[rootProperty];
                    hookNames = hookTemplate[0].split(" ");

                    for (var i in hookNames) {
                        var fullHookName = rootProperty + hookNames[i],
                            hookPosition = i;

                        /* For each hook, register its full name (e.g. textShadowBlur) with its root property (e.g. textShadow)
                           and the hook's position in its template's default value string. */
                        CSS.Hooks.registered[fullHookName] = [ rootProperty, hookPosition ];
                    }
                }
            },

            /*****************************
               Injection and Extraction
            *****************************/

            /* Look up the root property associated with the hook (e.g. return "textShadow" for "textShadowBlur"). */
            /* Since a hook cannot be set directly (the browser won't recognize it), style updating for hooks is routed through the hook's root property. */
            getRoot: function (property) {
                var hookData = CSS.Hooks.registered[property];

                if (hookData) {
                    return hookData[0];
                } else {
                    /* If there was no hook match, return the property name untouched. */
                    return property;
                }
            },
            /* Convert any rootPropertyValue, null or otherwise, into a space-delimited list of hook values so that
               the targeted hook can be injected or extracted at its standard position. */
            cleanRootPropertyValue: function(rootProperty, rootPropertyValue) {
                /* If the rootPropertyValue is wrapped with "rgb()", "clip()", etc., remove the wrapping to normalize the value before manipulation. */
                if (CSS.RegEx.valueUnwrap.test(rootPropertyValue)) {
                    rootPropertyValue = rootPropertyValue.match(CSS.RegEx.valueUnwrap)[1];
                }

                /* If rootPropertyValue is a CSS null-value (from which there's inherently no hook value to extract),
                   default to the root's default value as defined in CSS.Hooks.templates. */
                /* Note: CSS null-values include "none", "auto", and "transparent". They must be converted into their
                   zero-values (e.g. textShadow: "none" ==> textShadow: "0px 0px 0px black") for hook manipulation to proceed. */
                if (CSS.Values.isCSSNullValue(rootPropertyValue)) {
                    rootPropertyValue = CSS.Hooks.templates[rootProperty][1];
                }

                return rootPropertyValue;
            },
            /* Extracted the hook's value from its root property's value. This is used to get the starting value of an animating hook. */
            extractValue: function (fullHookName, rootPropertyValue) {
                var hookData = CSS.Hooks.registered[fullHookName];

                if (hookData) {
                    var hookRoot = hookData[0],
                        hookPosition = hookData[1];

                    rootPropertyValue = CSS.Hooks.cleanRootPropertyValue(hookRoot, rootPropertyValue);

                    /* Split rootPropertyValue into its constituent hook values then grab the desired hook at its standard position. */
                    return rootPropertyValue.toString().match(CSS.RegEx.valueSplit)[hookPosition];
                } else {
                    /* If the provided fullHookName isn't a registered hook, return the rootPropertyValue that was passed in. */
                    return rootPropertyValue;
                }
            },
            /* Inject the hook's value into its root property's value. This is used to piece back together the root property
               once Velocity has updated one of its individually hooked values through tweening. */
            injectValue: function (fullHookName, hookValue, rootPropertyValue) {
                var hookData = CSS.Hooks.registered[fullHookName];

                if (hookData) {
                    var hookRoot = hookData[0],
                        hookPosition = hookData[1],
                        rootPropertyValueParts,
                        rootPropertyValueUpdated;

                    rootPropertyValue = CSS.Hooks.cleanRootPropertyValue(hookRoot, rootPropertyValue);

                    /* Split rootPropertyValue into its individual hook values, replace the targeted value with hookValue,
                       then reconstruct the rootPropertyValue string. */
                    rootPropertyValueParts = rootPropertyValue.toString().match(CSS.RegEx.valueSplit);
                    rootPropertyValueParts[hookPosition] = hookValue;
                    rootPropertyValueUpdated = rootPropertyValueParts.join(" ");

                    return rootPropertyValueUpdated;
                } else {
                    /* If the provided fullHookName isn't a registered hook, return the rootPropertyValue that was passed in. */
                    return rootPropertyValue;
                }
            }
        },

        /*******************
           Normalizations
        *******************/

        /* Normalizations standardize CSS property manipulation by pollyfilling browser-specific implementations (e.g. opacity)
           and reformatting special properties (e.g. clip, rgba) to look like standard ones. */
        Normalizations: {
            /* Normalizations are passed a normalization target (either the property's name, its extracted value, or its injected value),
               the targeted element (which may need to be queried), and the targeted property value. */
            registered: {
                clip: function (type, element, propertyValue) {
                    switch (type) {
                        case "name":
                            return "clip";
                        /* Clip needs to be unwrapped and stripped of its commas during extraction. */
                        case "extract":
                            var extracted;

                            /* If Velocity also extracted this value, skip extraction. */
                            if (CSS.RegEx.wrappedValueAlreadyExtracted.test(propertyValue)) {
                                extracted = propertyValue;
                            } else {
                                /* Remove the "rect()" wrapper. */
                                extracted = propertyValue.toString().match(CSS.RegEx.valueUnwrap);

                                /* Strip off commas. */
                                extracted = extracted ? extracted[1].replace(/,(\s+)?/g, " ") : propertyValue;
                            }

                            return extracted;
                        /* Clip needs to be re-wrapped during injection. */
                        case "inject":
                            return "rect(" + propertyValue + ")";
                    }
                },

                blur: function(type, element, propertyValue) {
                    switch (type) {
                        case "name":
                            return Velocity.State.isFirefox ? "filter" : "-webkit-filter";
                        case "extract":
                            var extracted = parseFloat(propertyValue);

                            /* If extracted is NaN, meaning the value isn't already extracted. */
                            if (!(extracted || extracted === 0)) {
                                var blurComponent = propertyValue.toString().match(/blur\(([0-9]+[A-z]+)\)/i);

                                /* If the filter string had a blur component, return just the blur value and unit type. */
                                if (blurComponent) {
                                    extracted = blurComponent[1];
                                /* If the component doesn't exist, default blur to 0. */
                                } else {
                                    extracted = 0;
                                }
                            }

                            return extracted;
                        /* Blur needs to be re-wrapped during injection. */
                        case "inject":
                            /* For the blur effect to be fully de-applied, it needs to be set to "none" instead of 0. */
                            if (!parseFloat(propertyValue)) {
                                return "none";
                            } else {
                                return "blur(" + propertyValue + ")";
                            }
                    }
                },

                /* <=IE8 do not support the standard opacity property. They use filter:alpha(opacity=INT) instead. */
                opacity: function (type, element, propertyValue) {
                    if (IE <= 8) {
                        switch (type) {
                            case "name":
                                return "filter";
                            case "extract":
                                /* <=IE8 return a "filter" value of "alpha(opacity=\d{1,3})".
                                   Extract the value and convert it to a decimal value to match the standard CSS opacity property's formatting. */
                                var extracted = propertyValue.toString().match(/alpha\(opacity=(.*)\)/i);

                                if (extracted) {
                                    /* Convert to decimal value. */
                                    propertyValue = extracted[1] / 100;
                                } else {
                                    /* When extracting opacity, default to 1 since a null value means opacity hasn't been set. */
                                    propertyValue = 1;
                                }

                                return propertyValue;
                            case "inject":
                                /* Opacified elements are required to have their zoom property set to a non-zero value. */
                                element.style.zoom = 1;

                                /* Setting the filter property on elements with certain font property combinations can result in a
                                   highly unappealing ultra-bolding effect. There's no way to remedy this throughout a tween, but dropping the
                                   value altogether (when opacity hits 1) at leasts ensures that the glitch is gone post-tweening. */
                                if (parseFloat(propertyValue) >= 1) {
                                    return "";
                                } else {
                                  /* As per the filter property's spec, convert the decimal value to a whole number and wrap the value. */
                                  return "alpha(opacity=" + parseInt(parseFloat(propertyValue) * 100, 10) + ")";
                                }
                        }
                    /* With all other browsers, normalization is not required; return the same values that were passed in. */
                    } else {
                        switch (type) {
                            case "name":
                                return "opacity";
                            case "extract":
                                return propertyValue;
                            case "inject":
                                return propertyValue;
                        }
                    }
                }
            },

            /*****************************
                Batched Registrations
            *****************************/

            /* Note: Batched normalizations extend the CSS.Normalizations.registered object. */
            register: function () {

                /*****************
                    Transforms
                *****************/

                /* Transforms are the subproperties contained by the CSS "transform" property. Transforms must undergo normalization
                   so that they can be referenced in a properties map by their individual names. */
                /* Note: When transforms are "set", they are actually assigned to a per-element transformCache. When all transform
                   setting is complete complete, CSS.flushTransformCache() must be manually called to flush the values to the DOM.
                   Transform setting is batched in this way to improve performance: the transform style only needs to be updated
                   once when multiple transform subproperties are being animated simultaneously. */
                /* Note: IE9 and Android Gingerbread have support for 2D -- but not 3D -- transforms. Since animating unsupported
                   transform properties results in the browser ignoring the *entire* transform string, we prevent these 3D values
                   from being normalized for these browsers so that tweening skips these properties altogether
                   (since it will ignore them as being unsupported by the browser.) */
                if (!(IE <= 9) && !Velocity.State.isGingerbread) {
                    /* Note: Since the standalone CSS "perspective" property and the CSS transform "perspective" subproperty
                    share the same name, the latter is given a unique token within Velocity: "transformPerspective". */
                    CSS.Lists.transformsBase = CSS.Lists.transformsBase.concat(CSS.Lists.transforms3D);
                }

                for (var i = 0; i < CSS.Lists.transformsBase.length; i++) {
                    /* Wrap the dynamically generated normalization function in a new scope so that transformName's value is
                    paired with its respective function. (Otherwise, all functions would take the final for loop's transformName.) */
                    (function() {
                        var transformName = CSS.Lists.transformsBase[i];

                        CSS.Normalizations.registered[transformName] = function (type, element, propertyValue) {
                            switch (type) {
                                /* The normalized property name is the parent "transform" property -- the property that is actually set in CSS. */
                                case "name":
                                    return "transform";
                                /* Transform values are cached onto a per-element transformCache object. */
                                case "extract":
                                    /* If this transform has yet to be assigned a value, return its null value. */
                                    if (Data(element) === undefined || Data(element).transformCache[transformName] === undefined) {
                                        /* Scale CSS.Lists.transformsBase default to 1 whereas all other transform properties default to 0. */
                                        return /^scale/i.test(transformName) ? 1 : 0;
                                    /* When transform values are set, they are wrapped in parentheses as per the CSS spec.
                                       Thus, when extracting their values (for tween calculations), we strip off the parentheses. */
                                    } else {
                                        return Data(element).transformCache[transformName].replace(/[()]/g, "");
                                    }
                                case "inject":
                                    var invalid = false;

                                    /* If an individual transform property contains an unsupported unit type, the browser ignores the *entire* transform property.
                                       Thus, protect users from themselves by skipping setting for transform values supplied with invalid unit types. */
                                    /* Switch on the base transform type; ignore the axis by removing the last letter from the transform's name. */
                                    switch (transformName.substr(0, transformName.length - 1)) {
                                        /* Whitelist unit types for each transform. */
                                        case "translate":
                                            invalid = !/(%|px|em|rem|vw|vh|\d)$/i.test(propertyValue);
                                            break;
                                        /* Since an axis-free "scale" property is supported as well, a little hack is used here to detect it by chopping off its last letter. */
                                        case "scal":
                                        case "scale":
                                            /* Chrome on Android has a bug in which scaled elements blur if their initial scale
                                               value is below 1 (which can happen with forcefeeding). Thus, we detect a yet-unset scale property
                                               and ensure that its first value is always 1. More info: http://stackoverflow.com/questions/10417890/css3-animations-with-transform-causes-blurred-elements-on-webkit/10417962#10417962 */
                                            if (Velocity.State.isAndroid && Data(element).transformCache[transformName] === undefined && propertyValue < 1) {
                                                propertyValue = 1;
                                            }

                                            invalid = !/(\d)$/i.test(propertyValue);
                                            break;
                                        case "skew":
                                            invalid = !/(deg|\d)$/i.test(propertyValue);
                                            break;
                                        case "rotate":
                                            invalid = !/(deg|\d)$/i.test(propertyValue);
                                            break;
                                    }

                                    if (!invalid) {
                                        /* As per the CSS spec, wrap the value in parentheses. */
                                        Data(element).transformCache[transformName] = "(" + propertyValue + ")";
                                    }

                                    /* Although the value is set on the transformCache object, return the newly-updated value for the calling code to process as normal. */
                                    return Data(element).transformCache[transformName];
                            }
                        };
                    })();
                }

                /*************
                    Colors
                *************/

                /* Since Velocity only animates a single numeric value per property, color animation is achieved by hooking the individual RGBA components of CSS color properties.
                   Accordingly, color values must be normalized (e.g. "#ff0000", "red", and "rgb(255, 0, 0)" ==> "255 0 0 1") so that their components can be injected/extracted by CSS.Hooks logic. */
                for (var i = 0; i < CSS.Lists.colors.length; i++) {
                    /* Wrap the dynamically generated normalization function in a new scope so that colorName's value is paired with its respective function.
                       (Otherwise, all functions would take the final for loop's colorName.) */
                    (function () {
                        var colorName = CSS.Lists.colors[i];

                        /* Note: In IE<=8, which support rgb but not rgba, color properties are reverted to rgb by stripping off the alpha component. */
                        CSS.Normalizations.registered[colorName] = function(type, element, propertyValue) {
                            switch (type) {
                                case "name":
                                    return colorName;
                                /* Convert all color values into the rgb format. (Old IE can return hex values and color names instead of rgb/rgba.) */
                                case "extract":
                                    var extracted;

                                    /* If the color is already in its hookable form (e.g. "255 255 255 1") due to having been previously extracted, skip extraction. */
                                    if (CSS.RegEx.wrappedValueAlreadyExtracted.test(propertyValue)) {
                                        extracted = propertyValue;
                                    } else {
                                        var converted,
                                            colorNames = {
                                                black: "rgb(0, 0, 0)",
                                                blue: "rgb(0, 0, 255)",
                                                gray: "rgb(128, 128, 128)",
                                                green: "rgb(0, 128, 0)",
                                                red: "rgb(255, 0, 0)",
                                                white: "rgb(255, 255, 255)"
                                            };

                                        /* Convert color names to rgb. */
                                        if (/^[A-z]+$/i.test(propertyValue)) {
                                            if (colorNames[propertyValue] !== undefined) {
                                                converted = colorNames[propertyValue]
                                            } else {
                                                /* If an unmatched color name is provided, default to black. */
                                                converted = colorNames.black;
                                            }
                                        /* Convert hex values to rgb. */
                                        } else if (CSS.RegEx.isHex.test(propertyValue)) {
                                            converted = "rgb(" + CSS.Values.hexToRgb(propertyValue).join(" ") + ")";
                                        /* If the provided color doesn't match any of the accepted color formats, default to black. */
                                        } else if (!(/^rgba?\(/i.test(propertyValue))) {
                                            converted = colorNames.black;
                                        }

                                        /* Remove the surrounding "rgb/rgba()" string then replace commas with spaces and strip
                                           repeated spaces (in case the value included spaces to begin with). */
                                        extracted = (converted || propertyValue).toString().match(CSS.RegEx.valueUnwrap)[1].replace(/,(\s+)?/g, " ");
                                    }

                                    /* So long as this isn't <=IE8, add a fourth (alpha) component if it's missing and default it to 1 (visible). */
                                    if (!(IE <= 8) && extracted.split(" ").length === 3) {
                                        extracted += " 1";
                                    }

                                    return extracted;
                                case "inject":
                                    /* If this is IE<=8 and an alpha component exists, strip it off. */
                                    if (IE <= 8) {
                                        if (propertyValue.split(" ").length === 4) {
                                            propertyValue = propertyValue.split(/\s+/).slice(0, 3).join(" ");
                                        }
                                    /* Otherwise, add a fourth (alpha) component if it's missing and default it to 1 (visible). */
                                    } else if (propertyValue.split(" ").length === 3) {
                                        propertyValue += " 1";
                                    }

                                    /* Re-insert the browser-appropriate wrapper("rgb/rgba()"), insert commas, and strip off decimal units
                                       on all values but the fourth (R, G, and B only accept whole numbers). */
                                    return (IE <= 8 ? "rgb" : "rgba") + "(" + propertyValue.replace(/\s+/g, ",").replace(/\.(\d)+(?=,)/g, "") + ")";
                            }
                        };
                    })();
                }
            }
        },

        /************************
           CSS Property Names
        ************************/

        Names: {
            /* Camelcase a property name into its JavaScript notation (e.g. "background-color" ==> "backgroundColor").
               Camelcasing is used to normalize property names between and across calls. */
            camelCase: function (property) {
                return property.replace(/-(\w)/g, function (match, subMatch) {
                    return subMatch.toUpperCase();
                });
            },

            /* For SVG elements, some properties (namely, dimensional ones) are GET/SET via the element's HTML attributes (instead of via CSS styles). */
            SVGAttribute: function (property) {
                var SVGAttributes = "width|height|x|y|cx|cy|r|rx|ry|x1|x2|y1|y2";

                /* Certain browsers require an SVG transform to be applied as an attribute. (Otherwise, application via CSS is preferable due to 3D support.) */
                if (IE || (Velocity.State.isAndroid && !Velocity.State.isChrome)) {
                    SVGAttributes += "|transform";
                }

                return new RegExp("^(" + SVGAttributes + ")$", "i").test(property);
            },

            /* Determine whether a property should be set with a vendor prefix. */
            /* If a prefixed version of the property exists, return it. Otherwise, return the original property name.
               If the property is not at all supported by the browser, return a false flag. */
            prefixCheck: function (property) {
                /* If this property has already been checked, return the cached value. */
                if (Velocity.State.prefixMatches[property]) {
                    return [ Velocity.State.prefixMatches[property], true ];
                } else {
                    var vendors = [ "", "Webkit", "Moz", "ms", "O" ];

                    for (var i = 0, vendorsLength = vendors.length; i < vendorsLength; i++) {
                        var propertyPrefixed;

                        if (i === 0) {
                            propertyPrefixed = property;
                        } else {
                            /* Capitalize the first letter of the property to conform to JavaScript vendor prefix notation (e.g. webkitFilter). */
                            propertyPrefixed = vendors[i] + property.replace(/^\w/, function(match) { return match.toUpperCase(); });
                        }

                        /* Check if the browser supports this property as prefixed. */
                        if (Type.isString(Velocity.State.prefixElement.style[propertyPrefixed])) {
                            /* Cache the match. */
                            Velocity.State.prefixMatches[property] = propertyPrefixed;

                            return [ propertyPrefixed, true ];
                        }
                    }

                    /* If the browser doesn't support this property in any form, include a false flag so that the caller can decide how to proceed. */
                    return [ property, false ];
                }
            }
        },

        /************************
           CSS Property Values
        ************************/

        Values: {
            /* Hex to RGB conversion. Copyright Tim Down: http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb */
            hexToRgb: function (hex) {
                var shortformRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
                    longformRegex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i,
                    rgbParts;

                hex = hex.replace(shortformRegex, function (m, r, g, b) {
                    return r + r + g + g + b + b;
                });

                rgbParts = longformRegex.exec(hex);

                return rgbParts ? [ parseInt(rgbParts[1], 16), parseInt(rgbParts[2], 16), parseInt(rgbParts[3], 16) ] : [ 0, 0, 0 ];
            },

            isCSSNullValue: function (value) {
                /* The browser defaults CSS values that have not been set to either 0 or one of several possible null-value strings.
                   Thus, we check for both falsiness and these special strings. */
                /* Null-value checking is performed to default the special strings to 0 (for the sake of tweening) or their hook
                   templates as defined as CSS.Hooks (for the sake of hook injection/extraction). */
                /* Note: Chrome returns "rgba(0, 0, 0, 0)" for an undefined color whereas IE returns "transparent". */
                return (value == 0 || /^(none|auto|transparent|(rgba\(0, ?0, ?0, ?0\)))$/i.test(value));
            },

            /* Retrieve a property's default unit type. Used for assigning a unit type when one is not supplied by the user. */
            getUnitType: function (property) {
                if (/^(rotate|skew)/i.test(property)) {
                    return "deg";
                } else if (/(^(scale|scaleX|scaleY|scaleZ|alpha|flexGrow|flexHeight|zIndex|fontWeight)$)|((opacity|red|green|blue|alpha)$)/i.test(property)) {
                    /* The above properties are unitless. */
                    return "";
                } else {
                    /* Default to px for all other properties. */
                    return "px";
                }
            },

            /* HTML elements default to an associated display type when they're not set to display:none. */
            /* Note: This function is used for correctly setting the non-"none" display value in certain Velocity redirects, such as fadeIn/Out. */
            getDisplayType: function (element) {
                var tagName = element && element.tagName.toString().toLowerCase();

                if (/^(b|big|i|small|tt|abbr|acronym|cite|code|dfn|em|kbd|strong|samp|var|a|bdo|br|img|map|object|q|script|span|sub|sup|button|input|label|select|textarea)$/i.test(tagName)) {
                    return "inline";
                } else if (/^(li)$/i.test(tagName)) {
                    return "list-item";
                } else if (/^(tr)$/i.test(tagName)) {
                    return "table-row";
                } else if (/^(table)$/i.test(tagName)) {
                    return "table";
                } else if (/^(tbody)$/i.test(tagName)) {
                    return "table-row-group";
                /* Default to "block" when no match is found. */
                } else {
                    return "block";
                }
            },

            /* The class add/remove functions are used to temporarily apply a "velocity-animating" class to elements while they're animating. */
            addClass: function (element, className) {
                if (element.classList) {
                    element.classList.add(className);
                } else {
                    element.className += (element.className.length ? " " : "") + className;
                }
            },

            removeClass: function (element, className) {
                if (element.classList) {
                    element.classList.remove(className);
                } else {
                    element.className = element.className.toString().replace(new RegExp("(^|\\s)" + className.split(" ").join("|") + "(\\s|$)", "gi"), " ");
                }
            }
        },

        /****************************
           Style Getting & Setting
        ****************************/

        /* The singular getPropertyValue, which routes the logic for all normalizations, hooks, and standard CSS properties. */
        getPropertyValue: function (element, property, rootPropertyValue, forceStyleLookup) {
            /* Get an element's computed property value. */
            /* Note: Retrieving the value of a CSS property cannot simply be performed by checking an element's
               style attribute (which only reflects user-defined values). Instead, the browser must be queried for a property's
               *computed* value. You can read more about getComputedStyle here: https://developer.mozilla.org/en/docs/Web/API/window.getComputedStyle */
            function computePropertyValue (element, property) {
                /* When box-sizing isn't set to border-box, height and width style values are incorrectly computed when an
                   element's scrollbars are visible (which expands the element's dimensions). Thus, we defer to the more accurate
                   offsetHeight/Width property, which includes the total dimensions for interior, border, padding, and scrollbar.
                   We subtract border and padding to get the sum of interior + scrollbar. */
                var computedValue = 0;

                /* IE<=8 doesn't support window.getComputedStyle, thus we defer to jQuery, which has an extensive array
                   of hacks to accurately retrieve IE8 property values. Re-implementing that logic here is not worth bloating the
                   codebase for a dying browser. The performance repercussions of using jQuery here are minimal since
                   Velocity is optimized to rarely (and sometimes never) query the DOM. Further, the $.css() codepath isn't that slow. */
                if (IE <= 8) {
                    computedValue = $.css(element, property); /* GET */
                /* All other browsers support getComputedStyle. The returned live object reference is cached onto its
                   associated element so that it does not need to be refetched upon every GET. */
                } else {
                    /* Browsers do not return height and width values for elements that are set to display:"none". Thus, we temporarily
                       toggle display to the element type's default value. */
                    var toggleDisplay = false;

                    if (/^(width|height)$/.test(property) && CSS.getPropertyValue(element, "display") === 0) {
                        toggleDisplay = true;
                        CSS.setPropertyValue(element, "display", CSS.Values.getDisplayType(element));
                    }

                    function revertDisplay () {
                        if (toggleDisplay) {
                            CSS.setPropertyValue(element, "display", "none");
                        }
                    }

                    if (!forceStyleLookup) {
                        if (property === "height" && CSS.getPropertyValue(element, "boxSizing").toString().toLowerCase() !== "border-box") {
                            var contentBoxHeight = element.offsetHeight - (parseFloat(CSS.getPropertyValue(element, "borderTopWidth")) || 0) - (parseFloat(CSS.getPropertyValue(element, "borderBottomWidth")) || 0) - (parseFloat(CSS.getPropertyValue(element, "paddingTop")) || 0) - (parseFloat(CSS.getPropertyValue(element, "paddingBottom")) || 0);
                            revertDisplay();

                            return contentBoxHeight;
                        } else if (property === "width" && CSS.getPropertyValue(element, "boxSizing").toString().toLowerCase() !== "border-box") {
                            var contentBoxWidth = element.offsetWidth - (parseFloat(CSS.getPropertyValue(element, "borderLeftWidth")) || 0) - (parseFloat(CSS.getPropertyValue(element, "borderRightWidth")) || 0) - (parseFloat(CSS.getPropertyValue(element, "paddingLeft")) || 0) - (parseFloat(CSS.getPropertyValue(element, "paddingRight")) || 0);
                            revertDisplay();

                            return contentBoxWidth;
                        }
                    }

                    var computedStyle;

                    /* For elements that Velocity hasn't been called on directly (e.g. when Velocity queries the DOM on behalf
                       of a parent of an element its animating), perform a direct getComputedStyle lookup since the object isn't cached. */
                    if (Data(element) === undefined) {
                        computedStyle = window.getComputedStyle(element, null); /* GET */
                    /* If the computedStyle object has yet to be cached, do so now. */
                    } else if (!Data(element).computedStyle) {
                        computedStyle = Data(element).computedStyle = window.getComputedStyle(element, null); /* GET */
                    /* If computedStyle is cached, use it. */
                    } else {
                        computedStyle = Data(element).computedStyle;
                    }

                    /* IE and Firefox do not return a value for the generic borderColor -- they only return individual values for each border side's color.
                       Also, in all browsers, when border colors aren't all the same, a compound value is returned that Velocity isn't setup to parse.
                       So, as a polyfill for querying individual border side colors, we just return the top border's color and animate all borders from that value. */
                    if (property === "borderColor") {
                        property = "borderTopColor";
                    }

                    /* IE9 has a bug in which the "filter" property must be accessed from computedStyle using the getPropertyValue method
                       instead of a direct property lookup. The getPropertyValue method is slower than a direct lookup, which is why we avoid it by default. */
                    if (IE === 9 && property === "filter") {
                        computedValue = computedStyle.getPropertyValue(property); /* GET */
                    } else {
                        computedValue = computedStyle[property];
                    }

                    /* Fall back to the property's style value (if defined) when computedValue returns nothing,
                       which can happen when the element hasn't been painted. */
                    if (computedValue === "" || computedValue === null) {
                        computedValue = element.style[property];
                    }

                    revertDisplay();
                }

                /* For top, right, bottom, and left (TRBL) values that are set to "auto" on elements of "fixed" or "absolute" position,
                   defer to jQuery for converting "auto" to a numeric value. (For elements with a "static" or "relative" position, "auto" has the same
                   effect as being set to 0, so no conversion is necessary.) */
                /* An example of why numeric conversion is necessary: When an element with "position:absolute" has an untouched "left"
                   property, which reverts to "auto", left's value is 0 relative to its parent element, but is often non-zero relative
                   to its *containing* (not parent) element, which is the nearest "position:relative" ancestor or the viewport (and always the viewport in the case of "position:fixed"). */
                if (computedValue === "auto" && /^(top|right|bottom|left)$/i.test(property)) {
                    var position = computePropertyValue(element, "position"); /* GET */

                    /* For absolute positioning, jQuery's $.position() only returns values for top and left;
                       right and bottom will have their "auto" value reverted to 0. */
                    /* Note: A jQuery object must be created here since jQuery doesn't have a low-level alias for $.position().
                       Not a big deal since we're currently in a GET batch anyway. */
                    if (position === "fixed" || (position === "absolute" && /top|left/i.test(property))) {
                        /* Note: jQuery strips the pixel unit from its returned values; we re-add it here to conform with computePropertyValue's behavior. */
                        computedValue = $(element).position()[property] + "px"; /* GET */
                    }
                }

                return computedValue;
            }

            var propertyValue;

            /* If this is a hooked property (e.g. "clipLeft" instead of the root property of "clip"),
               extract the hook's value from a normalized rootPropertyValue using CSS.Hooks.extractValue(). */
            if (CSS.Hooks.registered[property]) {
                var hook = property,
                    hookRoot = CSS.Hooks.getRoot(hook);

                /* If a cached rootPropertyValue wasn't passed in (which Velocity always attempts to do in order to avoid requerying the DOM),
                   query the DOM for the root property's value. */
                if (rootPropertyValue === undefined) {
                    /* Since the browser is now being directly queried, use the official post-prefixing property name for this lookup. */
                    rootPropertyValue = CSS.getPropertyValue(element, CSS.Names.prefixCheck(hookRoot)[0]); /* GET */
                }

                /* If this root has a normalization registered, peform the associated normalization extraction. */
                if (CSS.Normalizations.registered[hookRoot]) {
                    rootPropertyValue = CSS.Normalizations.registered[hookRoot]("extract", element, rootPropertyValue);
                }

                /* Extract the hook's value. */
                propertyValue = CSS.Hooks.extractValue(hook, rootPropertyValue);

            /* If this is a normalized property (e.g. "opacity" becomes "filter" in <=IE8) or "translateX" becomes "transform"),
               normalize the property's name and value, and handle the special case of transforms. */
            /* Note: Normalizing a property is mutually exclusive from hooking a property since hook-extracted values are strictly
               numerical and therefore do not require normalization extraction. */
            } else if (CSS.Normalizations.registered[property]) {
                var normalizedPropertyName,
                    normalizedPropertyValue;

                normalizedPropertyName = CSS.Normalizations.registered[property]("name", element);

                /* Transform values are calculated via normalization extraction (see below), which checks against the element's transformCache.
                   At no point do transform GETs ever actually query the DOM; initial stylesheet values are never processed.
                   This is because parsing 3D transform matrices is not always accurate and would bloat our codebase;
                   thus, normalization extraction defaults initial transform values to their zero-values (e.g. 1 for scaleX and 0 for translateX). */
                if (normalizedPropertyName !== "transform") {
                    normalizedPropertyValue = computePropertyValue(element, CSS.Names.prefixCheck(normalizedPropertyName)[0]); /* GET */

                    /* If the value is a CSS null-value and this property has a hook template, use that zero-value template so that hooks can be extracted from it. */
                    if (CSS.Values.isCSSNullValue(normalizedPropertyValue) && CSS.Hooks.templates[property]) {
                        normalizedPropertyValue = CSS.Hooks.templates[property][1];
                    }
                }

                propertyValue = CSS.Normalizations.registered[property]("extract", element, normalizedPropertyValue);
            }

            /* If a (numeric) value wasn't produced via hook extraction or normalization, query the DOM. */
            if (!/^[\d-]/.test(propertyValue)) {
                /* For SVG elements, dimensional properties (which SVGAttribute() detects) are tweened via
                   their HTML attribute values instead of their CSS style values. */
                if (Data(element) && Data(element).isSVG && CSS.Names.SVGAttribute(property)) {
                    /* Since the height/width attribute values must be set manually, they don't reflect computed values.
                       Thus, we use use getBBox() to ensure we always get values for elements with undefined height/width attributes. */
                    if (/^(height|width)$/i.test(property)) {
                        /* Firefox throws an error if .getBBox() is called on an SVG that isn't attached to the DOM. */
                        try {
                            propertyValue = element.getBBox()[property];
                        } catch (error) {
                            propertyValue = 0;
                        }
                    /* Otherwise, access the attribute value directly. */
                    } else {
                        propertyValue = element.getAttribute(property);
                    }
                } else {
                    propertyValue = computePropertyValue(element, CSS.Names.prefixCheck(property)[0]); /* GET */
                }
            }

            /* Since property lookups are for animation purposes (which entails computing the numeric delta between start and end values),
               convert CSS null-values to an integer of value 0. */
            if (CSS.Values.isCSSNullValue(propertyValue)) {
                propertyValue = 0;
            }

            if (Velocity.debug >= 2) console.log("Get " + property + ": " + propertyValue);

            return propertyValue;
        },

        /* The singular setPropertyValue, which routes the logic for all normalizations, hooks, and standard CSS properties. */
        setPropertyValue: function(element, property, propertyValue, rootPropertyValue, scrollData) {
            var propertyName = property;

            /* In order to be subjected to call options and element queueing, scroll animation is routed through Velocity as if it were a standard CSS property. */
            if (property === "scroll") {
                /* If a container option is present, scroll the container instead of the browser window. */
                if (scrollData.container) {
                    scrollData.container["scroll" + scrollData.direction] = propertyValue;
                /* Otherwise, Velocity defaults to scrolling the browser window. */
                } else {
                    if (scrollData.direction === "Left") {
                        window.scrollTo(propertyValue, scrollData.alternateValue);
                    } else {
                        window.scrollTo(scrollData.alternateValue, propertyValue);
                    }
                }
            } else {
                /* Transforms (translateX, rotateZ, etc.) are applied to a per-element transformCache object, which is manually flushed via flushTransformCache().
                   Thus, for now, we merely cache transforms being SET. */
                if (CSS.Normalizations.registered[property] && CSS.Normalizations.registered[property]("name", element) === "transform") {
                    /* Perform a normalization injection. */
                    /* Note: The normalization logic handles the transformCache updating. */
                    CSS.Normalizations.registered[property]("inject", element, propertyValue);

                    propertyName = "transform";
                    propertyValue = Data(element).transformCache[property];
                } else {
                    /* Inject hooks. */
                    if (CSS.Hooks.registered[property]) {
                        var hookName = property,
                            hookRoot = CSS.Hooks.getRoot(property);

                        /* If a cached rootPropertyValue was not provided, query the DOM for the hookRoot's current value. */
                        rootPropertyValue = rootPropertyValue || CSS.getPropertyValue(element, hookRoot); /* GET */

                        propertyValue = CSS.Hooks.injectValue(hookName, propertyValue, rootPropertyValue);
                        property = hookRoot;
                    }

                    /* Normalize names and values. */
                    if (CSS.Normalizations.registered[property]) {
                        propertyValue = CSS.Normalizations.registered[property]("inject", element, propertyValue);
                        property = CSS.Normalizations.registered[property]("name", element);
                    }

                    /* Assign the appropriate vendor prefix before performing an official style update. */
                    propertyName = CSS.Names.prefixCheck(property)[0];

                    /* A try/catch is used for IE<=8, which throws an error when "invalid" CSS values are set, e.g. a negative width.
                       Try/catch is avoided for other browsers since it incurs a performance overhead. */
                    if (IE <= 8) {
                        try {
                            element.style[propertyName] = propertyValue;
                        } catch (error) { if (Velocity.debug) console.log("Browser does not support [" + propertyValue + "] for [" + propertyName + "]"); }
                    /* SVG elements have their dimensional properties (width, height, x, y, cx, etc.) applied directly as attributes instead of as styles. */
                    /* Note: IE8 does not support SVG elements, so it's okay that we skip it for SVG animation. */
                    } else if (Data(element) && Data(element).isSVG && CSS.Names.SVGAttribute(property)) {
                        /* Note: For SVG attributes, vendor-prefixed property names are never used. */
                        /* Note: Not all CSS properties can be animated via attributes, but the browser won't throw an error for unsupported properties. */
                        element.setAttribute(property, propertyValue);
                    } else {
                        element.style[propertyName] = propertyValue;
                    }

                    if (Velocity.debug >= 2) console.log("Set " + property + " (" + propertyName + "): " + propertyValue);
                }
            }

            /* Return the normalized property name and value in case the caller wants to know how these values were modified before being applied to the DOM. */
            return [ propertyName, propertyValue ];
        },

        /* To increase performance by batching transform updates into a single SET, transforms are not directly applied to an element until flushTransformCache() is called. */
        /* Note: Velocity applies transform properties in the same order that they are chronogically introduced to the element's CSS styles. */
        flushTransformCache: function(element) {
            var transformString = "";

            /* Certain browsers require that SVG transforms be applied as an attribute. However, the SVG transform attribute takes a modified version of CSS's transform string
               (units are dropped and, except for skewX/Y, subproperties are merged into their master property -- e.g. scaleX and scaleY are merged into scale(X Y). */
            if ((IE || (Velocity.State.isAndroid && !Velocity.State.isChrome)) && Data(element).isSVG) {
                /* Since transform values are stored in their parentheses-wrapped form, we use a helper function to strip out their numeric values.
                   Further, SVG transform properties only take unitless (representing pixels) values, so it's okay that parseFloat() strips the unit suffixed to the float value. */
                function getTransformFloat (transformProperty) {
                    return parseFloat(CSS.getPropertyValue(element, transformProperty));
                }

                /* Create an object to organize all the transforms that we'll apply to the SVG element. To keep the logic simple,
                   we process *all* transform properties -- even those that may not be explicitly applied (since they default to their zero-values anyway). */
                var SVGTransforms = {
                    translate: [ getTransformFloat("translateX"), getTransformFloat("translateY") ],
                    skewX: [ getTransformFloat("skewX") ], skewY: [ getTransformFloat("skewY") ],
                    /* If the scale property is set (non-1), use that value for the scaleX and scaleY values
                       (this behavior mimics the result of animating all these properties at once on HTML elements). */
                    scale: getTransformFloat("scale") !== 1 ? [ getTransformFloat("scale"), getTransformFloat("scale") ] : [ getTransformFloat("scaleX"), getTransformFloat("scaleY") ],
                    /* Note: SVG's rotate transform takes three values: rotation degrees followed by the X and Y values
                       defining the rotation's origin point. We ignore the origin values (default them to 0). */
                    rotate: [ getTransformFloat("rotateZ"), 0, 0 ]
                };

                /* Iterate through the transform properties in the user-defined property map order.
                   (This mimics the behavior of non-SVG transform animation.) */
                $.each(Data(element).transformCache, function(transformName) {
                    /* Except for with skewX/Y, revert the axis-specific transform subproperties to their axis-free master
                       properties so that they match up with SVG's accepted transform properties. */
                    if (/^translate/i.test(transformName)) {
                        transformName = "translate";
                    } else if (/^scale/i.test(transformName)) {
                        transformName = "scale";
                    } else if (/^rotate/i.test(transformName)) {
                        transformName = "rotate";
                    }

                    /* Check that we haven't yet deleted the property from the SVGTransforms container. */
                    if (SVGTransforms[transformName]) {
                        /* Append the transform property in the SVG-supported transform format. As per the spec, surround the space-delimited values in parentheses. */
                        transformString += transformName + "(" + SVGTransforms[transformName].join(" ") + ")" + " ";

                        /* After processing an SVG transform property, delete it from the SVGTransforms container so we don't
                           re-insert the same master property if we encounter another one of its axis-specific properties. */
                        delete SVGTransforms[transformName];
                    }
                });
            } else {
                var transformValue,
                    perspective;

                /* Transform properties are stored as members of the transformCache object. Concatenate all the members into a string. */
                $.each(Data(element).transformCache, function(transformName) {
                    transformValue = Data(element).transformCache[transformName];

                    /* Transform's perspective subproperty must be set first in order to take effect. Store it temporarily. */
                    if (transformName === "transformPerspective") {
                        perspective = transformValue;
                        return true;
                    }

                    /* IE9 only supports one rotation type, rotateZ, which it refers to as "rotate". */
                    if (IE === 9 && transformName === "rotateZ") {
                        transformName = "rotate";
                    }

                    transformString += transformName + transformValue + " ";
                });

                /* If present, set the perspective subproperty first. */
                if (perspective) {
                    transformString = "perspective" + perspective + " " + transformString;
                }
            }

            CSS.setPropertyValue(element, "transform", transformString);
        }
    };

    /* Register hooks and normalizations. */
    CSS.Hooks.register();
    CSS.Normalizations.register();

    /* Allow hook setting in the same fashion as jQuery's $.css(). */
    Velocity.hook = function (elements, arg2, arg3) {
        var value = undefined;

        elements = sanitizeElements(elements);

        $.each(elements, function(i, element) {
            /* Initialize Velocity's per-element data cache if this element hasn't previously been animated. */
            if (Data(element) === undefined) {
                Velocity.init(element);
            }

            /* Get property value. If an element set was passed in, only return the value for the first element. */
            if (arg3 === undefined) {
                if (value === undefined) {
                    value = Velocity.CSS.getPropertyValue(element, arg2);
                }
            /* Set property value. */
            } else {
                /* sPV returns an array of the normalized propertyName/propertyValue pair used to update the DOM. */
                var adjustedSet = Velocity.CSS.setPropertyValue(element, arg2, arg3);

                /* Transform properties don't automatically set. They have to be flushed to the DOM. */
                if (adjustedSet[0] === "transform") {
                    Velocity.CSS.flushTransformCache(element);
                }

                value = adjustedSet;
            }
        });

        return value;
    };

    /*****************
        Animation
    *****************/

    var animate = function() {

        /******************
            Call Chain
        ******************/

        /* Logic for determining what to return to the call stack when exiting out of Velocity. */
        function getChain () {
            /* If we are using the utility function, attempt to return this call's promise. If no promise library was detected,
               default to null instead of returning the targeted elements so that utility function's return value is standardized. */
            if (isUtility) {
                return promiseData.promise || null;
            /* Otherwise, if we're using $.fn, return the jQuery-/Zepto-wrapped element set. */
            } else {
                return elementsWrapped;
            }
        }

        /*************************
           Arguments Assignment
        *************************/

        /* To allow for expressive CoffeeScript code, Velocity supports an alternative syntax in which "elements" (or "e"), "properties" (or "p"), and "options" (or "o")
           objects are defined on a container object that's passed in as Velocity's sole argument. */
        /* Note: Some browsers automatically populate arguments with a "properties" object. We detect it by checking for its default "names" property. */
        var syntacticSugar = (arguments[0] && (arguments[0].p || (($.isPlainObject(arguments[0].properties) && !arguments[0].properties.names) || Type.isString(arguments[0].properties)))),
            /* Whether Velocity was called via the utility function (as opposed to on a jQuery/Zepto object). */
            isUtility,
            /* When Velocity is called via the utility function ($.Velocity()/Velocity()), elements are explicitly
               passed in as the first parameter. Thus, argument positioning varies. We normalize them here. */
            elementsWrapped,
            argumentIndex;

        var elements,
            propertiesMap,
            options;

        /* Detect jQuery/Zepto elements being animated via the $.fn method. */
        if (Type.isWrapped(this)) {
            isUtility = false;

            argumentIndex = 0;
            elements = this;
            elementsWrapped = this;
        /* Otherwise, raw elements are being animated via the utility function. */
        } else {
            isUtility = true;

            argumentIndex = 1;
            elements = syntacticSugar ? (arguments[0].elements || arguments[0].e) : arguments[0];
        }

        elements = sanitizeElements(elements);

        if (!elements) {
            return;
        }

        if (syntacticSugar) {
            propertiesMap = arguments[0].properties || arguments[0].p;
            options = arguments[0].options || arguments[0].o;
        } else {
            propertiesMap = arguments[argumentIndex];
            options = arguments[argumentIndex + 1];
        }

        /* The length of the element set (in the form of a nodeList or an array of elements) is defaulted to 1 in case a
           single raw DOM element is passed in (which doesn't contain a length property). */
        var elementsLength = elements.length,
            elementsIndex = 0;

        /***************************
            Argument Overloading
        ***************************/

        /* Support is included for jQuery's argument overloading: $.animate(propertyMap [, duration] [, easing] [, complete]).
           Overloading is detected by checking for the absence of an object being passed into options. */
        /* Note: The stop and finish actions do not accept animation options, and are therefore excluded from this check. */
        if (!/^(stop|finish)$/i.test(propertiesMap) && !$.isPlainObject(options)) {
            /* The utility function shifts all arguments one position to the right, so we adjust for that offset. */
            var startingArgumentPosition = argumentIndex + 1;

            options = {};

            /* Iterate through all options arguments */
            for (var i = startingArgumentPosition; i < arguments.length; i++) {
                /* Treat a number as a duration. Parse it out. */
                /* Note: The following RegEx will return true if passed an array with a number as its first item.
                   Thus, arrays are skipped from this check. */
                if (!Type.isArray(arguments[i]) && (/^(fast|normal|slow)$/i.test(arguments[i]) || /^\d/.test(arguments[i]))) {
                    options.duration = arguments[i];
                /* Treat strings and arrays as easings. */
                } else if (Type.isString(arguments[i]) || Type.isArray(arguments[i])) {
                    options.easing = arguments[i];
                /* Treat a function as a complete callback. */
                } else if (Type.isFunction(arguments[i])) {
                    options.complete = arguments[i];
                }
            }
        }

        /***************
            Promises
        ***************/

        var promiseData = {
                promise: null,
                resolver: null,
                rejecter: null
            };

        /* If this call was made via the utility function (which is the default method of invocation when jQuery/Zepto are not being used), and if
           promise support was detected, create a promise object for this call and store references to its resolver and rejecter methods. The resolve
           method is used when a call completes naturally or is prematurely stopped by the user. In both cases, completeCall() handles the associated
           call cleanup and promise resolving logic. The reject method is used when an invalid set of arguments is passed into a Velocity call. */
        /* Note: Velocity employs a call-based queueing architecture, which means that stopping an animating element actually stops the full call that
           triggered it -- not that one element exclusively. Similarly, there is one promise per call, and all elements targeted by a Velocity call are
           grouped together for the purposes of resolving and rejecting a promise. */
        if (isUtility && Velocity.Promise) {
            promiseData.promise = new Velocity.Promise(function (resolve, reject) {
                promiseData.resolver = resolve;
                promiseData.rejecter = reject;
            });
        }

        /*********************
           Action Detection
        *********************/

        /* Velocity's behavior is categorized into "actions": Elements can either be specially scrolled into view,
           or they can be started, stopped, or reversed. If a literal or referenced properties map is passed in as Velocity's
           first argument, the associated action is "start". Alternatively, "scroll", "reverse", or "stop" can be passed in instead of a properties map. */
        var action;

        switch (propertiesMap) {
            case "scroll":
                action = "scroll";
                break;

            case "reverse":
                action = "reverse";
                break;

            case "finish":
            case "stop":
                /*******************
                    Action: Stop
                *******************/

                /* Clear the currently-active delay on each targeted element. */
                $.each(elements, function(i, element) {
                    if (Data(element) && Data(element).delayTimer) {
                        /* Stop the timer from triggering its cached next() function. */
                        clearTimeout(Data(element).delayTimer.setTimeout);

                        /* Manually call the next() function so that the subsequent queue items can progress. */
                        if (Data(element).delayTimer.next) {
                            Data(element).delayTimer.next();
                        }

                        delete Data(element).delayTimer;
                    }
                });

                var callsToStop = [];

                /* When the stop action is triggered, the elements' currently active call is immediately stopped. The active call might have
                   been applied to multiple elements, in which case all of the call's elements will be stopped. When an element
                   is stopped, the next item in its animation queue is immediately triggered. */
                /* An additional argument may be passed in to clear an element's remaining queued calls. Either true (which defaults to the "fx" queue)
                   or a custom queue string can be passed in. */
                /* Note: The stop command runs prior to Velocity's Queueing phase since its behavior is intended to take effect *immediately*,
                   regardless of the element's current queue state. */

                /* Iterate through every active call. */
                $.each(Velocity.State.calls, function(i, activeCall) {
                    /* Inactive calls are set to false by the logic inside completeCall(). Skip them. */
                    if (activeCall) {
                        /* Iterate through the active call's targeted elements. */
                        $.each(activeCall[1], function(k, activeElement) {
                            /* If true was passed in as a secondary argument, clear absolutely all calls on this element. Otherwise, only
                               clear calls associated with the relevant queue. */
                            /* Call stopping logic works as follows:
                               - options === true --> stop current default queue calls (and queue:false calls), including remaining queued ones.
                               - options === undefined --> stop current queue:"" call and all queue:false calls.
                               - options === false --> stop only queue:false calls.
                               - options === "custom" --> stop current queue:"custom" call, including remaining queued ones (there is no functionality to only clear the currently-running queue:"custom" call). */
                            var queueName = (options === undefined) ? "" : options;

                            if (queueName !== true && (activeCall[2].queue !== queueName) && !(options === undefined && activeCall[2].queue === false)) {
                                return true;
                            }

                            /* Iterate through the calls targeted by the stop command. */
                            $.each(elements, function(l, element) {                                
                                /* Check that this call was applied to the target element. */
                                if (element === activeElement) {
                                    /* Optionally clear the remaining queued calls. */
                                    if (options === true || Type.isString(options)) {
                                        /* Iterate through the items in the element's queue. */
                                        $.each($.queue(element, Type.isString(options) ? options : ""), function(_, item) {
                                            /* The queue array can contain an "inprogress" string, which we skip. */
                                            if (Type.isFunction(item)) {
                                                /* Pass the item's callback a flag indicating that we want to abort from the queue call.
                                                   (Specifically, the queue will resolve the call's associated promise then abort.)  */
                                                item(null, true);
                                            }
                                        });

                                        /* Clearing the $.queue() array is achieved by resetting it to []. */
                                        $.queue(element, Type.isString(options) ? options : "", []);
                                    }

                                    if (propertiesMap === "stop") {
                                        /* Since "reverse" uses cached start values (the previous call's endValues), these values must be
                                           changed to reflect the final value that the elements were actually tweened to. */
                                        /* Note: If only queue:false animations are currently running on an element, it won't have a tweensContainer
                                           object. Also, queue:false animations can't be reversed. */
                                        if (Data(element) && Data(element).tweensContainer && queueName !== false) {
                                            $.each(Data(element).tweensContainer, function(m, activeTween) {
                                                activeTween.endValue = activeTween.currentValue;
                                            });
                                        }

                                        callsToStop.push(i);
                                    } else if (propertiesMap === "finish") {
                                        /* To get active tweens to finish immediately, we forcefully shorten their durations to 1ms so that
                                        they finish upon the next rAf tick then proceed with normal call completion logic. */
                                        activeCall[2].duration = 1;
                                    }
                                }
                            });
                        });
                    }
                });

                /* Prematurely call completeCall() on each matched active call. Pass an additional flag for "stop" to indicate
                   that the complete callback and display:none setting should be skipped since we're completing prematurely. */
                if (propertiesMap === "stop") {
                    $.each(callsToStop, function(i, j) {
                        completeCall(j, true);
                    });

                    if (promiseData.promise) {
                        /* Immediately resolve the promise associated with this stop call since stop runs synchronously. */
                        promiseData.resolver(elements);
                    }
                }

                /* Since we're stopping, and not proceeding with queueing, exit out of Velocity. */
                return getChain();

            default:
                /* Treat a non-empty plain object as a literal properties map. */
                if ($.isPlainObject(propertiesMap) && !Type.isEmptyObject(propertiesMap)) {
                    action = "start";

                /****************
                    Redirects
                ****************/

                /* Check if a string matches a registered redirect (see Redirects above). */
                } else if (Type.isString(propertiesMap) && Velocity.Redirects[propertiesMap]) {
                    var opts = $.extend({}, options),
                        durationOriginal = opts.duration,
                        delayOriginal = opts.delay || 0;

                    /* If the backwards option was passed in, reverse the element set so that elements animate from the last to the first. */
                    if (opts.backwards === true) {
                        elements = $.extend(true, [], elements).reverse();
                    }

                    /* Individually trigger the redirect for each element in the set to prevent users from having to handle iteration logic in their redirect. */
                    $.each(elements, function(elementIndex, element) {
                        /* If the stagger option was passed in, successively delay each element by the stagger value (in ms). Retain the original delay value. */
                        if (parseFloat(opts.stagger)) {
                            opts.delay = delayOriginal + (parseFloat(opts.stagger) * elementIndex);
                        } else if (Type.isFunction(opts.stagger)) {
                            opts.delay = delayOriginal + opts.stagger.call(element, elementIndex, elementsLength);
                        }

                        /* If the drag option was passed in, successively increase/decrease (depending on the presense of opts.backwards)
                           the duration of each element's animation, using floors to prevent producing very short durations. */
                        if (opts.drag) {
                            /* Default the duration of UI pack effects (callouts and transitions) to 1000ms instead of the usual default duration of 400ms. */
                            opts.duration = parseFloat(durationOriginal) || (/^(callout|transition)/.test(propertiesMap) ? 1000 : DURATION_DEFAULT);

                            /* For each element, take the greater duration of: A) animation completion percentage relative to the original duration,
                               B) 75% of the original duration, or C) a 200ms fallback (in case duration is already set to a low value).
                               The end result is a baseline of 75% of the redirect's duration that increases/decreases as the end of the element set is approached. */
                            opts.duration = Math.max(opts.duration * (opts.backwards ? 1 - elementIndex/elementsLength : (elementIndex + 1) / elementsLength), opts.duration * 0.75, 200);
                        }

                        /* Pass in the call's opts object so that the redirect can optionally extend it. It defaults to an empty object instead of null to
                           reduce the opts checking logic required inside the redirect. */
                        Velocity.Redirects[propertiesMap].call(element, element, opts || {}, elementIndex, elementsLength, elements, promiseData.promise ? promiseData : undefined);
                    });

                    /* Since the animation logic resides within the redirect's own code, abort the remainder of this call.
                       (The performance overhead up to this point is virtually non-existant.) */
                    /* Note: The jQuery call chain is kept intact by returning the complete element set. */
                    return getChain();
                } else {
                    var abortError = "Velocity: First argument (" + propertiesMap + ") was not a property map, a known action, or a registered redirect. Aborting.";

                    if (promiseData.promise) {
                        promiseData.rejecter(new Error(abortError));
                    } else {
                        console.log(abortError);
                    }

                    return getChain();
                }
        }

        /**************************
            Call-Wide Variables
        **************************/

        /* A container for CSS unit conversion ratios (e.g. %, rem, and em ==> px) that is used to cache ratios across all elements
           being animated in a single Velocity call. Calculating unit ratios necessitates DOM querying and updating, and is therefore
           avoided (via caching) wherever possible. This container is call-wide instead of page-wide to avoid the risk of using stale
           conversion metrics across Velocity animations that are not immediately consecutively chained. */
        var callUnitConversionData = {
                lastParent: null,
                lastPosition: null,
                lastFontSize: null,
                lastPercentToPxWidth: null,
                lastPercentToPxHeight: null,
                lastEmToPx: null,
                remToPx: null,
                vwToPx: null,
                vhToPx: null
            };

        /* A container for all the ensuing tween data and metadata associated with this call. This container gets pushed to the page-wide
           Velocity.State.calls array that is processed during animation ticking. */
        var call = [];

        /************************
           Element Processing
        ************************/

        /* Element processing consists of three parts -- data processing that cannot go stale and data processing that *can* go stale (i.e. third-party style modifications):
           1) Pre-Queueing: Element-wide variables, including the element's data storage, are instantiated. Call options are prepared. If triggered, the Stop action is executed.
           2) Queueing: The logic that runs once this call has reached its point of execution in the element's $.queue() stack. Most logic is placed here to avoid risking it becoming stale.
           3) Pushing: Consolidation of the tween data followed by its push onto the global in-progress calls container.
        */

        function processElement () {

            /*************************
               Part I: Pre-Queueing
            *************************/

            /***************************
               Element-Wide Variables
            ***************************/

            var element = this,
                /* The runtime opts object is the extension of the current call's options and Velocity's page-wide option defaults. */
                opts = $.extend({}, Velocity.defaults, options),
                /* A container for the processed data associated with each property in the propertyMap.
                   (Each property in the map produces its own "tween".) */
                tweensContainer = {},
                elementUnitConversionData;

            /******************
               Element Init
            ******************/

            if (Data(element) === undefined) {
                Velocity.init(element);
            }

            /******************
               Option: Delay
            ******************/

            /* Since queue:false doesn't respect the item's existing queue, we avoid injecting its delay here (it's set later on). */
            /* Note: Velocity rolls its own delay function since jQuery doesn't have a utility alias for $.fn.delay()
               (and thus requires jQuery element creation, which we avoid since its overhead includes DOM querying). */
            if (parseFloat(opts.delay) && opts.queue !== false) {
                $.queue(element, opts.queue, function(next) {
                    /* This is a flag used to indicate to the upcoming completeCall() function that this queue entry was initiated by Velocity. See completeCall() for further details. */
                    Velocity.velocityQueueEntryFlag = true;

                    /* The ensuing queue item (which is assigned to the "next" argument that $.queue() automatically passes in) will be triggered after a setTimeout delay.
                       The setTimeout is stored so that it can be subjected to clearTimeout() if this animation is prematurely stopped via Velocity's "stop" command. */
                    Data(element).delayTimer = {
                        setTimeout: setTimeout(next, parseFloat(opts.delay)),
                        next: next
                    };
                });
            }

            /*********************
               Option: Duration
            *********************/

            /* Support for jQuery's named durations. */
            switch (opts.duration.toString().toLowerCase()) {
                case "fast":
                    opts.duration = 200;
                    break;

                case "normal":
                    opts.duration = DURATION_DEFAULT;
                    break;

                case "slow":
                    opts.duration = 600;
                    break;

                default:
                    /* Remove the potential "ms" suffix and default to 1 if the user is attempting to set a duration of 0 (in order to produce an immediate style change). */
                    opts.duration = parseFloat(opts.duration) || 1;
            }

            /************************
               Global Option: Mock
            ************************/

            if (Velocity.mock !== false) {
                /* In mock mode, all animations are forced to 1ms so that they occur immediately upon the next rAF tick.
                   Alternatively, a multiplier can be passed in to time remap all delays and durations. */
                if (Velocity.mock === true) {
                    opts.duration = opts.delay = 1;
                } else {
                    opts.duration *= parseFloat(Velocity.mock) || 1;
                    opts.delay *= parseFloat(Velocity.mock) || 1;
                }
            }

            /*******************
               Option: Easing
            *******************/

            opts.easing = getEasing(opts.easing, opts.duration);

            /**********************
               Option: Callbacks
            **********************/

            /* Callbacks must functions. Otherwise, default to null. */
            if (opts.begin && !Type.isFunction(opts.begin)) {
                opts.begin = null;
            }

            if (opts.progress && !Type.isFunction(opts.progress)) {
                opts.progress = null;
            }

            if (opts.complete && !Type.isFunction(opts.complete)) {
                opts.complete = null;
            }

            /*********************************
               Option: Display & Visibility
            *********************************/

            /* Refer to Velocity's documentation (VelocityJS.org/#displayAndVisibility) for a description of the display and visibility options' behavior. */
            /* Note: We strictly check for undefined instead of falsiness because display accepts an empty string value. */
            if (opts.display !== undefined && opts.display !== null) {
                opts.display = opts.display.toString().toLowerCase();

                /* Users can pass in a special "auto" value to instruct Velocity to set the element to its default display value. */
                if (opts.display === "auto") {
                    opts.display = Velocity.CSS.Values.getDisplayType(element);
                }
            }

            if (opts.visibility !== undefined && opts.visibility !== null) {
                opts.visibility = opts.visibility.toString().toLowerCase();
            }

            /**********************
               Option: mobileHA
            **********************/

            /* When set to true, and if this is a mobile device, mobileHA automatically enables hardware acceleration (via a null transform hack)
               on animating elements. HA is removed from the element at the completion of its animation. */
            /* Note: Android Gingerbread doesn't support HA. If a null transform hack (mobileHA) is in fact set, it will prevent other tranform subproperties from taking effect. */
            /* Note: You can read more about the use of mobileHA in Velocity's documentation: VelocityJS.org/#mobileHA. */
            opts.mobileHA = (opts.mobileHA && Velocity.State.isMobile && !Velocity.State.isGingerbread);

            /***********************
               Part II: Queueing
            ***********************/

            /* When a set of elements is targeted by a Velocity call, the set is broken up and each element has the current Velocity call individually queued onto it.
               In this way, each element's existing queue is respected; some elements may already be animating and accordingly should not have this current Velocity call triggered immediately. */
            /* In each queue, tween data is processed for each animating property then pushed onto the call-wide calls array. When the last element in the set has had its tweens processed,
               the call array is pushed to Velocity.State.calls for live processing by the requestAnimationFrame tick. */
            function buildQueue (next) {

                /*******************
                   Option: Begin
                *******************/

                /* The begin callback is fired once per call -- not once per elemenet -- and is passed the full raw DOM element set as both its context and its first argument. */
                if (opts.begin && elementsIndex === 0) {
                    /* We throw callbacks in a setTimeout so that thrown errors don't halt the execution of Velocity itself. */
                    try {
                        opts.begin.call(elements, elements);
                    } catch (error) {
                        setTimeout(function() { throw error; }, 1);
                    }
                }

                /*****************************************
                   Tween Data Construction (for Scroll)
                *****************************************/

                /* Note: In order to be subjected to chaining and animation options, scroll's tweening is routed through Velocity as if it were a standard CSS property animation. */
                if (action === "scroll") {
                    /* The scroll action uniquely takes an optional "offset" option -- specified in pixels -- that offsets the targeted scroll position. */
                    var scrollDirection = (/^x$/i.test(opts.axis) ? "Left" : "Top"),
                        scrollOffset = parseFloat(opts.offset) || 0,
                        scrollPositionCurrent,
                        scrollPositionCurrentAlternate,
                        scrollPositionEnd;

                    /* Scroll also uniquely takes an optional "container" option, which indicates the parent element that should be scrolled --
                       as opposed to the browser window itself. This is useful for scrolling toward an element that's inside an overflowing parent element. */
                    if (opts.container) {
                        /* Ensure that either a jQuery object or a raw DOM element was passed in. */
                        if (Type.isWrapped(opts.container) || Type.isNode(opts.container)) {
                            /* Extract the raw DOM element from the jQuery wrapper. */
                            opts.container = opts.container[0] || opts.container;
                            /* Note: Unlike other properties in Velocity, the browser's scroll position is never cached since it so frequently changes
                               (due to the user's natural interaction with the page). */
                            scrollPositionCurrent = opts.container["scroll" + scrollDirection]; /* GET */

                            /* $.position() values are relative to the container's currently viewable area (without taking into account the container's true dimensions
                               -- say, for example, if the container was not overflowing). Thus, the scroll end value is the sum of the child element's position *and*
                               the scroll container's current scroll position. */
                            scrollPositionEnd = (scrollPositionCurrent + $(element).position()[scrollDirection.toLowerCase()]) + scrollOffset; /* GET */
                        /* If a value other than a jQuery object or a raw DOM element was passed in, default to null so that this option is ignored. */
                        } else {
                            opts.container = null;
                        }
                    } else {
                        /* If the window itself is being scrolled -- not a containing element -- perform a live scroll position lookup using
                           the appropriate cached property names (which differ based on browser type). */
                        scrollPositionCurrent = Velocity.State.scrollAnchor[Velocity.State["scrollProperty" + scrollDirection]]; /* GET */
                        /* When scrolling the browser window, cache the alternate axis's current value since window.scrollTo() doesn't let us change only one value at a time. */
                        scrollPositionCurrentAlternate = Velocity.State.scrollAnchor[Velocity.State["scrollProperty" + (scrollDirection === "Left" ? "Top" : "Left")]]; /* GET */

                        /* Unlike $.position(), $.offset() values are relative to the browser window's true dimensions -- not merely its currently viewable area --
                           and therefore end values do not need to be compounded onto current values. */
                        scrollPositionEnd = $(element).offset()[scrollDirection.toLowerCase()] + scrollOffset; /* GET */
                    }

                    /* Since there's only one format that scroll's associated tweensContainer can take, we create it manually. */
                    tweensContainer = {
                        scroll: {
                            rootPropertyValue: false,
                            startValue: scrollPositionCurrent,
                            currentValue: scrollPositionCurrent,
                            endValue: scrollPositionEnd,
                            unitType: "",
                            easing: opts.easing,
                            scrollData: {
                                container: opts.container,
                                direction: scrollDirection,
                                alternateValue: scrollPositionCurrentAlternate
                            }
                        },
                        element: element
                    };

                    if (Velocity.debug) console.log("tweensContainer (scroll): ", tweensContainer.scroll, element);

                /******************************************
                   Tween Data Construction (for Reverse)
                ******************************************/

                /* Reverse acts like a "start" action in that a property map is animated toward. The only difference is
                   that the property map used for reverse is the inverse of the map used in the previous call. Thus, we manipulate
                   the previous call to construct our new map: use the previous map's end values as our new map's start values. Copy over all other data. */
                /* Note: Reverse can be directly called via the "reverse" parameter, or it can be indirectly triggered via the loop option. (Loops are composed of multiple reverses.) */
                /* Note: Reverse calls do not need to be consecutively chained onto a currently-animating element in order to operate on cached values;
                   there is no harm to reverse being called on a potentially stale data cache since reverse's behavior is simply defined
                   as reverting to the element's values as they were prior to the previous *Velocity* call. */
                } else if (action === "reverse") {
                    /* Abort if there is no prior animation data to reverse to. */
                    if (!Data(element).tweensContainer) {
                        /* Dequeue the element so that this queue entry releases itself immediately, allowing subsequent queue entries to run. */
                        $.dequeue(element, opts.queue);

                        return;
                    } else {
                        /*********************
                           Options Parsing
                        *********************/

                        /* If the element was hidden via the display option in the previous call,
                           revert display to "auto" prior to reversal so that the element is visible again. */
                        if (Data(element).opts.display === "none") {
                            Data(element).opts.display = "auto";
                        }

                        if (Data(element).opts.visibility === "hidden") {
                            Data(element).opts.visibility = "visible";
                        }

                        /* If the loop option was set in the previous call, disable it so that "reverse" calls aren't recursively generated.
                           Further, remove the previous call's callback options; typically, users do not want these to be refired. */
                        Data(element).opts.loop = false;
                        Data(element).opts.begin = null;
                        Data(element).opts.complete = null;

                        /* Since we're extending an opts object that has already been extended with the defaults options object,
                           we remove non-explicitly-defined properties that are auto-assigned values. */
                        if (!options.easing) {
                            delete opts.easing;
                        }

                        if (!options.duration) {
                            delete opts.duration;
                        }

                        /* The opts object used for reversal is an extension of the options object optionally passed into this
                           reverse call plus the options used in the previous Velocity call. */
                        opts = $.extend({}, Data(element).opts, opts);

                        /*************************************
                           Tweens Container Reconstruction
                        *************************************/

                        /* Create a deepy copy (indicated via the true flag) of the previous call's tweensContainer. */
                        var lastTweensContainer = $.extend(true, {}, Data(element).tweensContainer);

                        /* Manipulate the previous tweensContainer by replacing its end values and currentValues with its start values. */
                        for (var lastTween in lastTweensContainer) {
                            /* In addition to tween data, tweensContainers contain an element property that we ignore here. */
                            if (lastTween !== "element") {
                                var lastStartValue = lastTweensContainer[lastTween].startValue;

                                lastTweensContainer[lastTween].startValue = lastTweensContainer[lastTween].currentValue = lastTweensContainer[lastTween].endValue;
                                lastTweensContainer[lastTween].endValue = lastStartValue;

                                /* Easing is the only option that embeds into the individual tween data (since it can be defined on a per-property basis).
                                   Accordingly, every property's easing value must be updated when an options object is passed in with a reverse call.
                                   The side effect of this extensibility is that all per-property easing values are forcefully reset to the new value. */
                                if (!Type.isEmptyObject(options)) {
                                    lastTweensContainer[lastTween].easing = opts.easing;
                                }

                                if (Velocity.debug) console.log("reverse tweensContainer (" + lastTween + "): " + JSON.stringify(lastTweensContainer[lastTween]), element);
                            }
                        }

                        tweensContainer = lastTweensContainer;
                    }

                /*****************************************
                   Tween Data Construction (for Start)
                *****************************************/

                } else if (action === "start") {

                    /*************************
                        Value Transferring
                    *************************/

                    /* If this queue entry follows a previous Velocity-initiated queue entry *and* if this entry was created
                       while the element was in the process of being animated by Velocity, then this current call is safe to use
                       the end values from the prior call as its start values. Velocity attempts to perform this value transfer
                       process whenever possible in order to avoid requerying the DOM. */
                    /* If values aren't transferred from a prior call and start values were not forcefed by the user (more on this below),
                       then the DOM is queried for the element's current values as a last resort. */
                    /* Note: Conversely, animation reversal (and looping) *always* perform inter-call value transfers; they never requery the DOM. */
                    var lastTweensContainer;

                    /* The per-element isAnimating flag is used to indicate whether it's safe (i.e. the data isn't stale)
                       to transfer over end values to use as start values. If it's set to true and there is a previous
                       Velocity call to pull values from, do so. */
                    if (Data(element).tweensContainer && Data(element).isAnimating === true) {
                        lastTweensContainer = Data(element).tweensContainer;
                    }

                    /***************************
                       Tween Data Calculation
                    ***************************/

                    /* This function parses property data and defaults endValue, easing, and startValue as appropriate. */
                    /* Property map values can either take the form of 1) a single value representing the end value,
                       or 2) an array in the form of [ endValue, [, easing] [, startValue] ].
                       The optional third parameter is a forcefed startValue to be used instead of querying the DOM for
                       the element's current value. Read Velocity's docmentation to learn more about forcefeeding: VelocityJS.org/#forcefeeding */
                    function parsePropertyValue (valueData, skipResolvingEasing) {
                        var endValue = undefined,
                            easing = undefined,
                            startValue = undefined;

                        /* Handle the array format, which can be structured as one of three potential overloads:
                           A) [ endValue, easing, startValue ], B) [ endValue, easing ], or C) [ endValue, startValue ] */
                        if (Type.isArray(valueData)) {
                            /* endValue is always the first item in the array. Don't bother validating endValue's value now
                               since the ensuing property cycling logic does that. */
                            endValue = valueData[0];

                            /* Two-item array format: If the second item is a number, function, or hex string, treat it as a
                               start value since easings can only be non-hex strings or arrays. */
                            if ((!Type.isArray(valueData[1]) && /^[\d-]/.test(valueData[1])) || Type.isFunction(valueData[1]) || CSS.RegEx.isHex.test(valueData[1])) {
                                startValue = valueData[1];
                            /* Two or three-item array: If the second item is a non-hex string or an array, treat it as an easing. */
                            } else if ((Type.isString(valueData[1]) && !CSS.RegEx.isHex.test(valueData[1])) || Type.isArray(valueData[1])) {
                                easing = skipResolvingEasing ? valueData[1] : getEasing(valueData[1], opts.duration);

                                /* Don't bother validating startValue's value now since the ensuing property cycling logic inherently does that. */
                                if (valueData[2] !== undefined) {
                                    startValue = valueData[2];
                                }
                            }
                        /* Handle the single-value format. */
                        } else {
                            endValue = valueData;
                        }

                        /* Default to the call's easing if a per-property easing type was not defined. */
                        if (!skipResolvingEasing) {
                            easing = easing || opts.easing;
                        }

                        /* If functions were passed in as values, pass the function the current element as its context,
                           plus the element's index and the element set's size as arguments. Then, assign the returned value. */
                        if (Type.isFunction(endValue)) {
                            endValue = endValue.call(element, elementsIndex, elementsLength);
                        }

                        if (Type.isFunction(startValue)) {
                            startValue = startValue.call(element, elementsIndex, elementsLength);
                        }

                        /* Allow startValue to be left as undefined to indicate to the ensuing code that its value was not forcefed. */
                        return [ endValue || 0, easing, startValue ];
                    }

                    /* Cycle through each property in the map, looking for shorthand color properties (e.g. "color" as opposed to "colorRed"). Inject the corresponding
                       colorRed, colorGreen, and colorBlue RGB component tweens into the propertiesMap (which Velocity understands) and remove the shorthand property. */
                    $.each(propertiesMap, function(property, value) {
                        /* Find shorthand color properties that have been passed a hex string. */
                        if (RegExp("^" + CSS.Lists.colors.join("$|^") + "$").test(property)) {
                            /* Parse the value data for each shorthand. */
                            var valueData = parsePropertyValue(value, true),
                                endValue = valueData[0],
                                easing = valueData[1],
                                startValue = valueData[2];

                            if (CSS.RegEx.isHex.test(endValue)) {
                                /* Convert the hex strings into their RGB component arrays. */
                                var colorComponents = [ "Red", "Green", "Blue" ],
                                    endValueRGB = CSS.Values.hexToRgb(endValue),
                                    startValueRGB = startValue ? CSS.Values.hexToRgb(startValue) : undefined;

                                /* Inject the RGB component tweens into propertiesMap. */
                                for (var i = 0; i < colorComponents.length; i++) {
                                    var dataArray = [ endValueRGB[i] ];

                                    if (easing) {
                                        dataArray.push(easing);
                                    }

                                    if (startValueRGB !== undefined) {
                                        dataArray.push(startValueRGB[i]);
                                    }

                                    propertiesMap[property + colorComponents[i]] = dataArray;
                                }

                                /* Remove the intermediary shorthand property entry now that we've processed it. */
                                delete propertiesMap[property];
                            }
                        }
                    });

                    /* Create a tween out of each property, and append its associated data to tweensContainer. */
                    for (var property in propertiesMap) {

                        /**************************
                           Start Value Sourcing
                        **************************/

                        /* Parse out endValue, easing, and startValue from the property's data. */
                        var valueData = parsePropertyValue(propertiesMap[property]),
                            endValue = valueData[0],
                            easing = valueData[1],
                            startValue = valueData[2];

                        /* Now that the original property name's format has been used for the parsePropertyValue() lookup above,
                           we force the property to its camelCase styling to normalize it for manipulation. */
                        property = CSS.Names.camelCase(property);

                        /* In case this property is a hook, there are circumstances where we will intend to work on the hook's root property and not the hooked subproperty. */
                        var rootProperty = CSS.Hooks.getRoot(property),
                            rootPropertyValue = false;

                        /* Other than for the dummy tween property, properties that are not supported by the browser (and do not have an associated normalization) will
                           inherently produce no style changes when set, so they are skipped in order to decrease animation tick overhead.
                           Property support is determined via prefixCheck(), which returns a false flag when no supported is detected. */
                        /* Note: Since SVG elements have some of their properties directly applied as HTML attributes,
                           there is no way to check for their explicit browser support, and so we skip skip this check for them. */
                        if (!Data(element).isSVG && rootProperty !== "tween" && CSS.Names.prefixCheck(rootProperty)[1] === false && CSS.Normalizations.registered[rootProperty] === undefined) {
                            if (Velocity.debug) console.log("Skipping [" + rootProperty + "] due to a lack of browser support.");

                            continue;
                        }

                        /* If the display option is being set to a non-"none" (e.g. "block") and opacity (filter on IE<=8) is being
                           animated to an endValue of non-zero, the user's intention is to fade in from invisible, thus we forcefeed opacity
                           a startValue of 0 if its startValue hasn't already been sourced by value transferring or prior forcefeeding. */
                        if (((opts.display !== undefined && opts.display !== null && opts.display !== "none") || (opts.visibility !== undefined && opts.visibility !== "hidden")) && /opacity|filter/.test(property) && !startValue && endValue !== 0) {
                            startValue = 0;
                        }

                        /* If values have been transferred from the previous Velocity call, extract the endValue and rootPropertyValue
                           for all of the current call's properties that were *also* animated in the previous call. */
                        /* Note: Value transferring can optionally be disabled by the user via the _cacheValues option. */
                        if (opts._cacheValues && lastTweensContainer && lastTweensContainer[property]) {
                            if (startValue === undefined) {
                                startValue = lastTweensContainer[property].endValue + lastTweensContainer[property].unitType;
                            }

                            /* The previous call's rootPropertyValue is extracted from the element's data cache since that's the
                               instance of rootPropertyValue that gets freshly updated by the tweening process, whereas the rootPropertyValue
                               attached to the incoming lastTweensContainer is equal to the root property's value prior to any tweening. */
                            rootPropertyValue = Data(element).rootPropertyValueCache[rootProperty];
                        /* If values were not transferred from a previous Velocity call, query the DOM as needed. */
                        } else {
                            /* Handle hooked properties. */
                            if (CSS.Hooks.registered[property]) {
                               if (startValue === undefined) {
                                    rootPropertyValue = CSS.getPropertyValue(element, rootProperty); /* GET */
                                    /* Note: The following getPropertyValue() call does not actually trigger a DOM query;
                                       getPropertyValue() will extract the hook from rootPropertyValue. */
                                    startValue = CSS.getPropertyValue(element, property, rootPropertyValue);
                                /* If startValue is already defined via forcefeeding, do not query the DOM for the root property's value;
                                   just grab rootProperty's zero-value template from CSS.Hooks. This overwrites the element's actual
                                   root property value (if one is set), but this is acceptable since the primary reason users forcefeed is
                                   to avoid DOM queries, and thus we likewise avoid querying the DOM for the root property's value. */
                                } else {
                                    /* Grab this hook's zero-value template, e.g. "0px 0px 0px black". */
                                    rootPropertyValue = CSS.Hooks.templates[rootProperty][1];
                                }
                            /* Handle non-hooked properties that haven't already been defined via forcefeeding. */
                            } else if (startValue === undefined) {
                                startValue = CSS.getPropertyValue(element, property); /* GET */
                            }
                        }

                        /**************************
                           Value Data Extraction
                        **************************/

                        var separatedValue,
                            endValueUnitType,
                            startValueUnitType,
                            operator = false;

                        /* Separates a property value into its numeric value and its unit type. */
                        function separateValue (property, value) {
                            var unitType,
                                numericValue;

                            numericValue = (value || "0")
                                .toString()
                                .toLowerCase()
                                /* Match the unit type at the end of the value. */
                                .replace(/[%A-z]+$/, function(match) {
                                    /* Grab the unit type. */
                                    unitType = match;

                                    /* Strip the unit type off of value. */
                                    return "";
                                });

                            /* If no unit type was supplied, assign one that is appropriate for this property (e.g. "deg" for rotateZ or "px" for width). */
                            if (!unitType) {
                                unitType = CSS.Values.getUnitType(property);
                            }

                            return [ numericValue, unitType ];
                        }

                        /* Separate startValue. */
                        separatedValue = separateValue(property, startValue);
                        startValue = separatedValue[0];
                        startValueUnitType = separatedValue[1];

                        /* Separate endValue, and extract a value operator (e.g. "+=", "-=") if one exists. */
                        separatedValue = separateValue(property, endValue);
                        endValue = separatedValue[0].replace(/^([+-\/*])=/, function(match, subMatch) {
                            operator = subMatch;

                            /* Strip the operator off of the value. */
                            return "";
                        });
                        endValueUnitType = separatedValue[1];

                        /* Parse float values from endValue and startValue. Default to 0 if NaN is returned. */
                        startValue = parseFloat(startValue) || 0;
                        endValue = parseFloat(endValue) || 0;

                        /***************************************
                           Property-Specific Value Conversion
                        ***************************************/

                        /* Custom support for properties that don't actually accept the % unit type, but where pollyfilling is trivial and relatively foolproof. */
                        if (endValueUnitType === "%") {
                            /* A %-value fontSize/lineHeight is relative to the parent's fontSize (as opposed to the parent's dimensions),
                               which is identical to the em unit's behavior, so we piggyback off of that. */
                            if (/^(fontSize|lineHeight)$/.test(property)) {
                                /* Convert % into an em decimal value. */
                                endValue = endValue / 100;
                                endValueUnitType = "em";
                            /* For scaleX and scaleY, convert the value into its decimal format and strip off the unit type. */
                            } else if (/^scale/.test(property)) {
                                endValue = endValue / 100;
                                endValueUnitType = "";
                            /* For RGB components, take the defined percentage of 255 and strip off the unit type. */
                            } else if (/(Red|Green|Blue)$/i.test(property)) {
                                endValue = (endValue / 100) * 255;
                                endValueUnitType = "";
                            }
                        }

                        /***************************
                           Unit Ratio Calculation
                        ***************************/

                        /* When queried, the browser returns (most) CSS property values in pixels. Therefore, if an endValue with a unit type of
                           %, em, or rem is animated toward, startValue must be converted from pixels into the same unit type as endValue in order
                           for value manipulation logic (increment/decrement) to proceed. Further, if the startValue was forcefed or transferred
                           from a previous call, startValue may also not be in pixels. Unit conversion logic therefore consists of two steps:
                           1) Calculating the ratio of %/em/rem/vh/vw relative to pixels
                           2) Converting startValue into the same unit of measurement as endValue based on these ratios. */
                        /* Unit conversion ratios are calculated by inserting a sibling node next to the target node, copying over its position property,
                           setting values with the target unit type then comparing the returned pixel value. */
                        /* Note: Even if only one of these unit types is being animated, all unit ratios are calculated at once since the overhead
                           of batching the SETs and GETs together upfront outweights the potential overhead
                           of layout thrashing caused by re-querying for uncalculated ratios for subsequently-processed properties. */
                        /* Todo: Shift this logic into the calls' first tick instance so that it's synced with RAF. */
                        function calculateUnitRatios () {

                            /************************
                                Same Ratio Checks
                            ************************/

                            /* The properties below are used to determine whether the element differs sufficiently from this call's
                               previously iterated element to also differ in its unit conversion ratios. If the properties match up with those
                               of the prior element, the prior element's conversion ratios are used. Like most optimizations in Velocity,
                               this is done to minimize DOM querying. */
                            var sameRatioIndicators = {
                                    myParent: element.parentNode || document.body, /* GET */
                                    position: CSS.getPropertyValue(element, "position"), /* GET */
                                    fontSize: CSS.getPropertyValue(element, "fontSize") /* GET */
                                },
                                /* Determine if the same % ratio can be used. % is based on the element's position value and its parent's width and height dimensions. */
                                samePercentRatio = ((sameRatioIndicators.position === callUnitConversionData.lastPosition) && (sameRatioIndicators.myParent === callUnitConversionData.lastParent)),
                                /* Determine if the same em ratio can be used. em is relative to the element's fontSize. */
                                sameEmRatio = (sameRatioIndicators.fontSize === callUnitConversionData.lastFontSize);

                            /* Store these ratio indicators call-wide for the next element to compare against. */
                            callUnitConversionData.lastParent = sameRatioIndicators.myParent;
                            callUnitConversionData.lastPosition = sameRatioIndicators.position;
                            callUnitConversionData.lastFontSize = sameRatioIndicators.fontSize;

                            /***************************
                               Element-Specific Units
                            ***************************/

                            /* Note: IE8 rounds to the nearest pixel when returning CSS values, thus we perform conversions using a measurement
                               of 100 (instead of 1) to give our ratios a precision of at least 2 decimal values. */
                            var measurement = 100,
                                unitRatios = {};

                            if (!sameEmRatio || !samePercentRatio) {
                                var dummy = Data(element).isSVG ? document.createElementNS("http://www.w3.org/2000/svg", "rect") : document.createElement("div");

                                Velocity.init(dummy);
                                sameRatioIndicators.myParent.appendChild(dummy);

                                /* To accurately and consistently calculate conversion ratios, the element's cascaded overflow and box-sizing are stripped.
                                   Similarly, since width/height can be artificially constrained by their min-/max- equivalents, these are controlled for as well. */
                                /* Note: Overflow must be also be controlled for per-axis since the overflow property overwrites its per-axis values. */
                                $.each([ "overflow", "overflowX", "overflowY" ], function(i, property) {
                                    Velocity.CSS.setPropertyValue(dummy, property, "hidden");
                                });
                                Velocity.CSS.setPropertyValue(dummy, "position", sameRatioIndicators.position);
                                Velocity.CSS.setPropertyValue(dummy, "fontSize", sameRatioIndicators.fontSize);
                                Velocity.CSS.setPropertyValue(dummy, "boxSizing", "content-box");

                                /* width and height act as our proxy properties for measuring the horizontal and vertical % ratios. */
                                $.each([ "minWidth", "maxWidth", "width", "minHeight", "maxHeight", "height" ], function(i, property) {
                                    Velocity.CSS.setPropertyValue(dummy, property, measurement + "%");
                                });
                                /* paddingLeft arbitrarily acts as our proxy property for the em ratio. */
                                Velocity.CSS.setPropertyValue(dummy, "paddingLeft", measurement + "em");

                                /* Divide the returned value by the measurement to get the ratio between 1% and 1px. Default to 1 since working with 0 can produce Infinite. */
                                unitRatios.percentToPxWidth = callUnitConversionData.lastPercentToPxWidth = (parseFloat(CSS.getPropertyValue(dummy, "width", null, true)) || 1) / measurement; /* GET */
                                unitRatios.percentToPxHeight = callUnitConversionData.lastPercentToPxHeight = (parseFloat(CSS.getPropertyValue(dummy, "height", null, true)) || 1) / measurement; /* GET */
                                unitRatios.emToPx = callUnitConversionData.lastEmToPx = (parseFloat(CSS.getPropertyValue(dummy, "paddingLeft")) || 1) / measurement; /* GET */

                                sameRatioIndicators.myParent.removeChild(dummy);
                            } else {
                                unitRatios.emToPx = callUnitConversionData.lastEmToPx;
                                unitRatios.percentToPxWidth = callUnitConversionData.lastPercentToPxWidth;
                                unitRatios.percentToPxHeight = callUnitConversionData.lastPercentToPxHeight;
                            }

                            /***************************
                               Element-Agnostic Units
                            ***************************/

                            /* Whereas % and em ratios are determined on a per-element basis, the rem unit only needs to be checked
                               once per call since it's exclusively dependant upon document.body's fontSize. If this is the first time
                               that calculateUnitRatios() is being run during this call, remToPx will still be set to its default value of null,
                               so we calculate it now. */
                            if (callUnitConversionData.remToPx === null) {
                                /* Default to browsers' default fontSize of 16px in the case of 0. */
                                callUnitConversionData.remToPx = parseFloat(CSS.getPropertyValue(document.body, "fontSize")) || 16; /* GET */
                            }

                            /* Similarly, viewport units are %-relative to the window's inner dimensions. */
                            if (callUnitConversionData.vwToPx === null) {
                                callUnitConversionData.vwToPx = parseFloat(window.innerWidth) / 100; /* GET */
                                callUnitConversionData.vhToPx = parseFloat(window.innerHeight) / 100; /* GET */
                            }

                            unitRatios.remToPx = callUnitConversionData.remToPx;
                            unitRatios.vwToPx = callUnitConversionData.vwToPx;
                            unitRatios.vhToPx = callUnitConversionData.vhToPx;

                            if (Velocity.debug >= 1) console.log("Unit ratios: " + JSON.stringify(unitRatios), element);

                            return unitRatios;
                        }

                        /********************
                           Unit Conversion
                        ********************/

                        /* The * and / operators, which are not passed in with an associated unit, inherently use startValue's unit. Skip value and unit conversion. */
                        if (/[\/*]/.test(operator)) {
                            endValueUnitType = startValueUnitType;
                        /* If startValue and endValue differ in unit type, convert startValue into the same unit type as endValue so that if endValueUnitType
                           is a relative unit (%, em, rem), the values set during tweening will continue to be accurately relative even if the metrics they depend
                           on are dynamically changing during the course of the animation. Conversely, if we always normalized into px and used px for setting values, the px ratio
                           would become stale if the original unit being animated toward was relative and the underlying metrics change during the animation. */
                        /* Since 0 is 0 in any unit type, no conversion is necessary when startValue is 0 -- we just start at 0 with endValueUnitType. */
                        } else if ((startValueUnitType !== endValueUnitType) && startValue !== 0) {
                            /* Unit conversion is also skipped when endValue is 0, but *startValueUnitType* must be used for tween values to remain accurate. */
                            /* Note: Skipping unit conversion here means that if endValueUnitType was originally a relative unit, the animation won't relatively
                               match the underlying metrics if they change, but this is acceptable since we're animating toward invisibility instead of toward visibility,
                               which remains past the point of the animation's completion. */
                            if (endValue === 0) {
                                endValueUnitType = startValueUnitType;
                            } else {
                                /* By this point, we cannot avoid unit conversion (it's undesirable since it causes layout thrashing).
                                   If we haven't already, we trigger calculateUnitRatios(), which runs once per element per call. */
                                elementUnitConversionData = elementUnitConversionData || calculateUnitRatios();

                                /* The following RegEx matches CSS properties that have their % values measured relative to the x-axis. */
                                /* Note: W3C spec mandates that all of margin and padding's properties (even top and bottom) are %-relative to the *width* of the parent element. */
                                var axis = (/margin|padding|left|right|width|text|word|letter/i.test(property) || /X$/.test(property) || property === "x") ? "x" : "y";

                                /* In order to avoid generating n^2 bespoke conversion functions, unit conversion is a two-step process:
                                   1) Convert startValue into pixels. 2) Convert this new pixel value into endValue's unit type. */
                                switch (startValueUnitType) {
                                    case "%":
                                        /* Note: translateX and translateY are the only properties that are %-relative to an element's own dimensions -- not its parent's dimensions.
                                           Velocity does not include a special conversion process to account for this behavior. Therefore, animating translateX/Y from a % value
                                           to a non-% value will produce an incorrect start value. Fortunately, this sort of cross-unit conversion is rarely done by users in practice. */
                                        startValue *= (axis === "x" ? elementUnitConversionData.percentToPxWidth : elementUnitConversionData.percentToPxHeight);
                                        break;

                                    case "px":
                                        /* px acts as our midpoint in the unit conversion process; do nothing. */
                                        break;

                                    default:
                                        startValue *= elementUnitConversionData[startValueUnitType + "ToPx"];
                                }

                                /* Invert the px ratios to convert into to the target unit. */
                                switch (endValueUnitType) {
                                    case "%":
                                        startValue *= 1 / (axis === "x" ? elementUnitConversionData.percentToPxWidth : elementUnitConversionData.percentToPxHeight);
                                        break;

                                    case "px":
                                        /* startValue is already in px, do nothing; we're done. */
                                        break;

                                    default:
                                        startValue *= 1 / elementUnitConversionData[endValueUnitType + "ToPx"];
                                }
                            }
                        }

                        /*********************
                           Relative Values
                        *********************/

                        /* Operator logic must be performed last since it requires unit-normalized start and end values. */
                        /* Note: Relative *percent values* do not behave how most people think; while one would expect "+=50%"
                           to increase the property 1.5x its current value, it in fact increases the percent units in absolute terms:
                           50 points is added on top of the current % value. */
                        switch (operator) {
                            case "+":
                                endValue = startValue + endValue;
                                break;

                            case "-":
                                endValue = startValue - endValue;
                                break;

                            case "*":
                                endValue = startValue * endValue;
                                break;

                            case "/":
                                endValue = startValue / endValue;
                                break;
                        }

                        /**************************
                           tweensContainer Push
                        **************************/

                        /* Construct the per-property tween object, and push it to the element's tweensContainer. */
                        tweensContainer[property] = {
                            rootPropertyValue: rootPropertyValue,
                            startValue: startValue,
                            currentValue: startValue,
                            endValue: endValue,
                            unitType: endValueUnitType,
                            easing: easing
                        };

                        if (Velocity.debug) console.log("tweensContainer (" + property + "): " + JSON.stringify(tweensContainer[property]), element);
                    }

                    /* Along with its property data, store a reference to the element itself onto tweensContainer. */
                    tweensContainer.element = element;
                }

                /*****************
                    Call Push
                *****************/

                /* Note: tweensContainer can be empty if all of the properties in this call's property map were skipped due to not
                   being supported by the browser. The element property is used for checking that the tweensContainer has been appended to. */
                if (tweensContainer.element) {
                    /* Apply the "velocity-animating" indicator class. */
                    CSS.Values.addClass(element, "velocity-animating");

                    /* The call array houses the tweensContainers for each element being animated in the current call. */
                    call.push(tweensContainer);

                    /* Store the tweensContainer and options if we're working on the default effects queue, so that they can be used by the reverse command. */
                    if (opts.queue === "") {
                        Data(element).tweensContainer = tweensContainer;
                        Data(element).opts = opts;
                    }

                    /* Switch on the element's animating flag. */
                    Data(element).isAnimating = true;

                    /* Once the final element in this call's element set has been processed, push the call array onto
                       Velocity.State.calls for the animation tick to immediately begin processing. */
                    if (elementsIndex === elementsLength - 1) {
                        /* Add the current call plus its associated metadata (the element set and the call's options) onto the global call container.
                           Anything on this call container is subjected to tick() processing. */
                        Velocity.State.calls.push([ call, elements, opts, null, promiseData.resolver ]);

                        /* If the animation tick isn't running, start it. (Velocity shuts it off when there are no active calls to process.) */
                        if (Velocity.State.isTicking === false) {
                            Velocity.State.isTicking = true;

                            /* Start the tick loop. */
                            tick();
                        }
                    } else {
                        elementsIndex++;
                    }
                }
            }

            /* When the queue option is set to false, the call skips the element's queue and fires immediately. */
            if (opts.queue === false) {
                /* Since this buildQueue call doesn't respect the element's existing queue (which is where a delay option would have been appended),
                   we manually inject the delay property here with an explicit setTimeout. */
                if (opts.delay) {
                    setTimeout(buildQueue, opts.delay);
                } else {
                    buildQueue();
                }
            /* Otherwise, the call undergoes element queueing as normal. */
            /* Note: To interoperate with jQuery, Velocity uses jQuery's own $.queue() stack for queuing logic. */
            } else {
                $.queue(element, opts.queue, function(next, clearQueue) {
                    /* If the clearQueue flag was passed in by the stop command, resolve this call's promise. (Promises can only be resolved once,
                       so it's fine if this is repeatedly triggered for each element in the associated call.) */
                    if (clearQueue === true) {
                        if (promiseData.promise) {
                            promiseData.resolver(elements);
                        }

                        /* Do not continue with animation queueing. */
                        return true;
                    }

                    /* This flag indicates to the upcoming completeCall() function that this queue entry was initiated by Velocity.
                       See completeCall() for further details. */
                    Velocity.velocityQueueEntryFlag = true;

                    buildQueue(next);
                });
            }

            /*********************
                Auto-Dequeuing
            *********************/

            /* As per jQuery's $.queue() behavior, to fire the first non-custom-queue entry on an element, the element
               must be dequeued if its queue stack consists *solely* of the current call. (This can be determined by checking
               for the "inprogress" item that jQuery prepends to active queue stack arrays.) Regardless, whenever the element's
               queue is further appended with additional items -- including $.delay()'s or even $.animate() calls, the queue's
               first entry is automatically fired. This behavior contrasts that of custom queues, which never auto-fire. */
            /* Note: When an element set is being subjected to a non-parallel Velocity call, the animation will not begin until
               each one of the elements in the set has reached the end of its individually pre-existing queue chain. */
            /* Note: Unfortunately, most people don't fully grasp jQuery's powerful, yet quirky, $.queue() function.
               Lean more here: http://stackoverflow.com/questions/1058158/can-somebody-explain-jquery-queue-to-me */
            if ((opts.queue === "" || opts.queue === "fx") && $.queue(element)[0] !== "inprogress") {
                $.dequeue(element);
            }
        }

        /**************************
           Element Set Iteration
        **************************/

        /* If the "nodeType" property exists on the elements variable, we're animating a single element.
           Place it in an array so that $.each() can iterate over it. */
        $.each(elements, function(i, element) {
            /* Ensure each element in a set has a nodeType (is a real element) to avoid throwing errors. */
            if (Type.isNode(element)) {
                processElement.call(element);
            }
        });

        /******************
           Option: Loop
        ******************/

        /* The loop option accepts an integer indicating how many times the element should loop between the values in the
           current call's properties map and the element's property values prior to this call. */
        /* Note: The loop option's logic is performed here -- after element processing -- because the current call needs
           to undergo its queue insertion prior to the loop option generating its series of constituent "reverse" calls,
           which chain after the current call. Two reverse calls (two "alternations") constitute one loop. */
        var opts = $.extend({}, Velocity.defaults, options),
            reverseCallsCount;

        opts.loop = parseInt(opts.loop);
        reverseCallsCount = (opts.loop * 2) - 1;

        if (opts.loop) {
            /* Double the loop count to convert it into its appropriate number of "reverse" calls.
               Subtract 1 from the resulting value since the current call is included in the total alternation count. */
            for (var x = 0; x < reverseCallsCount; x++) {
                /* Since the logic for the reverse action occurs inside Queueing and therefore this call's options object
                   isn't parsed until then as well, the current call's delay option must be explicitly passed into the reverse
                   call so that the delay logic that occurs inside *Pre-Queueing* can process it. */
                var reverseOptions = {
                    delay: opts.delay,
                    progress: opts.progress
                };

                /* If a complete callback was passed into this call, transfer it to the loop redirect's final "reverse" call
                   so that it's triggered when the entire redirect is complete (and not when the very first animation is complete). */
                if (x === reverseCallsCount - 1) {
                    reverseOptions.display = opts.display;
                    reverseOptions.visibility = opts.visibility;
                    reverseOptions.complete = opts.complete;
                }

                animate(elements, "reverse", reverseOptions);
            }
        }

        /***************
            Chaining
        ***************/

        /* Return the elements back to the call chain, with wrapped elements taking precedence in case Velocity was called via the $.fn. extension. */
        return getChain();
    };

    /* Turn Velocity into the animation function, extended with the pre-existing Velocity object. */
    Velocity = $.extend(animate, Velocity);
    /* For legacy support, also expose the literal animate method. */
    Velocity.animate = animate;

    /**************
        Timing
    **************/

    /* Ticker function. */
    var ticker = window.requestAnimationFrame || rAFShim;

    /* Inactive browser tabs pause rAF, which results in all active animations immediately sprinting to their completion states when the tab refocuses.
       To get around this, we dynamically switch rAF to setTimeout (which the browser *doesn't* pause) when the tab loses focus. We skip this for mobile
       devices to avoid wasting battery power on inactive tabs. */
    /* Note: Tab focus detection doesn't work on older versions of IE, but that's okay since they don't support rAF to begin with. */
    if (!Velocity.State.isMobile && document.hidden !== undefined) {
        document.addEventListener("visibilitychange", function() {
            /* Reassign the rAF function (which the global tick() function uses) based on the tab's focus state. */
            if (document.hidden) {
                ticker = function(callback) {
                    /* The tick function needs a truthy first argument in order to pass its internal timestamp check. */
                    return setTimeout(function() { callback(true) }, 16);
                };

                /* The rAF loop has been paused by the browser, so we manually restart the tick. */
                tick();
            } else {
                ticker = window.requestAnimationFrame || rAFShim;
            }
        });
    }

    /************
        Tick
    ************/

    /* Note: All calls to Velocity are pushed to the Velocity.State.calls array, which is fully iterated through upon each tick. */
    function tick (timestamp) {
        /* An empty timestamp argument indicates that this is the first tick occurence since ticking was turned on.
           We leverage this metadata to fully ignore the first tick pass since RAF's initial pass is fired whenever
           the browser's next tick sync time occurs, which results in the first elements subjected to Velocity
           calls being animated out of sync with any elements animated immediately thereafter. In short, we ignore
           the first RAF tick pass so that elements being immediately consecutively animated -- instead of simultaneously animated
           by the same Velocity call -- are properly batched into the same initial RAF tick and consequently remain in sync thereafter. */
        if (timestamp) {
            /* We ignore RAF's high resolution timestamp since it can be significantly offset when the browser is
               under high stress; we opt for choppiness over allowing the browser to drop huge chunks of frames. */
            var timeCurrent = (new Date).getTime();

            /********************
               Call Iteration
            ********************/

            var callsLength = Velocity.State.calls.length;

            /* To speed up iterating over this array, it is compacted (falsey items -- calls that have completed -- are removed)
               when its length has ballooned to a point that can impact tick performance. This only becomes necessary when animation
               has been continuous with many elements over a long period of time; whenever all active calls are completed, completeCall() clears Velocity.State.calls. */
            if (callsLength > 10000) {
                Velocity.State.calls = compactSparseArray(Velocity.State.calls);
            }

            /* Iterate through each active call. */
            for (var i = 0; i < callsLength; i++) {
                /* When a Velocity call is completed, its Velocity.State.calls entry is set to false. Continue on to the next call. */
                if (!Velocity.State.calls[i]) {
                    continue;
                }

                /************************
                   Call-Wide Variables
                ************************/

                var callContainer = Velocity.State.calls[i],
                    call = callContainer[0],
                    opts = callContainer[2],
                    timeStart = callContainer[3],
                    firstTick = !!timeStart,
                    tweenDummyValue = null;

                /* If timeStart is undefined, then this is the first time that this call has been processed by tick().
                   We assign timeStart now so that its value is as close to the real animation start time as possible.
                   (Conversely, had timeStart been defined when this call was added to Velocity.State.calls, the delay
                   between that time and now would cause the first few frames of the tween to be skipped since
                   percentComplete is calculated relative to timeStart.) */
                /* Further, subtract 16ms (the approximate resolution of RAF) from the current time value so that the
                   first tick iteration isn't wasted by animating at 0% tween completion, which would produce the
                   same style value as the element's current value. */
                if (!timeStart) {
                    timeStart = Velocity.State.calls[i][3] = timeCurrent - 16;
                }

                /* The tween's completion percentage is relative to the tween's start time, not the tween's start value
                   (which would result in unpredictable tween durations since JavaScript's timers are not particularly accurate).
                   Accordingly, we ensure that percentComplete does not exceed 1. */
                var percentComplete = Math.min((timeCurrent - timeStart) / opts.duration, 1);

                /**********************
                   Element Iteration
                **********************/

                /* For every call, iterate through each of the elements in its set. */
                for (var j = 0, callLength = call.length; j < callLength; j++) {
                    var tweensContainer = call[j],
                        element = tweensContainer.element;

                    /* Check to see if this element has been deleted midway through the animation by checking for the
                       continued existence of its data cache. If it's gone, skip animating this element. */
                    if (!Data(element)) {
                        continue;
                    }

                    var transformPropertyExists = false;

                    /**********************************
                       Display & Visibility Toggling
                    **********************************/

                    /* If the display option is set to non-"none", set it upfront so that the element can become visible before tweening begins.
                       (Otherwise, display's "none" value is set in completeCall() once the animation has completed.) */
                    if (opts.display !== undefined && opts.display !== null && opts.display !== "none") {
                        if (opts.display === "flex") {
                            var flexValues = [ "-webkit-box", "-moz-box", "-ms-flexbox", "-webkit-flex" ];

                            $.each(flexValues, function(i, flexValue) {
                                CSS.setPropertyValue(element, "display", flexValue);
                            });
                        }

                        CSS.setPropertyValue(element, "display", opts.display);
                    }

                    /* Same goes with the visibility option, but its "none" equivalent is "hidden". */
                    if (opts.visibility !== undefined && opts.visibility !== "hidden") {
                        CSS.setPropertyValue(element, "visibility", opts.visibility);
                    }

                    /************************
                       Property Iteration
                    ************************/

                    /* For every element, iterate through each property. */
                    for (var property in tweensContainer) {
                        /* Note: In addition to property tween data, tweensContainer contains a reference to its associated element. */
                        if (property !== "element") {
                            var tween = tweensContainer[property],
                                currentValue,
                                /* Easing can either be a pre-genereated function or a string that references a pre-registered easing
                                   on the Velocity.Easings object. In either case, return the appropriate easing *function*. */
                                easing = Type.isString(tween.easing) ? Velocity.Easings[tween.easing] : tween.easing;

                            /******************************
                               Current Value Calculation
                            ******************************/

                            /* If this is the last tick pass (if we've reached 100% completion for this tween),
                               ensure that currentValue is explicitly set to its target endValue so that it's not subjected to any rounding. */
                            if (percentComplete === 1) {
                                currentValue = tween.endValue;
                            /* Otherwise, calculate currentValue based on the current delta from startValue. */
                            } else {
                                var tweenDelta = tween.endValue - tween.startValue;
                                currentValue = tween.startValue + (tweenDelta * easing(percentComplete, opts, tweenDelta));

                                /* If no value change is occurring, don't proceed with DOM updating. */
                                if (!firstTick && (currentValue === tween.currentValue)) {
                                    continue;
                                }
                            }

                            tween.currentValue = currentValue;

                            /* If we're tweening a fake 'tween' property in order to log transition values, update the one-per-call variable so that
                               it can be passed into the progress callback. */ 
                            if (property === "tween") {
                                tweenDummyValue = currentValue;
                            } else {
                                /******************
                                   Hooks: Part I
                                ******************/

                                /* For hooked properties, the newly-updated rootPropertyValueCache is cached onto the element so that it can be used
                                   for subsequent hooks in this call that are associated with the same root property. If we didn't cache the updated
                                   rootPropertyValue, each subsequent update to the root property in this tick pass would reset the previous hook's
                                   updates to rootPropertyValue prior to injection. A nice performance byproduct of rootPropertyValue caching is that
                                   subsequently chained animations using the same hookRoot but a different hook can use this cached rootPropertyValue. */
                                if (CSS.Hooks.registered[property]) {
                                    var hookRoot = CSS.Hooks.getRoot(property),
                                        rootPropertyValueCache = Data(element).rootPropertyValueCache[hookRoot];

                                    if (rootPropertyValueCache) {
                                        tween.rootPropertyValue = rootPropertyValueCache;
                                    }
                                }

                                /*****************
                                    DOM Update
                                *****************/

                                /* setPropertyValue() returns an array of the property name and property value post any normalization that may have been performed. */
                                /* Note: To solve an IE<=8 positioning bug, the unit type is dropped when setting a property value of 0. */
                                var adjustedSetData = CSS.setPropertyValue(element, /* SET */
                                                                           property,
                                                                           tween.currentValue + (parseFloat(currentValue) === 0 ? "" : tween.unitType),
                                                                           tween.rootPropertyValue,
                                                                           tween.scrollData);

                                /*******************
                                   Hooks: Part II
                                *******************/

                                /* Now that we have the hook's updated rootPropertyValue (the post-processed value provided by adjustedSetData), cache it onto the element. */
                                if (CSS.Hooks.registered[property]) {
                                    /* Since adjustedSetData contains normalized data ready for DOM updating, the rootPropertyValue needs to be re-extracted from its normalized form. ?? */
                                    if (CSS.Normalizations.registered[hookRoot]) {
                                        Data(element).rootPropertyValueCache[hookRoot] = CSS.Normalizations.registered[hookRoot]("extract", null, adjustedSetData[1]);
                                    } else {
                                        Data(element).rootPropertyValueCache[hookRoot] = adjustedSetData[1];
                                    }
                                }

                                /***************
                                   Transforms
                                ***************/

                                /* Flag whether a transform property is being animated so that flushTransformCache() can be triggered once this tick pass is complete. */
                                if (adjustedSetData[0] === "transform") {
                                    transformPropertyExists = true;
                                }

                            }
                        }
                    }

                    /****************
                        mobileHA
                    ****************/

                    /* If mobileHA is enabled, set the translate3d transform to null to force hardware acceleration.
                       It's safe to override this property since Velocity doesn't actually support its animation (hooks are used in its place). */
                    if (opts.mobileHA) {
                        /* Don't set the null transform hack if we've already done so. */
                        if (Data(element).transformCache.translate3d === undefined) {
                            /* All entries on the transformCache object are later concatenated into a single transform string via flushTransformCache(). */
                            Data(element).transformCache.translate3d = "(0px, 0px, 0px)";

                            transformPropertyExists = true;
                        }
                    }

                    if (transformPropertyExists) {
                        CSS.flushTransformCache(element);
                    }
                }

                /* The non-"none" display value is only applied to an element once -- when its associated call is first ticked through.
                   Accordingly, it's set to false so that it isn't re-processed by this call in the next tick. */
                if (opts.display !== undefined && opts.display !== "none") {
                    Velocity.State.calls[i][2].display = false;
                }
                if (opts.visibility !== undefined && opts.visibility !== "hidden") {
                    Velocity.State.calls[i][2].visibility = false;
                }

                /* Pass the elements and the timing data (percentComplete, msRemaining, timeStart, tweenDummyValue) into the progress callback. */
                if (opts.progress) {
                    opts.progress.call(callContainer[1],
                                       callContainer[1],
                                       percentComplete,
                                       Math.max(0, (timeStart + opts.duration) - timeCurrent),
                                       timeStart,
                                       tweenDummyValue);
                }

                /* If this call has finished tweening, pass its index to completeCall() to handle call cleanup. */
                if (percentComplete === 1) {
                    completeCall(i);
                }
            }
        }

        /* Note: completeCall() sets the isTicking flag to false when the last call on Velocity.State.calls has completed. */
        if (Velocity.State.isTicking) {
            ticker(tick);
        }
    }

    /**********************
        Call Completion
    **********************/

    /* Note: Unlike tick(), which processes all active calls at once, call completion is handled on a per-call basis. */
    function completeCall (callIndex, isStopped) {
        /* Ensure the call exists. */
        if (!Velocity.State.calls[callIndex]) {
            return false;
        }

        /* Pull the metadata from the call. */
        var call = Velocity.State.calls[callIndex][0],
            elements = Velocity.State.calls[callIndex][1],
            opts = Velocity.State.calls[callIndex][2],
            resolver = Velocity.State.calls[callIndex][4];

        var remainingCallsExist = false;

        /*************************
           Element Finalization
        *************************/

        for (var i = 0, callLength = call.length; i < callLength; i++) {
            var element = call[i].element;

            /* If the user set display to "none" (intending to hide the element), set it now that the animation has completed. */
            /* Note: display:none isn't set when calls are manually stopped (via Velocity("stop"). */
            /* Note: Display gets ignored with "reverse" calls and infinite loops, since this behavior would be undesirable. */
            if (!isStopped && !opts.loop) {
                if (opts.display === "none") {
                    CSS.setPropertyValue(element, "display", opts.display);
                }

                if (opts.visibility === "hidden") {
                    CSS.setPropertyValue(element, "visibility", opts.visibility);
                }
            }

            /* If the element's queue is empty (if only the "inprogress" item is left at position 0) or if its queue is about to run
               a non-Velocity-initiated entry, turn off the isAnimating flag. A non-Velocity-initiatied queue entry's logic might alter
               an element's CSS values and thereby cause Velocity's cached value data to go stale. To detect if a queue entry was initiated by Velocity,
               we check for the existence of our special Velocity.queueEntryFlag declaration, which minifiers won't rename since the flag
               is assigned to jQuery's global $ object and thus exists out of Velocity's own scope. */
            if (opts.loop !== true && ($.queue(element)[1] === undefined || !/\.velocityQueueEntryFlag/i.test($.queue(element)[1]))) {
                /* The element may have been deleted. Ensure that its data cache still exists before acting on it. */
                if (Data(element)) {
                    Data(element).isAnimating = false;
                    /* Clear the element's rootPropertyValueCache, which will become stale. */
                    Data(element).rootPropertyValueCache = {};

                    var transformHAPropertyExists = false;
                    /* If any 3D transform subproperty is at its default value (regardless of unit type), remove it. */
                    $.each(CSS.Lists.transforms3D, function(i, transformName) {
                        var defaultValue = /^scale/.test(transformName) ? 1 : 0,
                            currentValue = Data(element).transformCache[transformName];

                        if (Data(element).transformCache[transformName] !== undefined && new RegExp("^\\(" + defaultValue + "[^.]").test(currentValue)) {
                            transformHAPropertyExists = true;

                            delete Data(element).transformCache[transformName];
                        }
                    });

                    /* Mobile devices have hardware acceleration removed at the end of the animation in order to avoid hogging the GPU's memory. */
                    if (opts.mobileHA) {
                        transformHAPropertyExists = true;
                        delete Data(element).transformCache.translate3d;
                    }

                    /* Flush the subproperty removals to the DOM. */
                    if (transformHAPropertyExists) {
                        CSS.flushTransformCache(element);
                    }

                    /* Remove the "velocity-animating" indicator class. */
                    CSS.Values.removeClass(element, "velocity-animating");
                }
            }

            /*********************
               Option: Complete
            *********************/

            /* Complete is fired once per call (not once per element) and is passed the full raw DOM element set as both its context and its first argument. */
            /* Note: Callbacks aren't fired when calls are manually stopped (via Velocity("stop"). */
            if (!isStopped && opts.complete && !opts.loop && (i === callLength - 1)) {
                /* We throw callbacks in a setTimeout so that thrown errors don't halt the execution of Velocity itself. */
                try {
                    opts.complete.call(elements, elements);
                } catch (error) {
                    setTimeout(function() { throw error; }, 1);
                }
            }

            /**********************
               Promise Resolving
            **********************/

            /* Note: Infinite loops don't return promises. */
            if (resolver && opts.loop !== true) {
                resolver(elements);
            }

            /****************************
               Option: Loop (Infinite)
            ****************************/

            if (Data(element) && opts.loop === true && !isStopped) {
                /* If a rotateX/Y/Z property is being animated to 360 deg with loop:true, swap tween start/end values to enable
                   continuous iterative rotation looping. (Otherise, the element would just rotate back and forth.) */
                $.each(Data(element).tweensContainer, function(propertyName, tweenContainer) {
                    if (/^rotate/.test(propertyName) && parseFloat(tweenContainer.endValue) === 360) {
                        tweenContainer.endValue = 0;
                        tweenContainer.startValue = 360;
                    }

                    if (/^backgroundPosition/.test(propertyName) && parseFloat(tweenContainer.endValue) === 100 && tweenContainer.unitType === "%") {
                        tweenContainer.endValue = 0;
                        tweenContainer.startValue = 100;
                    }
                });

                Velocity(element, "reverse", { loop: true, delay: opts.delay });
            }

            /***************
               Dequeueing
            ***************/

            /* Fire the next call in the queue so long as this call's queue wasn't set to false (to trigger a parallel animation),
               which would have already caused the next call to fire. Note: Even if the end of the animation queue has been reached,
               $.dequeue() must still be called in order to completely clear jQuery's animation queue. */
            if (opts.queue !== false) {
                $.dequeue(element, opts.queue);
            }
        }

        /************************
           Calls Array Cleanup
        ************************/

        /* Since this call is complete, set it to false so that the rAF tick skips it. This array is later compacted via compactSparseArray().
          (For performance reasons, the call is set to false instead of being deleted from the array: http://www.html5rocks.com/en/tutorials/speed/v8/) */
        Velocity.State.calls[callIndex] = false;

        /* Iterate through the calls array to determine if this was the final in-progress animation.
           If so, set a flag to end ticking and clear the calls array. */
        for (var j = 0, callsLength = Velocity.State.calls.length; j < callsLength; j++) {
            if (Velocity.State.calls[j] !== false) {
                remainingCallsExist = true;

                break;
            }
        }

        if (remainingCallsExist === false) {
            /* tick() will detect this flag upon its next iteration and subsequently turn itself off. */
            Velocity.State.isTicking = false;

            /* Clear the calls array so that its length is reset. */
            delete Velocity.State.calls;
            Velocity.State.calls = [];
        }
    }

    /******************
        Frameworks
    ******************/

    /* Both jQuery and Zepto allow their $.fn object to be extended to allow wrapped elements to be subjected to plugin calls.
       If either framework is loaded, register a "velocity" extension pointing to Velocity's core animate() method.  Velocity
       also registers itself onto a global container (window.jQuery || window.Zepto || window) so that certain features are
       accessible beyond just a per-element scope. This master object contains an .animate() method, which is later assigned to $.fn
       (if jQuery or Zepto are present). Accordingly, Velocity can both act on wrapped DOM elements and stand alone for targeting raw DOM elements. */
    global.Velocity = Velocity;

    if (global !== window) {
        /* Assign the element function to Velocity's core animate() method. */
        global.fn.velocity = animate;
        /* Assign the object function's defaults to Velocity's global defaults object. */
        global.fn.velocity.defaults = Velocity.defaults;
    }

    /***********************
       Packaged Redirects
    ***********************/

    /* slideUp, slideDown */
    $.each([ "Down", "Up" ], function(i, direction) {
        Velocity.Redirects["slide" + direction] = function (element, options, elementsIndex, elementsSize, elements, promiseData) {
            var opts = $.extend({}, options),
                begin = opts.begin,
                complete = opts.complete,
                computedValues = { height: "", marginTop: "", marginBottom: "", paddingTop: "", paddingBottom: "" },
                inlineValues = {};

            if (opts.display === undefined) {
                /* Show the element before slideDown begins and hide the element after slideUp completes. */
                /* Note: Inline elements cannot have dimensions animated, so they're reverted to inline-block. */
                opts.display = (direction === "Down" ? (Velocity.CSS.Values.getDisplayType(element) === "inline" ? "inline-block" : "block") : "none");
            }

            opts.begin = function() {
                /* If the user passed in a begin callback, fire it now. */
                begin && begin.call(elements, elements);

                /* Cache the elements' original vertical dimensional property values so that we can animate back to them. */
                for (var property in computedValues) {
                    inlineValues[property] = element.style[property];

                    /* For slideDown, use forcefeeding to animate all vertical properties from 0. For slideUp,
                       use forcefeeding to start from computed values and animate down to 0. */
                    var propertyValue = Velocity.CSS.getPropertyValue(element, property);
                    computedValues[property] = (direction === "Down") ? [ propertyValue, 0 ] : [ 0, propertyValue ];
                }

                /* Force vertical overflow content to clip so that sliding works as expected. */
                inlineValues.overflow = element.style.overflow;
                element.style.overflow = "hidden";
            }

            opts.complete = function() {
                /* Reset element to its pre-slide inline values once its slide animation is complete. */
                for (var property in inlineValues) {
                    element.style[property] = inlineValues[property];
                }

                /* If the user passed in a complete callback, fire it now. */
                complete && complete.call(elements, elements);
                promiseData && promiseData.resolver(elements);
            };

            Velocity(element, computedValues, opts);
        };
    });

    /* fadeIn, fadeOut */
    $.each([ "In", "Out" ], function(i, direction) {
        Velocity.Redirects["fade" + direction] = function (element, options, elementsIndex, elementsSize, elements, promiseData) {
            var opts = $.extend({}, options),
                propertiesMap = { opacity: (direction === "In") ? 1 : 0 },
                originalComplete = opts.complete;

            /* Since redirects are triggered individually for each element in the animated set, avoid repeatedly triggering
               callbacks by firing them only when the final element has been reached. */
            if (elementsIndex !== elementsSize - 1) {
                opts.complete = opts.begin = null;
            } else {
                opts.complete = function() {
                    if (originalComplete) {
                        originalComplete.call(elements, elements);
                    }

                    promiseData && promiseData.resolver(elements);
                }
            }

            /* If a display was passed in, use it. Otherwise, default to "none" for fadeOut or the element-specific default for fadeIn. */
            /* Note: We allow users to pass in "null" to skip display setting altogether. */
            if (opts.display === undefined) {
                opts.display = (direction === "In" ? "auto" : "none");
            }

            Velocity(this, propertiesMap, opts);
        };
    });

    return Velocity;
}((window.jQuery || window.Zepto || window), window, document);
}));

/******************
   Known Issues
******************/

/* The CSS spec mandates that the translateX/Y/Z transforms are %-relative to the element itself -- not its parent.
Velocity, however, doesn't make this distinction. Thus, converting to or from the % unit with these subproperties
will produce an inaccurate conversion value. The same issue exists with the cx/cy attributes of SVG circles and ellipses. */
define("ember-autoresize", ["ember-autoresize/index", "ember", "exports"], function(__index__, __Ember__, __exports__) {
  "use strict";
  __Ember__["default"].keys(__index__).forEach(function(key){
    __exports__[key] = __index__[key];
  });
});

define('ember-autoresize/ext/text-area', ['ember', 'ember-autoresize/mixins/autoresize'], function (Ember, AutoResize) {

  'use strict';

  var get = Ember['default'].get;
  var isNone = Ember['default'].isNone;

  /**
    @namespace Ember
    @class TextArea
   */
  Ember['default'].TextArea.reopen(AutoResize['default'], /** @scope Ember.TextArea.prototype */{

    /**
      By default, textareas only resize
      their height.
       @property shouldResizeHeight
      @type Boolean
     */
    shouldResizeHeight: true,

    /**
      Whitespace should be treated as significant
      for text areas.
       @property significantWhitespace
      @default true
      @type Boolean
     */
    significantWhitespace: true,

    /**
      Optimistically resize the height
      of the textarea so when users reach
      the end of a line, they will be
      presented with space to begin typing.
       @property autoResizeText
      @type String
     */
    autoResizeText: Ember['default'].computed("value", function () {
      var value = get(this, "value");
      if (isNone(value)) {
        value = "";
      }
      return value + "@";
    })

  });

});
define('ember-autoresize/ext/text-field', ['ember', 'ember-autoresize/mixins/autoresize'], function (Ember, AutoResize) {

  'use strict';

  var get = Ember['default'].get;
  var isEmpty = Ember['default'].isEmpty;

  /**
    @namespace Ember
    @class TextField
   */
  Ember['default'].TextField.reopen(AutoResize['default'], /** @scope Ember.TextField.prototype */{

    /**
      By default, text fields only
      resize their width.
       @property shouldResizeWidth
      @default true
      @type Boolean
     */
    shouldResizeWidth: true,

    /**
      Whitespace should be treated as significant
      for text fields.
       @property significantWhitespace
      @default true
      @type Boolean
     */
    significantWhitespace: true,

    /**
      This provides a single character
      so users can click into an empty
      text field without it being too small
       @property autoResizeText
      @type String
     */
    autoResizeText: Ember['default'].computed("value", function () {
      var value = get(this, "value");
      return isEmpty(value) ? "." : value;
    })

  });

});
define('ember-autoresize/mixins/autoresize', ['exports', 'dom-ruler', 'ember'], function (exports, dom_ruler, Ember) {

  'use strict';

  var get = Ember['default'].get;
  var set = Ember['default'].set;
  var scheduleOnce = Ember['default'].run.scheduleOnce;
  var once = Ember['default'].run.once;
  var keys = Ember['default'].keys;
  var isEmpty = Ember['default'].isEmpty;
  var alias = Ember['default'].computed.alias;
  var computed = Ember['default'].computed;
  var observer = Ember['default'].observer;
  var on = Ember['default'].on;

  function withUnits(number) {
    var unitlessNumber = parseInt(number + "", 10) + "";
    if (unitlessNumber === number + "") {
      return "" + number + "px";
    }
    return number;
  }

  /**
    This mixin provides common functionality for automatically
    resizing view depending on the contents of the view. To
    make your view resize, you need to set the `autoresize`
    property to `true`, and let the mixin know whether it
    can resize the height of width.

    In addition, `autoResizeText` is a required property for
    this mixin. It is already provided for `Ember.TextField` and
    `Ember.TextArea`.

    @class AutoResize
    @extends Ember.Mixin
    @since Ember 1.0.0-rc3
   */
  exports['default'] = Ember['default'].Mixin.create( /** @scope AutoResize.prototype */{

    /**
      Add `ember-auto-resize` so additional
      styling can be applied indicating that
      the text field will automatically resize.
       @property classNameBindings
     */
    classNameBindings: ["autoresize:ember-auto-resize"],

    /**
      Whether the view using this mixin should
      autoresize it's contents. To enable autoresizing
      using the view's default resizing, set
      the attribute in your template.
       ```handlebars
      {{input autoresize=true}}
      ```
       @property autoresize
      @type Boolean
      @default false
     */
    autoresize: computed(function (_, value) {
      if (typeof document === "undefined") {
        return false;
      }
      return value;
    }),

    /**
      The current dimensions of the view being
      resized in terms of an object hash that
      includes a `width` and `height` property.
       @property dimensions
      @default null
      @type Object
     */
    dimensions: null,

    /**
      Whether the auto resize mixin should resize
      the width of this view.
       @property shouldResizeWidth
      @default false
      @type Boolean
     */
    shouldResizeWidth: false,

    /**
      Whether the auto resize mixin should resize
      the height of this view.
       @property shouldResizeHeight
      @default false
      @type Boolean
     */
    shouldResizeHeight: false,

    /**
      If set, this property will dictate how much
      the view is allowed to resize horizontally
      until it either falls back to scrolling or
      resizing vertically.
       @property maxWidth
      @default null
      @type Number
     */
    maxWidth: alias("max-width"),

    /**
      If set, this property dictates how much
      the view is allowed to resize vertically.
      If this is not set and the view is allowed
      to resize vertically, it will do so infinitely.
       @property maxHeight
      @default null
      @type Number
     */
    maxHeight: alias("max-height"),

    /**
      A required property that should alias the
      property that should trigger recalculating
      the dimensions of the view.
       @property autoResizeText
      @required
      @type String
     */
    autoResizeText: null,

    /**
      Whether the autoResizeText has been sanitized
      and should be treated as HTML.
       @property ignoreEscape
      @default false
      @type Boolean
     */
    ignoreEscape: false,

    /**
      Whether whitespace should be treated as significant
      contrary to any styles on the view.
       @property significantWhitespace
      @default false
      @type Boolean
     */
    significantWhitespace: false,

    /**
      Schedule measuring the view's size.
      This happens automatically when the
      `autoResizeText` property changes.
       @method scheduleMeasurement
     */
    scheduleMeasurement: on("init", observer("autoResizeText", function () {
      if (get(this, "autoresize")) {
        once(this, "measureSize");
      }
    })),

    /**
      Measures the size of the text of the element.
       @method measureSize
     */
    measureSize: function measureSize() {
      var text = get(this, "autoResizeText");

      if (isEmpty(text) || get(this, "isDestroying")) {
        set(this, "measuredSize", { width: 0, height: 0 });
      }

      // Provide extra styles that will restrict
      // width / height growth
      var element = get(this, "element");
      var styles = {};

      if (get(this, "shouldResizeWidth")) {
        if (get(this, "maxWidth") != null) {
          styles.maxWidth = withUnits(get(this, "maxWidth"));
        }
      } else {
        styles.maxWidth = dom_ruler.getLayout(element).width + "px";
      }

      if (get(this, "shouldResizeHeight")) {
        if (get(this, "maxHeight") != null) {
          styles.maxHeight = withUnits(get(this, "maxHeight"));
        }
      } else {
        styles.maxHeight = dom_ruler.getLayout(element).height + "px";
      }

      function measureRows(rows) {
        var html = "";
        for (var i = 0, len = parseInt(rows, 10); i < len; i++) {
          html += "<br>";
        }
        return dom_ruler.measureText(html, styles, { template: element, escape: false }).height;
      }

      // Handle 'rows' attribute on <textarea>s
      if (get(this, "rows")) {
        styles.minHeight = measureRows(get(this, "rows")) + "px";
      }

      // Handle 'max-rows' attribute on <textarea>s
      if (get(this, "max-rows") && get(this, "maxHeight") == null) {
        set(this, "maxHeight", measureRows(get(this, "max-rows")));
        styles.maxHeight = get(this, "maxHeight") + "px";
      }

      // Force white-space to pre-wrap to make
      // whitespace significant
      if (get(this, "significantWhitespace")) {
        styles.whiteSpace = "pre-wrap";
      }

      // Create a signature so we can cache the max width and height
      var signature = styles.maxWidth + styles.maxHeight;
      if (signature !== this._signature) {
        var maxDimensions = dom_ruler.measureText("", {
          width: styles.maxWidth,
          height: styles.maxHeight }, { template: element });
        this._signature = signature;
        this._maxWidth = maxDimensions.width;
        this._maxHeight = maxDimensions.height;
      }

      var size = dom_ruler.measureText(text, styles, {
        template: element,
        escape: !get(this, "ignoreEscape") });

      if (styles.maxWidth) {
        size.maxWidth = this._maxWidth;
      }
      if (styles.maxHeight) {
        size.maxHeight = this._maxHeight;
      }
      set(this, "measuredSize", size);
    },

    /**
      Alter the `dimensions` property of the
      view to conform to the measured size of
      the view.
       @method measuredSizeDidChange
     */
    measuredSizeDidChange: on("didInsertElement", observer("measuredSize", function () {
      var size = get(this, "measuredSize");
      if (size == null) {
        return;
      }

      var maxWidth = size.maxWidth;
      var maxHeight = size.maxHeight;

      var layoutDidChange = false;
      var dimensions = {};

      if (get(this, "shouldResizeWidth")) {
        // Account for off-by-one error in FireFox
        // (specifically, input elements have 1px
        //  of scroll when this isn't applied)
        // TODO: sniff for this bug and fix it!
        size.width += 1;

        if (maxWidth != null && size.width > maxWidth) {
          dimensions.width = maxWidth;
        } else {
          dimensions.width = size.width;
        }
        layoutDidChange = true;
      }

      if (get(this, "shouldResizeHeight")) {
        if (maxHeight != null && size.height > maxHeight) {
          dimensions.height = maxHeight;
        } else {
          dimensions.height = size.height;
        }
        layoutDidChange = true;
      }

      set(this, "dimensions", dimensions);

      if (layoutDidChange) {
        scheduleOnce("render", this, "dimensionsDidChange");
      }
    })),

    /**
      Retiles the view at the end of the render queue.
      @method dimensionsDidChange
     */
    dimensionsDidChange: function dimensionsDidChange() {
      var dimensions = get(this, "dimensions");
      var styles = {};

      keys(dimensions).forEach(function (key) {
        styles[key] = dimensions[key] + "px";
      });

      if (get(this, "maxHeight") == null) {
        styles.overflow = "hidden";
      }

      var $element = this.$();
      if ($element) {
        $element.css(styles);
      }
    }

  });

});
define("ember-cli-app-version", ["ember-cli-app-version/index", "ember", "exports"], function(__index__, __Ember__, __exports__) {
  "use strict";
  __Ember__["default"].keys(__index__).forEach(function(key){
    __exports__[key] = __index__[key];
  });
});

define("ember-cli-content-security-policy", ["ember-cli-content-security-policy/index", "ember", "exports"], function(__index__, __Ember__, __exports__) {
  "use strict";
  __Ember__["default"].keys(__index__).forEach(function(key){
    __exports__[key] = __index__[key];
  });
});

define("liquid-fire", ["liquid-fire/index", "ember", "exports"], function(__index__, __Ember__, __exports__) {
  "use strict";
  __Ember__["default"].keys(__index__).forEach(function(key){
    __exports__[key] = __index__[key];
  });
});

define('liquid-fire/action', ['exports', 'liquid-fire/promise'], function (exports, Promise) {

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var Action = (function () {
    function Action(nameOrHandler) {
      var args = arguments[1] === undefined ? [] : arguments[1];
      var opts = arguments[2] === undefined ? {} : arguments[2];

      _classCallCheck(this, Action);

      if (typeof nameOrHandler === "function") {
        this.handler = nameOrHandler;
      } else {
        this.name = nameOrHandler;
      }
      this.reversed = opts.reversed;
      this.args = args;
    }

    _createClass(Action, {
      validateHandler: {
        value: function validateHandler(transitionMap) {
          if (!this.handler) {
            this.handler = transitionMap.lookup(this.name);
          }
        }
      },
      run: {
        value: function run(context) {
          var _this = this;

          return new Promise['default'](function (resolve, reject) {
            Promise['default'].resolve(_this.handler.apply(context, _this.args)).then(resolve, reject);
          });
        }
      }
    });

    return Action;
  })();

  exports['default'] = Action;

});
define('liquid-fire/animate', ['exports', 'liquid-fire/promise', 'ember'], function (exports, Promise, Ember) {

  'use strict';

  exports.animate = animate;
  exports.stop = stop;
  exports.setDefaults = setDefaults;
  exports.isAnimating = isAnimating;
  exports.finish = finish;
  exports.timeSpent = timeSpent;
  exports.timeRemaining = timeRemaining;

  var Velocity = Ember['default'].$.Velocity;

  // Make sure Velocity always has promise support by injecting our own
  // RSVP-based implementation if it doesn't already have one.
  if (!Velocity.Promise) {
    Velocity.Promise = Promise['default'];
  }
  function animate(elt, props, opts, label) {
    // These numbers are just sane defaults in the probably-impossible
    // case where somebody tries to read our state before the first
    // 'progress' callback has fired.
    var state = { percentComplete: 0, timeRemaining: 100, timeSpent: 0 };

    if (!elt || elt.length === 0) {
      return Promise['default'].resolve();
    }

    if (!opts) {
      opts = {};
    } else {
      opts = Ember['default'].copy(opts);
    }

    // By default, we ask velocity to clear the element's `display`
    // and `visibility` properties at the start of animation. Our
    // animated divs are all initially rendered with `display:none`
    // and `visibility:hidden` to prevent a flash of before-animated
    // content.
    if (typeof opts.display === "undefined") {
      opts.display = "";
    }
    if (typeof opts.visibility === "undefined") {
      opts.visibility = "visible";
    }

    if (opts.progress) {
      throw new Error("liquid-fire's 'animate' function reserves the use of Velocity's 'progress' option for its own nefarious purposes.");
    }

    opts.progress = function () {
      state.percentComplete = arguments[1];
      state.timeRemaining = arguments[2];
      state.timeSpent = state.timeRemaining / (1 / state.percentComplete - 1);
    };

    state.promise = Promise['default'].resolve(Velocity.animate(elt[0], props, opts));

    if (label) {
      state.promise = state.promise.then(function () {
        clearLabel(elt, label);
      }, function (err) {
        clearLabel(elt, label);
        throw err;
      });
      applyLabel(elt, label, state);
    }

    return state.promise;
  }

  function stop(elt) {
    if (elt) {
      elt.velocity("stop", true);
    }
  }

  function setDefaults(props) {
    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        if (key === "progress") {
          throw new Error("liquid-fire's 'animate' function reserves the use of Velocity's '" + key + "' option for its own nefarious purposes.");
        }
        Velocity.defaults[key] = props[key];
      }
    }
  }

  function isAnimating(elt, animationLabel) {
    return elt && elt.data("lfTags_" + animationLabel);
  }

  function finish(elt, animationLabel) {
    return stateForLabel(elt, animationLabel).promise;
  }

  function timeSpent(elt, animationLabel) {
    return stateForLabel(elt, animationLabel).timeSpent;
  }

  function timeRemaining(elt, animationLabel) {
    return stateForLabel(elt, animationLabel).timeRemaining;
  }

  function stateForLabel(elt, label) {
    var state = isAnimating(elt, label);
    if (!state) {
      throw new Error("no animation labeled " + label + " is in progress");
    }
    return state;
  }

  function applyLabel(elt, label, state) {
    if (elt) {
      elt.data("lfTags_" + label, state);
    }
  }

  function clearLabel(elt, label) {
    if (elt) {
      elt.data("lfTags_" + label, null);
    }
  }

});
define('liquid-fire/constrainables', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = {
    oldValue: {
      reversesTo: "newValue",
      accessor: function accessor(conditions) {
        return [versionValue(conditions, 1)];
      }
    },
    newValue: {
      reversesTo: "oldValue",
      accessor: function accessor(conditions) {
        return [versionValue(conditions, 0)];
      }
    },
    oldRoute: {
      reversesTo: "newRoute",
      accessor: function accessor(conditions) {
        return ember_internals.routeName(versionValue(conditions, 1));
      }
    },
    newRoute: {
      reversesTo: "oldRoute",
      accessor: function accessor(conditions) {
        return ember_internals.routeName(versionValue(conditions, 0));
      }
    },
    oldModel: {
      reversesTo: "newModel",
      accessor: function accessor(conditions) {
        return ember_internals.routeModel(versionValue(conditions, 1));
      }
    },
    newModel: {
      reversesTo: "oldModel",
      accessor: function accessor(conditions) {
        return ember_internals.routeModel(versionValue(conditions, 0));
      }
    },
    helperName: {},
    parentElementClass: {
      accessor: function accessor(conditions) {
        var cls = conditions.parentElement.attr("class");
        if (cls) {
          return cls.split(/\s+/);
        }
      }
    },
    parentElement: {},
    firstTime: {},
    oldModalComponent: {
      reversesTo: "newModalComponent",
      accessor: function accessor(conditions) {
        var value = versionValue(conditions, 1);
        if (value) {
          return [value.name];
        }
      }
    },
    newModalComponent: {
      reversesTo: "oldModalComponent",
      accessor: function accessor(conditions) {
        var value = versionValue(conditions, 0);
        if (value) {
          return [value.name];
        }
      }
    } };

  function versionValue(conditions, index) {
    var versions = conditions.versions;
    return versions[index] ? versions[index].value : null;
  }

});
define('liquid-fire/constraint', ['exports', 'ember', 'liquid-fire/constrainables'], function (exports, Ember, constrainables) {

  'use strict';

  exports.constraintKeys = constraintKeys;

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var Constraint = (function () {
    function Constraint(target, matcher) {
      _classCallCheck(this, Constraint);

      // targets are the properties of a transition that we can
      // constrain
      this.target = target;
      if (arguments.length === 1) {
        return;
      }
      if (matcher instanceof RegExp) {
        this.predicate = function (value) {
          return matcher.test(value);
        };
      } else if (typeof matcher === "function") {
        this.predicate = matcher;
      } else if (typeof matcher === "boolean") {
        this.predicate = function (value) {
          return matcher ? value : !value;
        };
      } else {
        this.keys = constraintKeys(matcher);
      }
    }

    _createClass(Constraint, {
      invert: {
        value: function invert() {
          if (!constrainables['default'][this.target].reversesTo) {
            return this;
          }
          var inverse = new this.constructor(constrainables['default'][this.target].reversesTo);
          inverse.predicate = this.predicate;
          inverse.keys = this.keys;
          return inverse;
        }
      }
    });

    return Constraint;
  })();

  exports['default'] = Constraint;

  var EMPTY = "__liquid_fire_EMPTY__";
  var ANY = "__liquid_fire_ANY__";function constraintKeys(matcher) {
    if (typeof matcher === "undefined" || matcher === null) {
      matcher = [EMPTY];
    } else if (!Ember['default'].isArray(matcher)) {
      matcher = [matcher];
    }
    return Ember['default'].A(matcher).map(function (elt) {
      if (typeof elt === "string") {
        return elt;
      } else {
        return Ember['default'].guidFor(elt);
      }
    });
  }

  exports.EMPTY = EMPTY;
  exports.ANY = ANY;

});
define('liquid-fire/constraints', ['exports', 'ember', 'liquid-fire/constraint', 'liquid-fire/constrainables'], function (exports, Ember, ___constraint, constrainables) {

  'use strict';

  var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var Constraints = (function () {
    function Constraints() {
      _classCallCheck(this, Constraints);

      this.targets = {};
      this.ruleCounter = 0;
      for (var i = 0; i < constrainableKeys.length; i++) {
        this.targets[constrainableKeys[i]] = {};
      }
    }

    _createClass(Constraints, {
      addRule: {
        value: function addRule(rule) {
          rule.id = this.ruleCounter++;
          if (rule.debug) {
            this.debug = true;
          }
          this.addHalfRule(rule);
          if (rule.reverse) {
            var inverted = rule.invert();
            inverted.id = rule.id + " reverse";
            this.addHalfRule(inverted);
          }
        }
      },
      addHalfRule: {
        value: function addHalfRule(rule) {
          var _this = this;

          var seen = {};
          rule.constraints.forEach(function (constraint) {
            seen[constraint.target] = true;
            _this.addConstraint(rule, constraint);
          });
          constrainableKeys.forEach(function (key) {
            if (!seen[key]) {
              _this.addConstraint(rule, { target: key });
            }
          });
        }
      },
      addConstraint: {
        value: function addConstraint(rule, constraint) {
          var _this = this;

          var context = this.targets[constraint.target];
          if (!context) {
            throw new Error("Unknown constraint target " + constraint.target);
          }
          if (constraint.keys) {
            constraint.keys.forEach(function (key) {
              _this.addKey(context, key, rule);
            });
          } else {
            this.addKey(context, ___constraint.ANY, rule);
          }
        }
      },
      addKey: {
        value: function addKey(context, key, rule) {
          if (!context[key]) {
            context[key] = {};
          }
          context[key][Ember['default'].guidFor(rule)] = rule;
        }
      },
      bestMatch: {
        value: function bestMatch(conditions) {
          if (this.debug) {
            console.log("[liquid-fire] Checking transition rules for", conditions.parentElement[0]);
          }

          var rules = this.match(conditions);
          var best = highestPriority(rules);

          if (rules.length > 1 && this.debug) {
            rules.forEach(function (rule) {
              if (rule !== best && rule.debug) {
                console.log("" + describeRule(rule) + " matched, but it was superceded by another rule");
              }
            });
          }
          if (best && best.debug) {
            console.log("" + describeRule(best) + " matched");
          }
          return best;
        }
      },
      match: {
        value: function match(conditions) {
          var rules = this.matchByKeys(conditions);
          rules = this.matchPredicates(conditions, rules);
          return rules;
        }
      },
      matchByKeys: {
        value: function matchByKeys(conditions) {
          var matchSets = [];
          for (var i = 0; i < constrainableKeys.length; i++) {
            var key = constrainableKeys[i];
            var value = conditionAccessor(conditions, key);
            matchSets.push(this.matchingSet(key, value));
          }
          return intersection(matchSets);
        }
      },
      matchingSet: {
        value: function matchingSet(prop, value) {
          var keys = ___constraint.constraintKeys(value);
          var context = this.targets[prop];
          var matched = Ember['default'].A();
          for (var i = 0; i < keys.length; i++) {
            if (context[keys[i]]) {
              matched.push(context[keys[i]]);
            }
          }
          if (keys.length === 0 && context[___constraint.EMPTY]) {
            matched.push(context[___constraint.EMPTY]);
          }
          if (context[___constraint.ANY]) {
            matched.push(context[___constraint.ANY]);
          }
          matched = union(matched);
          if (this.debug) {
            this.logDebugRules(matched, context, prop, value);
          }
          return matched;
        }
      },
      logDebugRules: {
        value: function logDebugRules(matched, context, target, value) {
          Ember['default'].A(Ember['default'].keys(context)).forEach(function (setKey) {
            var set = context[setKey];
            Ember['default'].A(Ember['default'].keys(set)).forEach(function (ruleKey) {
              var rule = set[ruleKey];
              if (rule.debug && !matched[Ember['default'].guidFor(rule)]) {
                console.log.apply(console, ["" + describeRule(rule) + " rejected because " + target + " was"].concat(_toConsumableArray(value)));
              }
            });
          });
        }
      },
      matchPredicates: {
        value: function matchPredicates(conditions, rules) {
          var output = [];
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            var matched = true;
            for (var j = 0; j < rule.constraints.length; j++) {
              var constraint = rule.constraints[j];
              if (constraint.predicate && !this.matchConstraintPredicate(conditions, rule, constraint)) {
                matched = false;
                break;
              }
            }
            if (matched) {
              output.push(rule);
            }
          }
          return output;
        }
      },
      matchConstraintPredicate: {
        value: function matchConstraintPredicate(conditions, rule, constraint) {
          var values = conditionAccessor(conditions, constraint.target);
          var reverse = constrainables['default'][constraint.target].reversesTo;
          var inverseValues;
          if (reverse) {
            inverseValues = conditionAccessor(conditions, reverse);
          }
          for (var i = 0; i < values.length; i++) {
            if (constraint.predicate(values[i], inverseValues ? inverseValues[i] : null)) {
              return true;
            }
          }
          if (rule.debug) {
            if (constraint.target === "parentElement") {
              values = values.map(function (v) {
                return v[0];
              });
            }
            console.log.apply(console, ["" + describeRule(rule) + " rejected because of a constraint on " + constraint.target + ". " + constraint.target + " was"].concat(_toConsumableArray(values)));
          }
        }
      }
    });

    return Constraints;
  })();

  exports['default'] = Constraints;

  function conditionAccessor(conditions, key) {
    var constrainable = constrainables['default'][key];
    if (constrainable.accessor) {
      return constrainable.accessor(conditions) || [];
    } else {
      return [conditions[key]];
    }
  }

  // Returns a list of property values from source whose keys also
  // appear in all of the rest objects.
  function intersection(sets) {
    var source = sets[0];
    var rest = sets.slice(1);
    var keys = Ember['default'].keys(source);
    var keysLength = keys.length;
    var restLength = rest.length;
    var result = [];
    for (var keyIndex = 0; keyIndex < keysLength; keyIndex++) {
      var key = keys[keyIndex];
      var matched = true;
      for (var restIndex = 0; restIndex < restLength; restIndex++) {
        if (!rest[restIndex].hasOwnProperty(key)) {
          matched = false;
          break;
        }
      }
      if (matched) {
        result.push(source[key]);
      }
    }
    return result;
  }

  function union(sets) {
    var setsLength = sets.length;
    var output = {};
    for (var i = 0; i < setsLength; i++) {
      var set = sets[i];
      var keys = Ember['default'].keys(set);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        output[key] = set[key];
      }
    }
    return output;
  }

  function describeRule(rule) {
    return "[liquid-fire rule " + rule.id + "]";
  }

  function highestPriority(rules) {
    var best;
    var bestScore = 0;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      var score = rules[i].constraints.length;
      if (!best || score > bestScore || score === bestScore && rule.id > best.id) {
        best = rule;
        bestScore = score;
      }
    }
    return best;
  }

  var constrainableKeys = Ember['default'].A(Ember['default'].keys(constrainables['default']));

});
define('liquid-fire/dsl', ['exports', 'liquid-fire/animate', 'liquid-fire/rule', 'liquid-fire/constraint', 'liquid-fire/action'], function (exports, animate, Rule, Constraint, Action) {

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var DSL = (function () {
    function DSL(map) {
      _classCallCheck(this, DSL);

      this.map = map;
    }

    _createClass(DSL, {
      setDefault: {
        value: function setDefault(props) {
          animate.setDefaults(props);
        }
      },
      transition: {
        value: function transition() {
          var rule = new Rule['default']();
          var parts = Array.prototype.slice.apply(arguments).reduce(function (a, b) {
            return a.concat(b);
          }, []);

          for (var i = 0; i < parts.length; i++) {
            rule.add(parts[i]);
          }

          this.map.addRule(rule);
        }
      },
      fromRoute: {
        value: function fromRoute(routeName) {
          return [new Constraint['default']("oldRoute", routeName)];
        }
      },
      toRoute: {
        value: function toRoute(routeName) {
          return [new Constraint['default']("newRoute", routeName)];
        }
      },
      withinRoute: {
        value: function withinRoute(routeName) {
          return this.fromRoute(routeName).concat(this.toRoute(routeName));
        }
      },
      fromValue: {
        value: function fromValue(matcher) {
          return [new Constraint['default']("oldValue", matcher)];
        }
      },
      toValue: {
        value: function toValue(matcher) {
          return [new Constraint['default']("newValue", matcher)];
        }
      },
      betweenValues: {
        value: function betweenValues(matcher) {
          return this.fromValue(matcher).concat(this.toValue(matcher));
        }
      },
      fromModel: {
        value: function fromModel(matcher) {
          return [new Constraint['default']("oldModel", matcher)];
        }
      },
      toModel: {
        value: function toModel(matcher) {
          return [new Constraint['default']("newModel", matcher)];
        }
      },
      betweenModels: {
        value: function betweenModels(matcher) {
          return this.fromModel(matcher).concat(this.toModel(matcher));
        }
      },
      hasClass: {
        value: function hasClass(name) {
          return new Constraint['default']("parentElementClass", name);
        }
      },
      matchSelector: {
        value: function matchSelector(selector) {
          return new Constraint['default']("parentElement", function (elt) {
            return elt.is(selector);
          });
        }
      },
      childOf: {
        value: function childOf(selector) {
          return this.matchSelector(selector + " > *");
        }
      },
      use: {
        value: function use(nameOrHandler) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return new Action['default'](nameOrHandler, args);
        }
      },
      reverse: {
        value: function reverse(nameOrHandler) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return new Action['default'](nameOrHandler, args, { reversed: true });
        }
      },
      useAndReverse: {
        value: function useAndReverse(nameOrHandler) {
          for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return [this.use.apply(this, [nameOrHandler].concat(args)), this.reverse.apply(this, [nameOrHandler].concat(args))];
        }
      },
      onInitialRender: {
        value: function onInitialRender() {
          return new Constraint['default']("firstTime", "yes");
        }
      },
      includingInitialRender: {
        value: function includingInitialRender() {
          return new Constraint['default']("firstTime", ["yes", "no"]);
        }
      },
      inHelper: {
        value: function inHelper() {
          for (var _len = arguments.length, names = Array(_len), _key = 0; _key < _len; _key++) {
            names[_key] = arguments[_key];
          }

          return new Constraint['default']("helperName", names);
        }
      },
      toModal: {
        value: function toModal(matcher) {
          return new Constraint['default']("newModalComponent", matcher);
        }
      },
      fromModal: {
        value: function fromModal(matcher) {
          return new Constraint['default']("oldModalComponent", matcher);
        }
      },
      debug: {
        value: function debug() {
          return "debug";
        }
      }
    });

    return DSL;
  })();

  exports['default'] = DSL;

});
define('liquid-fire/ember-internals', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports.containingElement = containingElement;
  exports.makeHelperShim = makeHelperShim;
  exports.inverseYieldHelper = inverseYieldHelper;
  exports.inverseYieldMethod = inverseYieldMethod;
  exports.routeName = routeName;
  exports.routeModel = routeModel;

  // Given an Ember.View, return the containing element
  var get = Ember['default'].get;
  var set = Ember['default'].set;
  function containingElement(view) {
    return view._morph.contextualElement;
  }

  function makeHelperShim(componentName, tweak) {
    return {
      isHTMLBars: true,
      helperFunction: function liquidFireHelper(params, hash, options, env) {
        var view = env.data.view;
        var componentLookup = view.container.lookup("component-lookup:main");
        var cls = componentLookup.lookupFactory(componentName);
        hash.value = params[0];
        if (hash["class"]) {
          hash.innerClass = hash["class"];
          delete hash["class"];
        }
        if (hash.id) {
          hash.innerId = hash.id;
          delete hash.id;
        }
        hash.tagName = "";
        if (tweak) {
          tweak(params, hash, options, env);
        }
        env.helpers.view.helperFunction.call(view, [cls], hash, options, env);
      }
    };
  }

  function inverseYieldHelper(params, hash, options, env) {
    var view = env.data.view;

    while (view && !get(view, "layout")) {
      if (view._contextView) {
        view = view._contextView;
      } else {
        view = view._parentView;
      }
    }

    return view._yieldInverse(env.data.view, env, options.morph, params);
  }

  function inverseYieldMethod(context, options, morph, blockArguments) {
    var view = options.data.view;
    var parentView = this._parentView;
    var template = get(this, "inverseTemplate");

    if (template) {
      view.appendChild(Ember['default'].View, {
        isVirtual: true,
        tagName: "",
        template: template,
        _blockArguments: blockArguments,
        _contextView: parentView,
        _morph: morph,
        context: get(parentView, "context"),
        controller: get(parentView, "controller")
      });
    }
  }

  // This lets us hook into the outlet state.
  var OutletBehavior = {
    _isOutlet: true,

    init: function init() {
      this._super();
      this._childOutlets = [];

      // Our outlet state is named differently than a normal ember
      // outlet ("_outletState"), so that our child outlets don't
      // automatically discover it. Instead we will always push state
      // down to them, so we can version it as we wish.
      this.outletState = null;
    },

    setOutletState: function setOutletState(state) {
      if (state && state.render && state.render.controller && !state._lf_model) {
        // This is a hack to compensate for Ember 1.0's remaining use of
        // mutability within the route state -- the controller is a
        // singleton whose model will keep changing on us. By locking it
        // down the first time we see the state, we can more closely
        // emulate ember 2.0 semantics.
        //
        // The Ember 2.0 component attributes shouldn't suffer this
        // problem and we can eventually drop the hack.
        state = Ember['default'].copy(state);
        state._lf_model = get(state.render.controller, "model");
      }

      if (!this._diffState(state)) {
        var children = this._childOutlets;
        for (var i = 0; i < children.length; i++) {
          var child = children[i];
          child.setOutletState(state);
        }
      }
    },

    _diffState: function _diffState(state) {
      while (state && emptyRouteState(state)) {
        state = state.outlets.main;
      }
      var different = !sameRouteState(this.outletState, state);

      if (different) {
        set(this, "outletState", state);
      }

      return different;
    },

    _parentOutlet: function _parentOutlet() {
      var parent = this._parentView;
      while (parent && !parent._isOutlet) {
        parent = parent._parentView;
      }
      return parent;
    },

    _linkParent: Ember['default'].on("init", "parentViewDidChange", function () {
      var parent = this._parentOutlet();
      if (parent) {
        this._parentOutletLink = parent;
        parent._childOutlets.push(this);
        if (parent._outletState && parent._outletState.outlets[this._outletName]) {
          this.setOutletState(parent._outletState.outlets[this._outletName]);
        }
      }
    }),

    willDestroy: function willDestroy() {
      if (this._parentOutletLink) {
        this._parentOutletLink._childOutlets.removeObject(this);
      }
      this._super();
    }
  };

  function emptyRouteState(state) {
    return !state.render.ViewClass && !state.render.template;
  }

  function sameRouteState(a, b) {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    a = a.render;
    b = b.render;
    for (var key in a) {
      if (a.hasOwnProperty(key)) {
        // name is only here for logging & debugging. If two different
        // names result in otherwise identical states, they're still
        // identical.
        if (a[key] !== b[key] && key !== "name") {
          return false;
        }
      }
    }
    return true;
  }

  // This lets us invoke an outlet with an explicitly passed outlet
  // state, rather than inheriting it implicitly from its context.
  var StaticOutlet = Ember['default'].OutletView.superclass.extend({
    tagName: "",

    setStaticState: Ember['default'].on("init", Ember['default'].observer("staticState", function () {
      this.setOutletState(this.get("staticState"));
    }))
  });function routeName(routeState) {
    if (routeState && routeState.render) {
      return [routeState.render.name];
    }
  }

  function routeModel(routeState) {
    if (routeState) {
      return [routeState._lf_model];
    }
  }

  exports.OutletBehavior = OutletBehavior;
  exports.StaticOutlet = StaticOutlet;

});
define('liquid-fire/growable', ['exports', 'ember', 'liquid-fire/promise'], function (exports, Ember, Promise) {

  'use strict';

  var capitalize = Ember['default'].String.capitalize;

  exports['default'] = Ember['default'].Mixin.create({
    growDuration: 250,
    growPixelsPerSecond: 200,
    growEasing: "slide",

    transitionMap: Ember['default'].inject.service("liquid-fire-transitions"),

    animateGrowth: function animateGrowth(elt, have, want) {
      var _this = this;

      this.get("transitionMap").incrementRunningTransitions();
      return Promise['default'].all([this._adaptDimension(elt, "width", have, want), this._adaptDimension(elt, "height", have, want)]).then(function () {
        _this.get("transitionMap").decrementRunningTransitions();
      });
    },

    _adaptDimension: function _adaptDimension(elt, dimension, have, want) {
      var target = {};
      target["outer" + capitalize(dimension)] = [want[dimension], have[dimension]];
      return Ember['default'].$.Velocity(elt[0], target, {
        duration: this._durationFor(have[dimension], want[dimension]),
        queue: false,
        easing: this.get("growEasing") || this.constructor.prototype.growEasing
      });
    },

    _durationFor: function _durationFor(before, after) {
      return Math.min(this.get("growDuration") || this.constructor.prototype.growDuration, 1000 * Math.abs(before - after) / this.get("growPixelsPerSecond") || this.constructor.prototype.growPixelsPerSecond);
    }

  });

});
define('liquid-fire/index', ['exports', 'liquid-fire/transition-map', 'liquid-fire/animate', 'liquid-fire/promise', 'liquid-fire/mutation-observer', 'liquid-fire/version-warnings', 'liquid-fire/velocity-ext'], function (exports, TransitionMap, animate, Promise, MutationObserver, versionWarnings) {

  'use strict';

  versionWarnings['default']({
    minEmberVersion: [1, 11],
    minVelocityVersion: [0, 11, 8]
  });

  exports.TransitionMap = TransitionMap['default'];
  exports.animate = animate.animate;
  exports.stop = animate.stop;
  exports.isAnimating = animate.isAnimating;
  exports.timeSpent = animate.timeSpent;
  exports.timeRemaining = animate.timeRemaining;
  exports.finish = animate.finish;
  exports.Promise = Promise['default'];
  exports.MutationObserver = MutationObserver['default'];

});
define('liquid-fire/internal-rules', ['exports'], function (exports) {

  'use strict';

  exports['default'] = function () {
    this.setDefault({ duration: 250 });
    // BEGIN-SNIPPET default-modal-rule
    this.transition(this.inHelper("liquid-modal"), this.use("explode", {
      pick: ".lf-overlay",
      use: ["cross-fade", { maxOpacity: 0.5 }]
    }, {
      pick: ".lm-container",
      use: "scale"
    }));
    // END-SNIPPET
  };

});
define('liquid-fire/modal', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var get = Ember['default'].get;

  exports['default'] = Ember['default'].Object.extend({

    enabled: Ember['default'].computed("modals.activeRouteNames", function () {
      return get(this, "modals.activeRouteNames").indexOf(get(this, "route")) >= 0;
    }),

    controller: Ember['default'].computed("enabled", function () {
      if (!get(this, "enabled")) {
        return;
      }
      var container = get(this, "container");
      var name = get(this, "options.controller") || get(this, "route");
      return container.lookup("controller:" + name);
    }),

    update: Ember['default'].observer("controller", Ember['default'].on("init", function () {
      var _this = this;

      var context = this.makeContext();
      var activeContexts = get(this, "modals.modalContexts");
      var matchingContext = activeContexts.find(function (c) {
        return get(c, "modal") === _this;
      });

      if (context) {
        if (matchingContext) {
          activeContexts.replace(activeContexts.indexOf(matchingContext), 1, [context]);
        } else {
          activeContexts.pushObject(context);
        }
      } else {
        if (matchingContext) {
          activeContexts.removeObject(matchingContext);
        }
      }
    })),

    makeContext: function makeContext() {
      var params,
          controller = get(this, "controller");

      if (!controller) {
        return;
      }

      params = currentParams(controller, get(this, "options.withParams"));
      if (params) {
        return Ember['default'].Object.create({
          modal: this,
          source: controller,
          name: get(this, "name"),
          options: get(this, "options"),
          params: params
        });
      }
    }

  });

  function currentParams(controller, paramMap) {
    var params = {};
    var proto = controller.constructor.proto();
    var foundNonDefault = false;
    var to, from, value, defaultValue;

    for (from in paramMap) {
      to = paramMap[from];
      value = controller.get(from);
      params[to] = value;
      defaultValue = proto[from];
      if (defaultValue instanceof Ember['default'].ComputedProperty) {
        defaultValue = undefined;
      }
      if (value !== defaultValue) {
        foundNonDefault = true;
      }
    }

    if (foundNonDefault) {
      return params;
    }
  }

});
define('liquid-fire/modals', ['exports', 'ember', 'liquid-fire/modal'], function (exports, Ember, Modal) {

  'use strict';

  exports['default'] = Ember['default'].Controller.extend({
    needs: ["application"],

    setup: Ember['default'].on("init", function () {

      this.set("modalContexts", Ember['default'].A());
      this.set("modals", Ember['default'].A());

      var modalConfigs = this.container.lookup("router:main").router.modals;
      if (modalConfigs && modalConfigs.length > 0) {
        var self = this;
        modalConfigs.forEach(function (m) {
          self.registerModal(m);
        });
      }
    }),

    registerModal: function registerModal(config) {
      var ext = {
        modals: this,
        container: this.container
      };

      for (var param in config.options.withParams) {
        ext[param + "Observer"] = observerForParam(param);
      }

      this.get("modals").pushObject(Modal['default'].extend(ext).create(config));
    },

    currentRoute: Ember['default'].computed.alias("controllers.application.currentRouteName"),

    activeRouteNames: Ember['default'].computed("currentRoute", function () {
      var infos = this.container.lookup("router:main").router.currentHandlerInfos;
      if (infos) {
        return infos.map(function (h) {
          return h.name;
        });
      } else {
        return [];
      }
    })

  });

  function observerForParam(param) {
    return Ember['default'].observer("controller." + param, function () {
      this.update();
    });
  }

});
define('liquid-fire/mutation-observer', ['exports'], function (exports) {

  'use strict';

  exports.testingKick = testingKick;

  // PhantomJS does not have real mutation observers, so to get
  // reasonable test timing we have to manually kick it.
  var activePollers = [];

  function MutationPoller(callback) {
    this.callback = callback;
  }

  MutationPoller.prototype = {
    observe: function observe() {
      this.interval = setInterval(this.callback, 100);
      activePollers.push(this);
    },
    disconnect: function disconnect() {
      clearInterval(this.interval);
      activePollers.splice(activePollers.indexOf(this), 1);
    }
  };

  var M = window.MutationObserver || window.WebkitMutationObserver || MutationPoller;

  exports['default'] = M;
  function testingKick() {
    for (var i = 0; i < activePollers.length; i++) {
      activePollers[i].callback();
    }
  }

});
define('liquid-fire/promise', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	// Ember is already polyfilling Promise as needed, so just use that.
	exports['default'] = Ember['default'].RSVP.Promise;

});
define('liquid-fire/router-dsl-ext', ['ember'], function (Ember) {

  'use strict';

  var Router = Ember['default'].Router;
  var proto = Ember['default'].RouterDSL.prototype;

  var currentMap = null;

  proto.modal = function (componentName, opts) {

    Ember['default'].assert("modal(\"" + componentName + "\",...) needs a `withParams` argument", opts && opts.withParams);

    opts = Ember['default'].copy(opts);

    opts.withParams = expandParamOptions(opts.withParams);
    opts.otherParams = expandParamOptions(opts.otherParams);

    if (typeof opts.dismissWithOutsideClick === "undefined") {
      opts.dismissWithOutsideClick = true;
    }

    if (typeof opts.dismissWithEscape === "undefined") {
      opts.dismissWithEscape = true;
    }

    currentMap.push({
      route: this.parent,
      name: componentName,
      options: opts
    });
  };

  // 1.10 and above
  Router.reopen({
    _initRouterJs: function _initRouterJs() {
      currentMap = [];
      this._super();
      this.router.modals = currentMap;
    }
  });

  // 1.9 and below
  var origMap = Router.map;
  Router.reopenClass({
    map: function map() {
      currentMap = [];
      var output = origMap.apply(this, arguments);
      if (this.router) {
        this.router.modals = currentMap;
      }
      return output;
    }
  });

  // takes string, array of strings, object, or array of objects and strings
  // and turns them into one object to map withParams/otherParams from context to modal
  //
  // "foo"                   => { foo: "foo" }
  // ["foo"]                 => { foo: "foo" }
  // { foo: "bar" }          => { foo: "bar" }
  // ["foo", { bar: "baz" }] => { foo: "foo", bar: "baz" }
  //
  function expandParamOptions(options) {
    if (!options) {
      return {};
    }

    if (!Ember['default'].isArray(options)) {
      options = [options];
    }

    var params = {};
    var option, i, key;

    for (i = 0; i < options.length; i++) {
      option = options[i];
      if (typeof option === "object") {
        for (key in option) {
          params[key] = option[key];
        }
      } else {
        params[option] = option;
      }
    }

    return params;
  }

});
define('liquid-fire/rule', ['exports', 'ember', 'liquid-fire/action', 'liquid-fire/constraint'], function (exports, Ember, Action, Constraint) {

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var Rule = (function () {
    function Rule() {
      _classCallCheck(this, Rule);

      this.constraints = Ember['default'].A();
      this.use = null;
      this.reverse = null;
    }

    _createClass(Rule, {
      add: {
        value: function add(thing) {
          if (thing instanceof Action['default']) {
            var prop = "use";
            if (thing.reversed) {
              prop = "reverse";
            }
            if (this[prop]) {
              throw new Error("More than one \"" + prop + "\" statement in the same transition rule is not allowed");
            }
            this[prop] = thing;
          } else if (thing === "debug") {
            this.debug = true;
          } else {
            this.constraints.push(thing);
          }
        }
      },
      validate: {
        value: function validate(transitionMap) {
          if (!this.use) {
            throw new Error("Every transition rule must include a \"use\" statement");
          }
          this.use.validateHandler(transitionMap);
          if (this.reverse) {
            this.reverse.validateHandler(transitionMap);
          }
          if (!this.constraints.find(function (c) {
            return c.target === "firstTime";
          })) {
            this.constraints.push(new Constraint['default']("firstTime", "no"));
          }
        }
      },
      invert: {
        value: function invert() {
          var rule = new this.constructor();
          rule.use = this.reverse;
          rule.reverse = this.use;
          rule.constraints = this.constraints.map(function (c) {
            return c.invert();
          });
          rule.debug = this.debug;
          return rule;
        }
      }
    });

    return Rule;
  })();

  exports['default'] = Rule;

});
define('liquid-fire/running-transition', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var RunningTransition = (function () {
    function RunningTransition(transitionMap, versions, animation) {
      _classCallCheck(this, RunningTransition);

      this.transitionMap = transitionMap;
      this.animation = animation || transitionMap.lookup("default");
      this.animationContext = publicAnimationContext(this, versions);
    }

    _createClass(RunningTransition, {
      run: {
        value: function run() {
          var _this = this;

          if (this._ran) {
            return this._ran;
          }

          this.transitionMap.incrementRunningTransitions();
          return this._ran = this._invokeAnimation()["catch"](function (err) {
            // If the animation blew up, try to leave the DOM in a
            // non-broken state as best we can before rethrowing.
            return _this.transitionMap.lookup("default").apply(_this.animationContext).then(function () {
              throw err;
            });
          })["finally"](function () {
            _this.transitionMap.decrementRunningTransitions();
          });
        }
      },
      interrupt: {
        value: function interrupt() {
          this.interrupted = true;
          this.animationContext.oldElement = null;
          this.animationContext.newElement = null;
          this.animationContext.older.forEach(function (entry) {
            entry.element = null;
          });
        }
      },
      _invokeAnimation: {
        value: function _invokeAnimation() {
          var _this = this;

          return this.animation.run(this.animationContext).then(function () {
            return _this.interrupted;
          });
        }
      }
    });

    return RunningTransition;
  })();

  exports['default'] = RunningTransition;

  // This defines the public set of things that user's transition
  // implementations can access as `this`.
  function publicAnimationContext(rt, versions) {
    var c = {};
    addPublicVersion(c, "new", versions[0]);
    if (versions[1]) {
      addPublicVersion(c, "old", versions[1]);
    }
    c.older = versions.slice(2).map(function (v) {
      var context = {};
      addPublicVersion(context, null, v);
      return context;
    });

    // Animations are allowed to look each other up.
    c.lookup = function (name) {
      return rt.transitionMap.lookup(name);
    };

    return c;
  }

  function addPublicVersion(context, prefix, version) {
    var props = {
      view: version.view,
      element: version.view ? version.view.$() : null,
      value: version.value
    };
    for (var key in props) {
      var outputKey = key;
      if (props.hasOwnProperty(key)) {
        if (prefix) {
          outputKey = prefix + Ember['default'].String.capitalize(key);
        }
        context[outputKey] = props[key];
      }
    }
  }

});
define('liquid-fire/tabbable', ['ember'], function (Ember) {

  'use strict';

  /*!
   * Adapted from jQuery UI core
   *
   * http://jqueryui.com
   *
   * Copyright 2014 jQuery Foundation and other contributors
   * Released under the MIT license.
   * http://jquery.org/license
   *
   * http://api.jqueryui.com/category/ui-core/
   */

  var $ = Ember['default'].$;

  function focusable(element, isTabIndexNotNaN) {
    var nodeName = element.nodeName.toLowerCase();
    return (/input|select|textarea|button|object/.test(nodeName) ? !element.disabled : "a" === nodeName ? element.href || isTabIndexNotNaN : isTabIndexNotNaN) && visible(element);
  }

  function visible(element) {
    var $el = $(element);
    return $.expr.filters.visible(element) && !$($el, $el.parents()).filter(function () {
      return $.css(this, "visibility") === "hidden";
    }).length;
  }

  if (!$.expr[":"].tabbable) {
    $.expr[":"].tabbable = function (element) {
      var tabIndex = $.attr(element, "tabindex"),
          isTabIndexNaN = isNaN(tabIndex);
      return (isTabIndexNaN || tabIndex >= 0) && focusable(element, !isTabIndexNaN);
    };
  }

});
define('liquid-fire/transition-map', ['exports', 'liquid-fire/running-transition', 'liquid-fire/dsl', 'ember', 'liquid-fire/action', 'liquid-fire/internal-rules', 'liquid-fire/constraints'], function (exports, RunningTransition, DSL, Ember, Action, internalRules, Constraints) {

  'use strict';

  var TransitionMap = Ember['default'].Object.extend({
    init: function init() {
      this.activeCount = 0;
      this.constraints = new Constraints['default']();
      this.map(internalRules['default']);
      var config = this.container.lookupFactory("transitions:main");
      if (config) {
        this.map(config);
      }
      if (Ember['default'].testing) {
        this._registerWaiter();
      }
    },

    runningTransitions: function runningTransitions() {
      return this.activeCount;
    },

    incrementRunningTransitions: function incrementRunningTransitions() {
      this.activeCount++;
    },

    decrementRunningTransitions: function decrementRunningTransitions() {
      var _this = this;

      this.activeCount--;
      Ember['default'].run.next(function () {
        _this._maybeResolveIdle();
      });
    },

    waitUntilIdle: function waitUntilIdle() {
      var _this = this;

      if (this._waitingPromise) {
        return this._waitingPromise;
      }
      return this._waitingPromise = new Ember['default'].RSVP.Promise(function (resolve) {
        _this._resolveWaiting = resolve;
        Ember['default'].run.next(function () {
          _this._maybeResolveIdle();
        });
      });
    },

    _maybeResolveIdle: function _maybeResolveIdle() {
      if (this.activeCount === 0 && this._resolveWaiting) {
        var resolveWaiting = this._resolveWaiting;
        this._resolveWaiting = null;
        this._waitingPromise = null;
        resolveWaiting();
      }
    },

    lookup: function lookup(transitionName) {
      var handler = this.container.lookupFactory("transition:" + transitionName);
      if (!handler) {
        throw new Error("unknown transition name: " + transitionName);
      }
      return handler;
    },

    defaultAction: function defaultAction() {
      if (!this._defaultAction) {
        this._defaultAction = new Action['default'](this.lookup("default"));
      }
      return this._defaultAction;
    },

    transitionFor: function transitionFor(conditions) {
      var action;
      if (conditions.use && conditions.firstTime !== "yes") {
        action = new Action['default'](conditions.use);
        action.validateHandler(this);
      } else {
        var rule = this.constraints.bestMatch(conditions);
        if (rule) {
          action = rule.use;
        } else {
          action = this.defaultAction();
        }
      }

      return new RunningTransition['default'](this, conditions.versions, action);
    },

    map: function map(handler) {
      if (handler) {
        handler.apply(new DSL['default'](this));
      }
      return this;
    },

    addRule: function addRule(rule) {
      rule.validate(this);
      this.constraints.addRule(rule);
    },

    _registerWaiter: function _registerWaiter() {
      var self = this;
      this._waiter = function () {
        return self.runningTransitions() === 0;
      };
      Ember['default'].Test.registerWaiter(this._waiter);
    },

    willDestroy: function willDestroy() {
      if (this._waiter) {
        Ember['default'].Test.unregisterWaiter(this._waiter);
        this._waiter = null;
      }
    }

  });

  TransitionMap.reopenClass({
    map: function map(handler) {
      var t = TransitionMap.create();
      t.map(handler);
      return t;
    }
  });

  exports['default'] = TransitionMap;

});
define('liquid-fire/velocity-ext', ['ember'], function (Ember) {

  'use strict';

  /*
    This makes it possible to animate outerHeight and outerWidth with
    Velocity, which is much more convenient for our purposes. Submitted
    to Velocity as PR #485.
  */

  var VCSS = Ember['default'].$.Velocity.CSS;

  function augmentDimension(name, element) {
    var sides = name === "width" ? ["Left", "Right"] : ["Top", "Bottom"];

    if (VCSS.getPropertyValue(element, "boxSizing").toString().toLowerCase() === "border-box") {
      /* in box-sizing mode, the VCSS width / height accessors already give the outerWidth / outerHeight. */
      return 0;
    } else {
      var augment = 0;
      var fields = ["padding" + sides[0], "padding" + sides[1], "border" + sides[0] + "Width", "border" + sides[1] + "Width"];
      for (var i = 0; i < fields.length; i++) {
        var value = parseFloat(VCSS.getPropertyValue(element, fields[i]));
        if (!isNaN(value)) {
          augment += value;
        }
      }
      return augment;
    }
  }

  function outerDimension(name) {
    return function (type, element, propertyValue) {
      switch (type) {
        case "name":
          return name;
        case "extract":
          return parseFloat(propertyValue) + augmentDimension(name, element);
        case "inject":
          return parseFloat(propertyValue) - augmentDimension(name, element) + "px";
      }
    };
  }

  VCSS.Normalizations.registered.outerWidth = outerDimension("width");
  VCSS.Normalizations.registered.outerHeight = outerDimension("height");

});
define('liquid-fire/version-warnings', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  function emberVersion() {
    var m = /^(\d+)\.(\d+)/.exec(Ember['default'].VERSION);
    if (!m) {
      return [0, 0];
    }
    return [parseInt(m[1]), parseInt(m[2])];
  }

  exports['default'] = function (args) {

    if (Ember['default'].compare(args.minEmberVersion, emberVersion()) === 1) {
      Ember['default'].warn("This version of liquid fire requires Ember " + args.minEmberVersion.join(".") + " or newer");
    }

    if (!Ember['default'].$.Velocity) {
      Ember['default'].warn("Velocity.js is missing");
    } else {
      var version = Ember['default'].$.Velocity.version;
      if (Ember['default'].compare(args.minVelocityVersion, [version.major, version.minor, version.patch]) === 1) {
        Ember['default'].warn("You should probably upgrade Velocity.js, recommended minimum is " + args.minVelocityVersion.join("."));
      }
    }
  };

});
define('giftwrap/components/lf-outlet', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.StaticOutlet;

});
define('giftwrap/components/lf-overlay', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  var COUNTER = '__lf-modal-open-counter';

  exports['default'] = Ember['default'].Component.extend({
    tagName: 'span',
    classNames: ['lf-overlay'],

    didInsertElement: function didInsertElement() {
      var body = Ember['default'].$('body');
      var counter = body.data(COUNTER) || 0;
      body.addClass('lf-modal-open');
      body.data(COUNTER, counter + 1);
    },

    willDestroy: function willDestroy() {
      var body = Ember['default'].$('body');
      var counter = body.data(COUNTER) || 0;
      body.data(COUNTER, counter - 1);
      if (counter < 2) {
        body.removeClass('lf-modal-open');
      }
    }
  });

});
define('giftwrap/components/liquid-child', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    classNames: ['liquid-child'],

    updateElementVisibility: (function () {
      var visible = this.get('visible');
      var $container = this.$();

      if ($container && $container.length) {
        $container.css('visibility', visible ? 'visible' : 'hidden');
      }
    }).on('willInsertElement').observes('visible'),

    tellContainerWeRendered: Ember['default'].on('didInsertElement', function () {
      this.sendAction('didRender', this);
    })
  });

});
define('giftwrap/components/liquid-container', ['exports', 'ember', 'liquid-fire/growable', 'giftwrap/components/liquid-measured'], function (exports, Ember, Growable, liquid_measured) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend(Growable['default'], {
    classNames: ["liquid-container"],
    classNameBindings: ["liquidAnimating"],

    lockSize: function lockSize(elt, want) {
      elt.outerWidth(want.width);
      elt.outerHeight(want.height);
    },

    unlockSize: function unlockSize() {
      var _this = this;

      var doUnlock = function doUnlock() {
        if (!_this.isDestroyed) {
          _this.set("liquidAnimating", false);
        }
        var elt = _this.$();
        if (elt) {
          elt.css({ width: "", height: "" });
        }
      };
      if (this._scaling) {
        this._scaling.then(doUnlock);
      } else {
        doUnlock();
      }
    },

    startMonitoringSize: Ember['default'].on("didInsertElement", function () {
      this._wasInserted = true;
    }),

    actions: {

      willTransition: function willTransition(versions) {
        if (!this._wasInserted) {
          return;
        }

        // Remember our own size before anything changes
        var elt = this.$();
        this._cachedSize = liquid_measured.measure(elt);

        // And make any children absolutely positioned with fixed sizes.
        for (var i = 0; i < versions.length; i++) {
          goAbsolute(versions[i]);
        }

        // Apply '.liquid-animating' to liquid-container allowing
        // any customizable CSS control while an animating is occuring
        this.set("liquidAnimating", true);
      },

      afterChildInsertion: function afterChildInsertion(versions) {
        var elt = this.$();

        // Measure  children
        var sizes = [];
        for (var i = 0; i < versions.length; i++) {
          if (versions[i].view) {
            sizes[i] = liquid_measured.measure(versions[i].view.$());
          }
        }

        // Measure ourself again to see how big the new children make
        // us.
        var want = liquid_measured.measure(elt);
        var have = this._cachedSize || want;

        // Make ourself absolute
        this.lockSize(elt, have);

        // Make the children absolute and fixed size.
        for (i = 0; i < versions.length; i++) {
          goAbsolute(versions[i], sizes[i]);
        }

        // Kick off our growth animation
        this._scaling = this.animateGrowth(elt, have, want);
      },

      afterTransition: function afterTransition(versions) {
        for (var i = 0; i < versions.length; i++) {
          goStatic(versions[i]);
        }
        this.unlockSize();
      }
    }
  });

  function goAbsolute(version, size) {
    if (!version.view) {
      return;
    }
    var elt = version.view.$();
    var pos = elt.position();
    if (!size) {
      size = liquid_measured.measure(elt);
    }
    elt.outerWidth(size.width);
    elt.outerHeight(size.height);
    elt.css({
      position: "absolute",
      top: pos.top,
      left: pos.left
    });
  }

  function goStatic(version) {
    if (version.view) {
      version.view.$().css({ width: "", height: "", position: "" });
    }
  }

});
define('giftwrap/components/liquid-if', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    _yieldInverse: ember_internals.inverseYieldMethod,
    hasInverse: Ember['default'].computed('inverseTemplate', function () {
      return !!this.get('inverseTemplate');
    })
  });

});
define('giftwrap/components/liquid-measured', ['exports', 'liquid-fire/mutation-observer', 'ember'], function (exports, MutationObserver, Ember) {

  'use strict';

  exports.measure = measure;

  exports['default'] = Ember['default'].Component.extend({

    didInsertElement: function didInsertElement() {
      var self = this;

      // This prevents margin collapse
      this.$().css({
        overflow: "auto"
      });

      this.didMutate();

      this.observer = new MutationObserver['default'](function (mutations) {
        self.didMutate(mutations);
      });
      this.observer.observe(this.get("element"), {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true
      });
      this.$().bind("webkitTransitionEnd", function () {
        self.didMutate();
      });
      // Chrome Memory Leak: https://bugs.webkit.org/show_bug.cgi?id=93661
      window.addEventListener("unload", function () {
        self.willDestroyElement();
      });
    },

    willDestroyElement: function willDestroyElement() {
      if (this.observer) {
        this.observer.disconnect();
      }
    },

    transitionMap: Ember['default'].inject.service("liquid-fire-transitions"),

    didMutate: function didMutate() {
      // by incrementing the running transitions counter here we prevent
      // tests from falling through the gap between the time they
      // triggered mutation the time we may actually animate in
      // response.
      var tmap = this.get("transitionMap");
      tmap.incrementRunningTransitions();
      Ember['default'].run.next(this, function () {
        this._didMutate();
        tmap.decrementRunningTransitions();
      });
    },

    _didMutate: function _didMutate() {
      var elt = this.$();
      if (!elt || !elt[0]) {
        return;
      }
      this.set("measurements", measure(elt));
    }

  });
  function measure($elt) {
    var width, height;

    // if jQuery sees a zero dimension, it will temporarily modify the
    // element's css to try to make its size measurable. But that's bad
    // for us here, because we'll get an infinite recursion of mutation
    // events. So we trap the zero case without hitting jQuery.

    if ($elt[0].offsetWidth === 0) {
      width = 0;
    } else {
      width = $elt.outerWidth();
    }
    if ($elt[0].offsetHeight === 0) {
      height = 0;
    } else {
      height = $elt.outerHeight();
    }

    return {
      width: width,
      height: height
    };
  }

});
define('giftwrap/components/liquid-modal', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    classNames: ['liquid-modal'],
    currentContext: Ember['default'].computed.oneWay('owner.modalContexts.lastObject'),

    owner: Ember['default'].inject.service('liquid-fire-modals'),

    innerView: Ember['default'].computed('currentContext', function () {
      var self = this,
          current = this.get('currentContext'),
          name = current.get('name'),
          container = this.get('container'),
          component = container.lookup('component-lookup:main').lookupFactory(name);
      Ember['default'].assert('Tried to render a modal using component \'' + name + '\', but couldn\'t find it.', !!component);

      var args = Ember['default'].copy(current.get('params'));

      args.registerMyself = Ember['default'].on('init', function () {
        self.set('innerViewInstance', this);
      });

      // set source so we can bind other params to it
      args._source = Ember['default'].computed(function () {
        return current.get('source');
      });

      var otherParams = current.get('options.otherParams');
      var from, to;
      for (from in otherParams) {
        to = otherParams[from];
        args[to] = Ember['default'].computed.alias('_source.' + from);
      }

      var actions = current.get('options.actions') || {};

      // Override sendAction in the modal component so we can intercept and
      // dynamically dispatch to the controller as expected
      args.sendAction = function (name) {
        var actionName = actions[name];
        if (!actionName) {
          this._super.apply(this, Array.prototype.slice.call(arguments));
          return;
        }

        var controller = current.get('source');
        var args = Array.prototype.slice.call(arguments, 1);
        args.unshift(actionName);
        controller.send.apply(controller, args);
      };

      return component.extend(args);
    }),

    actions: {
      outsideClick: function outsideClick() {
        if (this.get('currentContext.options.dismissWithOutsideClick')) {
          this.send('dismiss');
        } else {
          proxyToInnerInstance(this, 'outsideClick');
        }
      },
      escape: function escape() {
        if (this.get('currentContext.options.dismissWithEscape')) {
          this.send('dismiss');
        } else {
          proxyToInnerInstance(this, 'escape');
        }
      },
      dismiss: function dismiss() {
        var source = this.get('currentContext.source'),
            proto = source.constructor.proto(),
            params = this.get('currentContext.options.withParams'),
            clearThem = {};

        for (var key in params) {
          if (proto[key] instanceof Ember['default'].ComputedProperty) {
            clearThem[key] = undefined;
          } else {
            clearThem[key] = proto[key];
          }
        }
        source.setProperties(clearThem);
      }
    }
  });

  function proxyToInnerInstance(self, message) {
    var vi = self.get('innerViewInstance');
    if (vi) {
      vi.send(message);
    }
  }

});
define('giftwrap/components/liquid-outlet', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

	'use strict';

	exports['default'] = Ember['default'].Component.extend(ember_internals.OutletBehavior);

});
define('giftwrap/components/liquid-spacer', ['exports', 'giftwrap/components/liquid-measured', 'liquid-fire/growable', 'ember'], function (exports, liquid_measured, Growable, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend(Growable['default'], {
    enabled: true,

    didInsertElement: function didInsertElement() {
      var child = this.$("> div");
      var measurements = this.myMeasurements(liquid_measured.measure(child));
      this.$().css({
        overflow: "hidden",
        outerWidth: measurements.width,
        outerHeight: measurements.height
      });
    },

    sizeChange: Ember['default'].observer("measurements", function () {
      if (!this.get("enabled")) {
        return;
      }
      var elt = this.$();
      if (!elt || !elt[0]) {
        return;
      }
      var want = this.myMeasurements(this.get("measurements"));
      var have = liquid_measured.measure(this.$());
      this.animateGrowth(elt, have, want);
    }),

    // given our child's outerWidth & outerHeight, figure out what our
    // outerWidth & outerHeight should be.
    myMeasurements: function myMeasurements(childMeasurements) {
      var elt = this.$();
      return {
        width: childMeasurements.width + sumCSS(elt, padding("width")) + sumCSS(elt, border("width")),
        height: childMeasurements.height + sumCSS(elt, padding("height")) + sumCSS(elt, border("height"))
      };
      //if (this.$().css('box-sizing') === 'border-box') {
    }

  });

  function sides(dimension) {
    return dimension === "width" ? ["Left", "Right"] : ["Top", "Bottom"];
  }

  function padding(dimension) {
    var s = sides(dimension);
    return ["padding" + s[0], "padding" + s[1]];
  }

  function border(dimension) {
    var s = sides(dimension);
    return ["border" + s[0] + "Width", "border" + s[1] + "Width"];
  }

  function sumCSS(elt, fields) {
    var accum = 0;
    for (var i = 0; i < fields.length; i++) {
      var num = parseFloat(elt.css(fields[i]), 10);
      if (!isNaN(num)) {
        accum += num;
      }
    }
    return accum;
  }

});
define('giftwrap/components/liquid-versions', ['exports', 'ember', 'liquid-fire/ember-internals'], function (exports, Ember, ember_internals) {

  'use strict';

  var get = Ember['default'].get;
  var set = Ember['default'].set;

  exports['default'] = Ember['default'].Component.extend({
    tagName: "",
    name: "liquid-versions",

    transitionMap: Ember['default'].inject.service("liquid-fire-transitions"),

    appendVersion: Ember['default'].on("init", Ember['default'].observer("value", function () {
      var versions = get(this, "versions");
      var firstTime = false;
      var newValue = get(this, "value");
      var oldValue;

      if (!versions) {
        firstTime = true;
        versions = Ember['default'].A();
      } else {
        oldValue = versions[0];
      }

      // TODO: may need to extend the comparison to do the same kind of
      // key-based diffing that htmlbars is doing.
      if (!firstTime && (!oldValue && !newValue || oldValue === newValue)) {
        return;
      }

      this.notifyContainer("willTransition", versions);
      var newVersion = {
        value: newValue,
        shouldRender: newValue || get(this, "renderWhenFalse")
      };
      versions.unshiftObject(newVersion);

      this.firstTime = firstTime;
      if (firstTime) {
        set(this, "versions", versions);
      }

      if (!newVersion.shouldRender && !firstTime) {
        this._transition();
      }
    })),

    _transition: function _transition() {
      var _this = this;

      var versions = get(this, "versions");
      var transition;
      var firstTime = this.firstTime;
      this.firstTime = false;

      this.notifyContainer("afterChildInsertion", versions);

      transition = get(this, "transitionMap").transitionFor({
        versions: versions,
        parentElement: Ember['default'].$(ember_internals.containingElement(this)),
        use: get(this, "use"),
        // Using strings instead of booleans here is an
        // optimization. The constraint system can match them more
        // efficiently, since it treats boolean constraints as generic
        // "match anything truthy/falsy" predicates, whereas string
        // checks are a direct object property lookup.
        firstTime: firstTime ? "yes" : "no",
        helperName: get(this, "name")
      });

      if (this._runningTransition) {
        this._runningTransition.interrupt();
      }
      this._runningTransition = transition;

      transition.run().then(function (wasInterrupted) {
        // if we were interrupted, we don't handle the cleanup because
        // another transition has already taken over.
        if (!wasInterrupted) {
          _this.finalizeVersions(versions);
          _this.notifyContainer("afterTransition", versions);
        }
      }, function (err) {
        _this.finalizeVersions(versions);
        _this.notifyContainer("afterTransition", versions);
        throw err;
      });
    },

    finalizeVersions: function finalizeVersions(versions) {
      versions.replace(1, versions.length - 1);
    },

    notifyContainer: function notifyContainer(method, versions) {
      var target = get(this, "notify");
      if (target) {
        target.send(method, versions);
      }
    },

    actions: {
      childDidRender: function childDidRender(child) {
        var version = get(child, "version");
        set(version, "view", child);
        this._transition();
      }
    }

  });

});
define('giftwrap/components/liquid-with', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = Ember['default'].Component.extend({
    name: "liquid-with"
  });

});
define('giftwrap/components/lm-container', ['exports', 'ember', 'liquid-fire/tabbable'], function (exports, Ember) {

  'use strict';

  /*
     Parts of this file were adapted from ic-modal

     https://github.com/instructure/ic-modal
     Released under The MIT License (MIT)
     Copyright (c) 2014 Instructure, Inc.
  */

  var lastOpenedModal = null;
  Ember['default'].$(document).on("focusin", handleTabIntoBrowser);

  function handleTabIntoBrowser() {
    if (lastOpenedModal) {
      lastOpenedModal.focus();
    }
  }

  exports['default'] = Ember['default'].Component.extend({
    classNames: ["lm-container"],
    attributeBindings: ["tabindex"],
    tabindex: 0,

    keyUp: function keyUp(event) {
      // Escape key
      if (event.keyCode === 27) {
        this.sendAction();
      }
    },

    keyDown: function keyDown(event) {
      // Tab key
      if (event.keyCode === 9) {
        this.constrainTabNavigation(event);
      }
    },

    didInsertElement: function didInsertElement() {
      this.focus();
      lastOpenedModal = this;
    },

    willDestroy: function willDestroy() {
      lastOpenedModal = null;
    },

    focus: function focus() {
      if (this.get("element").contains(document.activeElement)) {
        // just let it be if we already contain the activeElement
        return;
      }
      var target = this.$("[autofocus]");
      if (!target.length) {
        target = this.$(":tabbable");
      }

      if (!target.length) {
        target = this.$();
      }

      target[0].focus();
    },

    constrainTabNavigation: function constrainTabNavigation(event) {
      var tabbable = this.$(":tabbable");
      var finalTabbable = tabbable[event.shiftKey ? "first" : "last"]()[0];
      var leavingFinalTabbable = finalTabbable === document.activeElement ||
      // handle immediate shift+tab after opening with mouse
      this.get("element") === document.activeElement;
      if (!leavingFinalTabbable) {
        return;
      }
      event.preventDefault();
      tabbable[event.shiftKey ? "last" : "first"]()[0].focus();
    },

    click: function click(event) {
      if (event.target === this.get("element")) {
        this.sendAction("clickAway");
      }
    }
  });

});
/* global requirejs, require, define */
define('giftwrap-internal/container-injector', ['exports'], function (exports) {
  if (window.Ember) {
    define('ember', ['exports'], function(exports) {
      exports.default = window.Ember;
    });
  }
  exports.install = function(app) {
    for (var moduleName in requirejs.entries) {
      var m = /giftwrap\/([^\/]+)s\/(.*)/.exec(moduleName);
      if (m) {
        var type = m[1];
        var name = m[2];
        app.register(type + ":" + name, require(moduleName).default);
        app.register(type + ":" + require('ember')['default'].String.camelize(name), require(moduleName).default);
      }
    }
  };
  exports.require = require;
  exports.define = require;
  exports.env = require('giftwrap/config/environment').default;
});
define('giftwrap/config/environment', ['exports'], function (exports) {
  exports.default = {};
});

define('giftwrap/controllers/array', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	exports['default'] = Ember['default'].Controller;

});
define('giftwrap/controllers/object', ['exports', 'ember'], function (exports, Ember) {

	'use strict';

	exports['default'] = Ember['default'].Controller;

});
define('giftwrap/helpers/lf-yield-inverse', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = {
    isHTMLBars: true,
    helperFunction: ember_internals.inverseYieldHelper
  };

});
define('giftwrap/helpers/liquid-bind', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.makeHelperShim("liquid-bind");

});
define('giftwrap/helpers/liquid-if', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim('liquid-if', function (params, hash, options) {
    hash.helperName = 'liquid-if';
    hash.inverseTemplate = options.inverse;
  });

});
define('giftwrap/helpers/liquid-outlet', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim("liquid-outlet", function (params, hash) {
    hash._outletName = params[0] || "main";
  });

});
define('giftwrap/helpers/liquid-unless', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

  'use strict';

  exports['default'] = ember_internals.makeHelperShim('liquid-if', function (params, hash, options) {
    hash.helperName = 'liquid-unless';
    hash.inverseTemplate = options.template;
    options.template = options.inverse;
  });

});
define('giftwrap/helpers/liquid-with', ['exports', 'liquid-fire/ember-internals'], function (exports, ember_internals) {

	'use strict';

	exports['default'] = ember_internals.makeHelperShim("liquid-with");

});
define('giftwrap/initializers/app-version', ['exports', 'giftwrap/config/environment', 'ember'], function (exports, config, Ember) {

  'use strict';

  var classify = Ember['default'].String.classify;
  var registered = false;

  exports['default'] = {
    name: 'App Version',
    initialize: function initialize(container, application) {
      if (!registered) {
        var appName = classify(application.toString());
        Ember['default'].libraries.register(appName, config['default'].APP.version);
        registered = true;
      }
    }
  };

});
define('giftwrap/initializers/autoresize', ['exports', 'ember-autoresize/ext/text-field', 'ember-autoresize/ext/text-area'], function (exports) {

  'use strict';

  exports['default'] = {
    name: "autoresize",
    initialize: function initialize() {}
  };

});
define('giftwrap/initializers/export-application-global', ['exports', 'ember', 'giftwrap/config/environment'], function (exports, Ember, config) {

  'use strict';

  exports.initialize = initialize;

  function initialize(container, application) {
    var classifiedName = Ember['default'].String.classify(config['default'].modulePrefix);

    if (config['default'].exportApplicationGlobal && !window[classifiedName]) {
      window[classifiedName] = application;
    }
  }

  ;

  exports['default'] = {
    name: 'export-application-global',

    initialize: initialize
  };

});
define('giftwrap/initializers/liquid-fire', ['exports', 'liquid-fire/router-dsl-ext'], function (exports) {

  'use strict';

  // This initializer exists only to make sure that the following import
  // happens before the app boots.
  exports['default'] = {
    name: "liquid-fire",
    initialize: function initialize() {}
  };

});
define('giftwrap/services/liquid-fire-modals', ['exports', 'liquid-fire/modals'], function (exports, Modals) {

	'use strict';

	exports['default'] = Modals['default'];

});
define('giftwrap/services/liquid-fire-transitions', ['exports', 'liquid-fire/transition-map'], function (exports, TransitionMap) {

	'use strict';

	exports['default'] = TransitionMap['default'];

});
define('giftwrap/templates/components/liquid-bind', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, content = hooks.content;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "version", blockArguments[0]);
            content(env, morph0, context, "version");
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "use": get(env, context, "use"), "name": "liquid-bind", "renderWhenFalse": true, "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "version", blockArguments[0]);
              content(env, morph0, context, "version");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "use": get(env, context, "use"), "name": "liquid-bind", "renderWhenFalse": true}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass"), "growDuration": get(env, context, "growDuration"), "growPixelsPerSecond": get(env, context, "growPixelsPerSecond"), "growEasing": get(env, context, "growEasing"), "enableGrowth": get(env, context, "enableGrowth")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-container', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        inline(env, morph0, context, "yield", [get(env, context, "this")], {});
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-if', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("      ");
              dom.appendChild(el0, el1);
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
              content(env, morph0, context, "yield");
              return fragment;
            }
          };
        }());
        var child1 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createTextNode("      ");
              dom.appendChild(el0, el1);
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              var el1 = dom.createTextNode("\n");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, content = hooks.content;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
              content(env, morph0, context, "lf-yield-inverse");
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "valueVersion", blockArguments[0]);
            block(env, morph0, context, "if", [get(env, context, "valueVersion")], {}, child0, child1);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "name": get(env, context, "helperName"), "use": get(env, context, "use"), "renderWhenFalse": get(env, context, "hasInverse"), "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          var child0 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.12.0",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("        ");
                dom.appendChild(el0, el1);
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, content = hooks.content;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
                content(env, morph0, context, "yield");
                return fragment;
              }
            };
          }());
          var child1 = (function() {
            return {
              isHTMLBars: true,
              revision: "Ember@1.12.0",
              blockParams: 0,
              cachedFragment: null,
              hasRendered: false,
              build: function build(dom) {
                var el0 = dom.createDocumentFragment();
                var el1 = dom.createTextNode("        ");
                dom.appendChild(el0, el1);
                var el1 = dom.createComment("");
                dom.appendChild(el0, el1);
                var el1 = dom.createTextNode("\n");
                dom.appendChild(el0, el1);
                return el0;
              },
              render: function render(context, env, contextualElement) {
                var dom = env.dom;
                var hooks = env.hooks, content = hooks.content;
                dom.detectNamespace(contextualElement);
                var fragment;
                if (env.useFragmentCache && dom.canClone) {
                  if (this.cachedFragment === null) {
                    fragment = this.build(dom);
                    if (this.hasRendered) {
                      this.cachedFragment = fragment;
                    } else {
                      this.hasRendered = true;
                    }
                  }
                  if (this.cachedFragment) {
                    fragment = dom.cloneNode(this.cachedFragment, true);
                  }
                } else {
                  fragment = this.build(dom);
                }
                var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
                content(env, morph0, context, "lf-yield-inverse");
                return fragment;
              }
            };
          }());
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "valueVersion", blockArguments[0]);
              block(env, morph0, context, "if", [get(env, context, "valueVersion")], {}, child0, child1);
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "name": get(env, context, "helperName"), "use": get(env, context, "use"), "renderWhenFalse": get(env, context, "hasInverse")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass"), "growDuration": get(env, context, "growDuration"), "growPixelsPerSecond": get(env, context, "growPixelsPerSecond"), "growEasing": get(env, context, "growEasing"), "enableGrowth": get(env, context, "enableGrowth")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-measured', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, content = hooks.content;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, 0);
        content(env, morph0, context, "yield");
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-modal', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("    ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            dom.setAttribute(el1,"role","dialog");
            var el2 = dom.createTextNode("\n      ");
            dom.appendChild(el1, el2);
            var el2 = dom.createComment("");
            dom.appendChild(el1, el2);
            var el2 = dom.createTextNode("\n    ");
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, element = hooks.element, get = hooks.get, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var element0 = dom.childAt(fragment, [1]);
            var morph0 = dom.createMorphAt(element0,1,1);
            element(env, element0, context, "bind-attr", [], {"class": ":lf-dialog cc.options.dialogClass"});
            element(env, element0, context, "bind-attr", [], {"aria-labelledby": "cc.options.ariaLabelledBy", "aria-label": "cc.options.ariaLabel"});
            inline(env, morph0, context, "view", [get(env, context, "innerView")], {"dismiss": "dismiss"});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, block = hooks.block, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          var morph1 = dom.createMorphAt(fragment,2,2,contextualElement);
          dom.insertBoundary(fragment, 0);
          set(env, context, "cc", blockArguments[0]);
          block(env, morph0, context, "lm-container", [], {"action": "escape", "clickAway": "outsideClick"}, child0, null);
          content(env, morph1, context, "lf-overlay");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-versions", [], {"name": "liquid-modal", "value": get(env, context, "currentContext")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-outlet', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          set(env, context, "outletStateVersion", blockArguments[0]);
          inline(env, morph0, context, "lf-outlet", [], {"staticState": get(env, context, "outletStateVersion")});
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-with", [get(env, context, "outletState")], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass"), "use": get(env, context, "use"), "name": "liquid-outlet", "containerless": get(env, context, "containerless"), "growDuration": get(env, context, "growDuration"), "growPixelsPerSecond": get(env, context, "growPixelsPerSecond"), "growEasing": get(env, context, "growEasing"), "enableGrowth": get(env, context, "enableGrowth")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-spacer', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, content = hooks.content;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,1,1,contextualElement);
          content(env, morph0, context, "yield");
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "liquid-measured", [], {"measurements": get(env, context, "measurements")}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-versions', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 0,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement) {
              var dom = env.dom;
              var hooks = env.hooks, get = hooks.get, inline = hooks.inline;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              inline(env, morph0, context, "yield", [get(env, context, "version.value")], {});
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 0,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement) {
            var dom = env.dom;
            var hooks = env.hooks, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            block(env, morph0, context, "liquid-child", [], {"version": get(env, context, "version"), "visible": false, "didRender": "childDidRender", "class": get(env, context, "innerClass")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 1,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement, blockArguments) {
          var dom = env.dom;
          var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          set(env, context, "version", blockArguments[0]);
          block(env, morph0, context, "if", [get(env, context, "version.shouldRender")], {}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "each", [get(env, context, "versions")], {}, child0, null);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/templates/components/liquid-with', ['exports'], function (exports) {

  'use strict';

  exports['default'] = Ember.HTMLBars.template((function() {
    var child0 = (function() {
      var child0 = (function() {
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "version", blockArguments[0]);
            inline(env, morph0, context, "yield", [get(env, context, "version")], {});
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "use": get(env, context, "use"), "name": get(env, context, "name"), "innerClass": get(env, context, "innerClass")}, child0, null);
          return fragment;
        }
      };
    }());
    var child1 = (function() {
      var child0 = (function() {
        var child0 = (function() {
          return {
            isHTMLBars: true,
            revision: "Ember@1.12.0",
            blockParams: 1,
            cachedFragment: null,
            hasRendered: false,
            build: function build(dom) {
              var el0 = dom.createDocumentFragment();
              var el1 = dom.createComment("");
              dom.appendChild(el0, el1);
              return el0;
            },
            render: function render(context, env, contextualElement, blockArguments) {
              var dom = env.dom;
              var hooks = env.hooks, set = hooks.set, get = hooks.get, inline = hooks.inline;
              dom.detectNamespace(contextualElement);
              var fragment;
              if (env.useFragmentCache && dom.canClone) {
                if (this.cachedFragment === null) {
                  fragment = this.build(dom);
                  if (this.hasRendered) {
                    this.cachedFragment = fragment;
                  } else {
                    this.hasRendered = true;
                  }
                }
                if (this.cachedFragment) {
                  fragment = dom.cloneNode(this.cachedFragment, true);
                }
              } else {
                fragment = this.build(dom);
              }
              var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
              dom.insertBoundary(fragment, null);
              dom.insertBoundary(fragment, 0);
              set(env, context, "version", blockArguments[0]);
              inline(env, morph0, context, "yield", [get(env, context, "version")], {});
              return fragment;
            }
          };
        }());
        return {
          isHTMLBars: true,
          revision: "Ember@1.12.0",
          blockParams: 1,
          cachedFragment: null,
          hasRendered: false,
          build: function build(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createComment("");
            dom.appendChild(el0, el1);
            return el0;
          },
          render: function render(context, env, contextualElement, blockArguments) {
            var dom = env.dom;
            var hooks = env.hooks, set = hooks.set, get = hooks.get, block = hooks.block;
            dom.detectNamespace(contextualElement);
            var fragment;
            if (env.useFragmentCache && dom.canClone) {
              if (this.cachedFragment === null) {
                fragment = this.build(dom);
                if (this.hasRendered) {
                  this.cachedFragment = fragment;
                } else {
                  this.hasRendered = true;
                }
              }
              if (this.cachedFragment) {
                fragment = dom.cloneNode(this.cachedFragment, true);
              }
            } else {
              fragment = this.build(dom);
            }
            var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
            dom.insertBoundary(fragment, null);
            dom.insertBoundary(fragment, 0);
            set(env, context, "container", blockArguments[0]);
            block(env, morph0, context, "liquid-versions", [], {"value": get(env, context, "value"), "notify": get(env, context, "container"), "use": get(env, context, "use"), "name": get(env, context, "name")}, child0, null);
            return fragment;
          }
        };
      }());
      return {
        isHTMLBars: true,
        revision: "Ember@1.12.0",
        blockParams: 0,
        cachedFragment: null,
        hasRendered: false,
        build: function build(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          return el0;
        },
        render: function render(context, env, contextualElement) {
          var dom = env.dom;
          var hooks = env.hooks, get = hooks.get, block = hooks.block;
          dom.detectNamespace(contextualElement);
          var fragment;
          if (env.useFragmentCache && dom.canClone) {
            if (this.cachedFragment === null) {
              fragment = this.build(dom);
              if (this.hasRendered) {
                this.cachedFragment = fragment;
              } else {
                this.hasRendered = true;
              }
            }
            if (this.cachedFragment) {
              fragment = dom.cloneNode(this.cachedFragment, true);
            }
          } else {
            fragment = this.build(dom);
          }
          var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
          dom.insertBoundary(fragment, null);
          dom.insertBoundary(fragment, 0);
          block(env, morph0, context, "liquid-container", [], {"id": get(env, context, "innerId"), "class": get(env, context, "innerClass"), "growDuration": get(env, context, "growDuration"), "growPixelsPerSecond": get(env, context, "growPixelsPerSecond"), "growEasing": get(env, context, "growEasing"), "enableGrowth": get(env, context, "enableGrowth")}, child0, null);
          return fragment;
        }
      };
    }());
    return {
      isHTMLBars: true,
      revision: "Ember@1.12.0",
      blockParams: 0,
      cachedFragment: null,
      hasRendered: false,
      build: function build(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      render: function render(context, env, contextualElement) {
        var dom = env.dom;
        var hooks = env.hooks, get = hooks.get, block = hooks.block;
        dom.detectNamespace(contextualElement);
        var fragment;
        if (env.useFragmentCache && dom.canClone) {
          if (this.cachedFragment === null) {
            fragment = this.build(dom);
            if (this.hasRendered) {
              this.cachedFragment = fragment;
            } else {
              this.hasRendered = true;
            }
          }
          if (this.cachedFragment) {
            fragment = dom.cloneNode(this.cachedFragment, true);
          }
        } else {
          fragment = this.build(dom);
        }
        var morph0 = dom.createMorphAt(fragment,0,0,contextualElement);
        dom.insertBoundary(fragment, null);
        dom.insertBoundary(fragment, 0);
        block(env, morph0, context, "if", [get(env, context, "containerless")], {}, child0, child1);
        return fragment;
      }
    };
  }()));

});
define('giftwrap/transitions/cross-fade', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = crossFade;
  // BEGIN-SNIPPET cross-fade-definition
  function crossFade() {
    var opts = arguments[0] === undefined ? {} : arguments[0];

    liquid_fire.stop(this.oldElement);
    return liquid_fire.Promise.all([liquid_fire.animate(this.oldElement, { opacity: 0 }, opts), liquid_fire.animate(this.newElement, { opacity: [opts.maxOpacity || 1, 0] }, opts)]);
  } // END-SNIPPET

});
define('giftwrap/transitions/default', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = defaultTransition;
  function defaultTransition() {
    if (this.newElement) {
      this.newElement.css({ visibility: "" });
    }
    return liquid_fire.Promise.resolve();
  }

});
define('giftwrap/transitions/explode', ['exports', 'ember', 'liquid-fire'], function (exports, Ember, liquid_fire) {

  'use strict';



  exports['default'] = explode;

  function explode() {
    var _this = this;

    for (var _len = arguments.length, pieces = Array(_len), _key = 0; _key < _len; _key++) {
      pieces[_key] = arguments[_key];
    }

    var seenElements = {};
    var sawBackgroundPiece = false;
    var promises = pieces.map(function (piece) {
      if (piece.matchBy) {
        return matchAndExplode(_this, piece, seenElements);
      } else if (piece.pick || piece.pickOld || piece.pickNew) {
        return explodePiece(_this, piece, seenElements);
      } else {
        sawBackgroundPiece = true;
        return runAnimation(_this, piece);
      }
    });
    if (!sawBackgroundPiece) {
      if (this.newElement) {
        this.newElement.css({ visibility: "" });
      }
      if (this.oldElement) {
        this.oldElement.css({ visibility: "hidden" });
      }
    }
    return liquid_fire.Promise.all(promises);
  }

  function explodePiece(context, piece, seen) {
    var childContext = Ember['default'].copy(context);
    var selectors = [piece.pickOld || piece.pick, piece.pickNew || piece.pick];
    var cleanupOld, cleanupNew;

    if (selectors[0] || selectors[1]) {
      cleanupOld = _explodePart(context, "oldElement", childContext, selectors[0], seen);
      cleanupNew = _explodePart(context, "newElement", childContext, selectors[1], seen);
      if (!cleanupOld && !cleanupNew) {
        return liquid_fire.Promise.resolve();
      }
    }

    return runAnimation(childContext, piece)["finally"](function () {
      if (cleanupOld) {
        cleanupOld();
      }
      if (cleanupNew) {
        cleanupNew();
      }
    });
  }

  function _explodePart(context, field, childContext, selector, seen) {
    var child, childOffset, width, height, newChild;
    var elt = context[field];

    childContext[field] = null;
    if (elt && selector) {
      child = elt.find(selector).filter(function () {
        var guid = Ember['default'].guidFor(this);
        if (!seen[guid]) {
          seen[guid] = true;
          return true;
        }
      });
      if (child.length > 0) {
        childOffset = child.offset();
        width = child.outerWidth();
        height = child.outerHeight();
        newChild = child.clone();

        // Hide the original element
        child.css({ visibility: "hidden" });

        // If the original element's parent was hidden, hide our clone
        // too.
        if (elt.css("visibility") === "hidden") {
          newChild.css({ visibility: "hidden" });
        }
        newChild.appendTo(elt.parent());
        newChild.outerWidth(width);
        newChild.outerHeight(height);
        var newParentOffset = newChild.offsetParent().offset();
        newChild.css({
          position: "absolute",
          top: childOffset.top - newParentOffset.top,
          left: childOffset.left - newParentOffset.left,
          margin: 0
        });

        // Pass the clone to the next animation
        childContext[field] = newChild;
        return function cleanup() {
          newChild.remove();
          child.css({ visibility: "" });
        };
      }
    }
  }

  function animationFor(context, piece) {
    var name, args, func;
    if (!piece.use) {
      throw new Error("every argument to the 'explode' animation must include a followup animation to 'use'");
    }
    if (Ember['default'].isArray(piece.use)) {
      name = piece.use[0];
      args = piece.use.slice(1);
    } else {
      name = piece.use;
      args = [];
    }
    if (typeof name === "function") {
      func = name;
    } else {
      func = context.lookup(name);
    }
    return function () {
      return liquid_fire.Promise.resolve(func.apply(this, args));
    };
  }

  function runAnimation(context, piece) {
    return new liquid_fire.Promise(function (resolve, reject) {
      animationFor(context, piece).apply(context).then(resolve, reject);
    });
  }

  function matchAndExplode(context, piece, seen) {
    if (!context.oldElement || !context.newElement) {
      return liquid_fire.Promise.resolve();
    }

    var oldPrefix = piece.pickOld || piece.pick || "";
    var newPrefix = piece.pickNew || piece.pick || "";

    var hits = Ember['default'].A(context.oldElement.find("" + oldPrefix + "[" + piece.matchBy + "]").toArray());
    return liquid_fire.Promise.all(hits.map(function (elt) {
      var propValue = Ember['default'].$(elt).attr(piece.matchBy);
      var selector = "[" + piece.matchBy + "=" + propValue + "]";
      if (context.newElement.find("" + newPrefix + "" + selector).length > 0) {
        return explodePiece(context, {
          pickOld: "" + oldPrefix + "[" + piece.matchBy + "=" + propValue + "]",
          pickNew: "" + newPrefix + "[" + piece.matchBy + "=" + propValue + "]",
          use: piece.use
        }, seen);
      } else {
        return liquid_fire.Promise.resolve();
      }
    }));
  }

});
define('giftwrap/transitions/fade', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = fade;

  // BEGIN-SNIPPET fade-definition
  function fade() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    var firstStep;
    var outOpts = opts;
    var fadingElement = findFadingElement(this);

    if (fadingElement) {
      // We still have some older version that is in the process of
      // fading out, so out first step is waiting for it to finish.
      firstStep = liquid_fire.finish(fadingElement, 'fade-out');
    } else {
      if (liquid_fire.isAnimating(this.oldElement, 'fade-in')) {
        // if the previous view is partially faded in, scale its
        // fade-out duration appropriately.
        outOpts = { duration: liquid_fire.timeSpent(this.oldElement, 'fade-in') };
      }
      liquid_fire.stop(this.oldElement);
      firstStep = liquid_fire.animate(this.oldElement, { opacity: 0 }, outOpts, 'fade-out');
    }
    return firstStep.then(function () {
      return liquid_fire.animate(_this.newElement, { opacity: [opts.maxOpacity || 1, 0] }, opts, 'fade-in');
    });
  }

  function findFadingElement(context) {
    for (var i = 0; i < context.older.length; i++) {
      var entry = context.older[i];
      if (liquid_fire.isAnimating(entry.element, 'fade-out')) {
        return entry.element;
      }
    }
    if (liquid_fire.isAnimating(context.oldElement, 'fade-out')) {
      return context.oldElement;
    }
  }
  // END-SNIPPET

});
define('giftwrap/transitions/flex-grow', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';


  exports['default'] = flexGrow;
  function flexGrow(opts) {
    liquid_fire.stop(this.oldElement);
    return liquid_fire.Promise.all([liquid_fire.animate(this.oldElement, { 'flex-grow': 0 }, opts), liquid_fire.animate(this.newElement, { 'flex-grow': [1, 0] }, opts)]);
  }

});
define('giftwrap/transitions/fly-to', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = flyTo;
  function flyTo() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    if (!this.newElement) {
      return liquid_fire.Promise.resolve();
    } else if (!this.oldElement) {
      this.newElement.css({ visibility: '' });
      return liquid_fire.Promise.resolve();
    }

    var oldOffset = this.oldElement.offset();
    var newOffset = this.newElement.offset();

    if (opts.movingSide === 'new') {
      var motion = {
        translateX: [0, oldOffset.left - newOffset.left],
        translateY: [0, oldOffset.top - newOffset.top],
        outerWidth: [this.newElement.outerWidth(), this.oldElement.outerWidth()],
        outerHeight: [this.newElement.outerHeight(), this.oldElement.outerHeight()]
      };
      this.oldElement.css({ visibility: 'hidden' });
      return liquid_fire.animate(this.newElement, motion, opts);
    } else {
      var motion = {
        translateX: newOffset.left - oldOffset.left,
        translateY: newOffset.top - oldOffset.top,
        outerWidth: this.newElement.outerWidth(),
        outerHeight: this.newElement.outerHeight()
      };
      this.newElement.css({ visibility: 'hidden' });
      return liquid_fire.animate(this.oldElement, motion, opts).then(function () {
        _this.newElement.css({ visibility: '' });
      });
    }
  }

});
define('giftwrap/transitions/move-over', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = moveOver;

  function moveOver(dimension, direction, opts) {
    var _this = this;

    var oldParams = {},
        newParams = {},
        firstStep,
        property,
        measure;

    if (dimension.toLowerCase() === 'x') {
      property = 'translateX';
      measure = 'width';
    } else {
      property = 'translateY';
      measure = 'height';
    }

    if (liquid_fire.isAnimating(this.oldElement, 'moving-in')) {
      firstStep = liquid_fire.finish(this.oldElement, 'moving-in');
    } else {
      liquid_fire.stop(this.oldElement);
      firstStep = liquid_fire.Promise.resolve();
    }

    return firstStep.then(function () {
      var bigger = biggestSize(_this, measure);
      oldParams[property] = bigger * direction + 'px';
      newParams[property] = ['0px', -1 * bigger * direction + 'px'];

      return liquid_fire.Promise.all([liquid_fire.animate(_this.oldElement, oldParams, opts), liquid_fire.animate(_this.newElement, newParams, opts, 'moving-in')]);
    });
  }

  function biggestSize(context, dimension) {
    var sizes = [];
    if (context.newElement) {
      sizes.push(parseInt(context.newElement.css(dimension), 10));
      sizes.push(parseInt(context.newElement.parent().css(dimension), 10));
    }
    if (context.oldElement) {
      sizes.push(parseInt(context.oldElement.css(dimension), 10));
      sizes.push(parseInt(context.oldElement.parent().css(dimension), 10));
    }
    return Math.max.apply(null, sizes);
  }

});
define('giftwrap/transitions/scale', ['exports', 'liquid-fire'], function (exports, liquid_fire) {

  'use strict';



  exports['default'] = scale;
  function scale() {
    var _this = this;

    var opts = arguments[0] === undefined ? {} : arguments[0];

    return liquid_fire.animate(this.oldElement, { scale: [0.2, 1] }, opts).then(function () {
      return liquid_fire.animate(_this.newElement, { scale: [1, 0.2] }, opts);
    });
  }

});
define('giftwrap/transitions/scroll-then', ['exports', 'ember'], function (exports, Ember) {

  'use strict';

  exports['default'] = function (nextTransitionName, options) {
    for (var _len = arguments.length, rest = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      rest[_key - 2] = arguments[_key];
    }

    var _this = this;

    Ember['default'].assert('You must provide a transition name as the first argument to scrollThen. Example: this.use(\'scrollThen\', \'toLeft\')', 'string' === typeof nextTransitionName);

    var el = document.getElementsByTagName('html');
    var nextTransition = this.lookup(nextTransitionName);
    if (!options) {
      options = {};
    }

    Ember['default'].assert('The second argument to scrollThen is passed to Velocity\'s scroll function and must be an object', 'object' === typeof options);

    // set scroll options via: this.use('scrollThen', 'ToLeft', {easing: 'spring'})
    options = Ember['default'].merge({ duration: 500, offset: 0 }, options);

    // additional args can be passed through after the scroll options object
    // like so: this.use('scrollThen', 'moveOver', {duration: 100}, 'x', -1);

    return window.$.Velocity(el, 'scroll', options).then(function () {
      nextTransition.apply(_this, rest);
    });
  }

});
define('giftwrap/transitions/to-down', ['exports', 'giftwrap/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "y", 1, opts);
  }

});
define('giftwrap/transitions/to-left', ['exports', 'giftwrap/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "x", -1, opts);
  }

});
define('giftwrap/transitions/to-right', ['exports', 'giftwrap/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "x", 1, opts);
  }

});
define('giftwrap/transitions/to-up', ['exports', 'giftwrap/transitions/move-over'], function (exports, moveOver) {

  'use strict';

  exports['default'] = function (opts) {
    return moveOver['default'].call(this, "y", -1, opts);
  }

});
window.GiftWrap = require('giftwrap-internal/container-injector');})();//# sourceMappingURL=addons.map