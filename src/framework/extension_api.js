// Copyright (c) 2014 Intel Corporation. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Extension = function(name, id) {
    this.id = id;
    this.lastCallID = 0;
    this.callbacks = [];

    var a = name.split(".");
    if (a.length > 1) {
        for (var i = 0, n = window; i < a.length; n = n[a[i]], i++)
            if (!n[a[i]]) n[a[i]] = {};
    }
}

Extension.prototype = {
    invokeNative: function(name, args) {
        if (typeof(name) != 'string') {
            console.error('Invalid invocation');
            return;
        }
         var body = name[0] == '.' ?
                { 'property': name.substring(1), 'value': args } :
                { 'method': name, 'arguments': args };
        webkit.messageHandlers[this.id].postMessage(body);
    },
    addCallback: function(callback) {
        while (this.callbacks[this.lastCallID] != undefined) ++this.lastCallID;
        this.callbacks[this.lastCallID] = callback;
        return this.lastCallID;
    },
    removeCallback: function(callID) {
        delete this.callbacks[callID];
        this.lastCallID = callID;
    },
    invokeCallback: function(callID, key, args) {
        var func = this.callbacks[callID];
        if (typeof(func) == 'object')  func = func[key];
        if (typeof(func) == 'function')  func.apply(null, args);
        this.removeCallback(callID);
    },
    defineProperty: function(prop, desc) {
        var name = "." + prop;
        var d = { 'configurable': false, 'enumerable': true }
        if (desc.hasOwnProperty("value")) {
            // a data descriptor
            this.invokeNative(name, desc.value);
            if (desc.writable == false) {
                // read only property
                d.value = desc.value;
                d.writable = false;
            } else {
                // read/write property
                var store = "_" + prop;
                Object.defineProperty(this, store, {
                                      'configurable': false,
                                      'enumerable': false,
                                      'value': desc.value,
                                      'writable': true
                                      });
                d.get = function() { return this[store]; }
                d.set = function(v) { this.invokeNative(name, v); this[store] = v; }
            }
        } else if (typeof(desc.get) === 'function'){
            // accessor descriptor
            this.invokeNative(name, desc.get());
            d.get = desc.get
            if (typeof(desc.set) === 'function') {
                d.set = function(v) { desc.set(v); this.invokeNative(name, desc.get()); }
            }
        }
        Object.defineProperty(this, prop, d);
    }
}