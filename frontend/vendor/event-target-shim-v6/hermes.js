'use strict';

/**
 * Class-free EventTarget/Event for Hermes.
 * Metro re-transpiling event-target-shim@6 (ES classes / es5.js helpers) leaves
 * EventTarget undefined → "Super expression must either be null or a function".
 */
function Event(type, eventInitDict) {
  this.type = type == null ? '' : String(type);
  var init = eventInitDict || {};
  this.bubbles = !!init.bubbles;
  this.cancelable = !!init.cancelable;
  this.composed = !!init.composed;
  this.defaultPrevented = false;
  this.cancelBubble = false;
  this.eventPhase = 0;
  this.timeStamp = Date.now();
  this.isTrusted = false;
  this.target = null;
  this.currentTarget = null;
}
Event.NONE = 0;
Event.CAPTURING_PHASE = 1;
Event.AT_TARGET = 2;
Event.BUBBLING_PHASE = 3;
Event.prototype.preventDefault = function preventDefault() {
  if (this.cancelable) this.defaultPrevented = true;
};
Event.prototype.stopPropagation = function stopPropagation() {
  this.cancelBubble = true;
};
Event.prototype.stopImmediatePropagation = function stopImmediatePropagation() {
  this.cancelBubble = true;
  this._immediateStopped = true;
};

function EventTarget() {
  this._listeners = Object.create(null);
}
EventTarget.prototype.addEventListener = function addEventListener(type, callback, options) {
  if (!callback) return;
  var once = !!(options && typeof options === 'object' && options.once);
  var list = this._listeners[type] || (this._listeners[type] = []);
  for (var i = 0; i < list.length; i++) {
    if (list[i].callback === callback) return;
  }
  list.push({ callback: callback, once: once });
};
EventTarget.prototype.removeEventListener = function removeEventListener(type, callback) {
  var list = this._listeners[type];
  if (!list) return;
  this._listeners[type] = list.filter(function (item) {
    return item.callback !== callback;
  });
};
EventTarget.prototype.dispatchEvent = function dispatchEvent(event) {
  if (!event || typeof event.type !== 'string') return true;
  event.target = event.target || this;
  event.currentTarget = this;
  var list = (this._listeners[event.type] || []).slice();
  for (var i = 0; i < list.length; i++) {
    if (event._immediateStopped) break;
    var item = list[i];
    try {
      if (typeof item.callback === 'function') item.callback.call(this, event);
      else if (item.callback && typeof item.callback.handleEvent === 'function') {
        item.callback.handleEvent(event);
      }
    } catch (err) {
      setTimeout(function () {
        throw err;
      }, 0);
    }
    if (item.once) this.removeEventListener(event.type, item.callback);
  }
  var attr = this['on' + event.type];
  if (typeof attr === 'function') {
    try {
      attr.call(this, event);
    } catch (err) {
      setTimeout(function () {
        throw err;
      }, 0);
    }
  }
  return !event.defaultPrevented;
};

function defineEventAttribute(target, type) {
  Object.defineProperty(target, 'on' + type, {
    configurable: true,
    enumerable: true,
    get: function () {
      return this['_on' + type] || null;
    },
    set: function (value) {
      this['_on' + type] = value;
    },
  });
}

function defineCustomEventTarget() {
  return EventTarget;
}

function getEventAttributeValue(target, type) {
  return target['on' + type] || null;
}

function setEventAttributeValue(target, type, value) {
  target['on' + type] = value;
}

function noop() {}

var api = {
  Event: Event,
  EventTarget: EventTarget,
  defineEventAttribute: defineEventAttribute,
  defineCustomEventTarget: defineCustomEventTarget,
  getEventAttributeValue: getEventAttributeValue,
  setEventAttributeValue: setEventAttributeValue,
  setErrorHandler: noop,
  setWarningHandler: noop,
  default: EventTarget,
  __esModule: true,
};

EventTarget.Event = Event;
EventTarget.EventTarget = EventTarget;
EventTarget.defineEventAttribute = defineEventAttribute;
EventTarget.defineCustomEventTarget = defineCustomEventTarget;
EventTarget.getEventAttributeValue = getEventAttributeValue;
EventTarget.setEventAttributeValue = setEventAttributeValue;
EventTarget.setErrorHandler = noop;
EventTarget.setWarningHandler = noop;
EventTarget.default = EventTarget;

module.exports = api;
