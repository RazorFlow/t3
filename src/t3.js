// Copyright (c) 2014 RazorFlow Technologies LLP

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var TestHelper = function () {
	var self = this;
	var contextDiv = $("body");
	var oldContext = null;
	var doneFunc = null,
		continuations = [];


	var jqFilter = function (val, all) {
		if(contextDiv == null) {
			self.showError ("Context is null");
		}
		if(val === ".") {
			return contextDiv;
		}
		if(typeof(val) === "string") {
			if(!contextDiv) {
				debugger;
			}
			var contextFound = contextDiv.find(val);
			if(contextFound.length === 0) {
				self.showError("Cannot find selector " + val + " in context");
			}
			if(contextFound.length > 1) {
				log("the number of elements found for ", val, "is ", contextFound.length);
			}
			return all ? contextDiv.find(val) : $(contextDiv.find(val)[0]); 
		}
		if(typeof(val) === "object") {
			if(val.length === 0) {
				self.showError("Empty jquery object passed");
			}
			if(val.length > 1) {
				log("the number of elements found for ", val, "is ", contextFound.length);
			}

			return val;
		}

		if(typeof(val) === "function") {
			return val(contextDiv);
		}
		throw "Unexpected type for jquery filter";
	}
	self.start = function (done) {
		log("Starting");
		doneFunc = done;
		contextDiv = $("body");
		continuations = [];

		self.wait(400);

		return self;
	};

	self.setContext = function (context, reset) {
		if(typeof(reset) == "undefined")
		{
			reset = true;
		}
		addSyncContinuation(function () {
			context = funcToValue(context);
			// First, reset the context div to body
			if(reset) {
				contextDiv = $("body");
			}
			contextDiv = jqFilter(context); 
		});
		return self;
	};

	self.drillContext = function (context) {
		return self.setContext(context, false);
	};

	self.assertText = function (selector, expected, options) {
		options = options ? options : {};
		addSyncContinuation(function () {
			log("Asserting text is " + expected);
			var item = jqFilter(selector);
			var found = item.text();
			if(options.trim) {
				found = found.trim();
			}

			compareFoundToExpected(found, expected);
		});
		return self;
	};

	self.assert = function (callback) {
		addASyncContinuation(function (done) {
			var onErr = function (message) {
				self.showError(message);
				done();
			};

			callback(contextDiv, done, onErr);
		});
		return self;
	}

	self.assertClass = function (selector, expected, options) {
		options = options ? options : {};
		addSyncContinuation(function () {
			log("Asserting class exists:" + expected);
			var item = jqFilter(selector);
			if(!item.hasClass(expected)) {
				self.showError("Expected "+ selector + " to have class " + expected);
			}
		});
		return self;
	};

	self.count = function (selector, expectedNum, options) {
		options = options ? options : {op: '='};
		addSyncContinuation(function() {
			log('Asserting the number of dom elements found by the selector to be ' + expectedNum);
			var items = jqFilter(selector, true),
				found = items.length;
			compareFoundToExpectedWithOp(found, expectedNum, options.op);
		});
		return self;
	};

	self.svgMeasure = function (selector, attribute, expected, options) {
		options = options ? options : {};
		addSyncContinuation(function () {
			log("Measuring svg");
			var item = jqFilter(selector);

			// Get direct item
			item = item[0];
			if(!item[attribute]) {
				self.showError("Selector " + selector + " has no property " + attribute)
				return;
			}

			var baseVal = item[attribute].baseVal;
			var found;
			if(typeof(baseVal.value) == "number") {
				found = baseVal.value;
			}
			else if (baseVal[0]) {
				found = baseVal[0].value
			}
			else if (item.getAttribute(attribute) !== null) { // for Safari and ie
				found = +item.getAttribute(attribute);
			}
			else {
				self.showError("Cannot found a baseval");
			}
			compareFoundToExpected(found, expected);
		});

		return self;
	};

	self.svgTriggerEvent = function (selector, eventName) {
		addSyncContinuation(function () {
			log("Triggering event");
			var item = jqFilter(selector);

			// Get direct item
			item = item[0];
			var event; // The custom event that will be created

			if (document.createEvent) {
				event = document.createEvent("HTMLEvents");
				event.initEvent(eventName, true, true);
			} else {
				event = document.createEventObject();
				event.eventType = eventName;
			}

			event.eventName = eventName;

			if (document.createEvent) {
				item.dispatchEvent(event);
			} else {
				item.fireEvent("on" + event.eventType, event);
			}

		});

		return self;
	};

	self.wait = function (timeout) {
		addASyncContinuation(function (done) {
			log("Waiting for " + timeout);
			setTimeout(done, timeout);
		});
		return self;
	};

	self.click = function (selector, data) {
		return self.triggerEvent(selector, "click");
	};

	self.triggerEvent = function (selector, eventName, data) {
		addSyncContinuation(function () {
			log("clicking!!");
			var item = jqFilter(selector);
			item.trigger(eventName);
		});
		return self;
	}

	self.debug = function () {
		addSyncContinuation(function () {
			// console.log("Launching a debugger");
			// console.log("The current div is ", contextDiv)
			// DO NOT REMOVE THIS DEBUGGER. It's actually MEANT to be here.
			debugger;
		});
		return self;
	}

	self.finish = function () {
		runContinuations(continuations);
	};

	self.enterTempContext = function (selector) {
		addSyncContinuation (function () {
			oldContext = contextDiv;
			contextDiv = jqFilter(selector);
		})
		return self;
	};

	self.exitTempContext = function (selector) {
		addSyncContinuation(function () {
			contextDiv = oldContext;
			oldContext = null;
		})
		return self;
	};

	self.assertCSS = function (selector, propName, expected) {
		addSyncContinuation(function () {
			var item = jqFilter(selector);

			if(typeof(propName) == "string") {
				var found = item.css(propName);
				compareFoundToExpected(found, expected);
			}
			else if(typeof(propName) == "object") {
				for(var key in propName) {
					if(propName.hasOwnProperty(key)) {
						var expectedVal = propName[key];
						var found = item.css(key);

						compareFoundToExpected(found, expectedVal);
					}
				}
			}
		});

		return self;
	};

	self.assertAttrs = function (selector, propName, expected) {
		addSyncContinuation(function () {
			var item = jqFilter(selector);

			if(typeof(propName) == "string") {
				var found = item.attr(propName);
				compareFoundToExpected(found, expected);
			}
			else if(typeof(propName) == "object") {
				for(var key in propName) {
					if(propName.hasOwnProperty(key)) {
						var expectedVal = propName[key];
						var found = item.attr(key);

						compareFoundToExpected(found, expectedVal);
					}
				}
			}
		});

		return self;
	};

	self.doSync = function (func) {
		addSyncContinuation(function () {
			func(contextDiv);
		});
		return self;
	};

	self.doASync = function (func) {
		addASyncContinuation(function (done) {
			func(contextDiv, done)
		});
		return self;
	};

	self.assertElementExists = function (selector) {
		addSyncContinuation(function () {
			jqFilter(selector); // This will trigger 
		});
	}

	var addSyncContinuation = function (func) {
		continuations.push(function (done) {
			func ();
			done();
		})
	};

	var addASyncContinuation = function (func) {
		continuations.push(function (done) {
			func(done);
		})
	};

	var funcToValue = function (value, found) {
		if(typeof(value) === "function") {
			return value(found);
		}
		else {
			return value;
		}
	};

	var compareFoundToExpected = function (found, expected) {
		if(typeof(expected) === "function") {
			var expectedResult = expected(found, contextDiv)
			if(expectedResult === true) {
				return;
			}
			else {
				if(expected(found, contextDiv, self.showError)) {
					self.showError("Custom check failed");
				}
			}
		}
		else {
			expect(found).toBe(expected);	
		}
		
	};

	var compareFoundToExpectedWithOp = function(found, expected, op) {
		if(typeof(expected) === "function") {
			var expectedResult = expected(found, contextDiv)
			if(expectedResult === true) {
				return;
			}
			else {
				if(expected(found, contextDiv, self.showError)) {
					self.showError("Custom check failed");
				}
			}
		}
		else {
			if(op === '=') {
				expect(found).toEqual(expected);
			} else if(op === '<') {
				expect(found).toBeLessThan(expected);
			} else if(op === '>') {
				expect(found).toBeGreaterThan(expected);
			} else if(op === '~') {
				expected(found).toBeCloseTo(expected);
			}
		}
	}

	var runContinuations = function (cList) {
		if(cList.length == 0) {
			log("done everything");
			doneFunc();
			return;
		}
		var cont = cList.shift();

		cont(function () {
			runContinuations(cList);
		});
	};

	var log = function (msg) {
		if(console) {
			if(console.log) {
				console.log(msg);
			}
		}
	};


	self.showError = function (message) {
		expect("ERROR!!").toBe(message);
	};
};

var t3 = {
	start: function (done) {
		return new TestHelper().start(done);
	},
	between: function (start, end) {
		return function (val, context, showError) {
			if(typeof(val) === "string") {
				val = parseInt(val);
			}
			if(typeof(showError) === "function") {
				showError("Expected " + start + " < " + val + " < " + end + ". But it wasn't so.");
			}

			return (start <= val) && (val <= end);
		}
	},
	approximate: function (point, tolerance) {
		return t3.between(point - tolerance, point + tolerance);
	}
};

window.t3 = t3;
window.TestHelper = TestHelper;