t3.js - Integration Testing for Single Page Apps
================================================

t3.js (short for "Terrific Testing Tool") is a tool to help you preform integration tests Single Page JavaScript applications. It doesn't do any testing by itself, instead can be configured to use any testing framework which supports asynchronous testing. By default, it ships with support for Jasmine testing framework.

## Why use t3?

While JavaScript testing libraries are generally great for testing unit functions (like Jasmine), it doesn't work great for testing UIs which have heavy DOM involvement. Generally you use tools like Selenium for this, but Selenium doesn't allow you to mix things together and check for things like "Assert this DOM node has only one child".

As an example, let's consider a Login Form. This form does AJAX validation and displays an error message.

```
<form id="loginForm">
	<input type="text" id="userName"/>
	<input type="password" id="userPass">
	<button id="submitButton">Login</button>
	<p id="errorMessage"></p>
</form>
```

To test this, we first enter the wrong password and then the correct one. 

### Testing without t3

```
it("Should show error message on wrong password and hide form on successful login", function (done) {
	// Set values
	$("#userName").attr("value", "user");
	$("#userPass").attr("value", "wrong_password");
	$("#submitButton").click();
	setTimeout (function () {
		expect($("#errorMessage").text()).toBe("Wrong Password");
		$("#userPass").attr("value", "correct_password");
		$("#submitButton").click();
		setTimeout (function () {
			expect($("#errorMessage").text()).toBe("");
			expect($("#loginForm").css("display")).toBe("none")
			done ();
		}, 500);
	}, 500);
});
```

### Testing with t3

```
it("Should show error message on wrong password and hide form on successful login", function (done) {
	t3.start()
	  .fillForm("#userName", "user")
	  .fillForm("#userPass", "wrong_password")
	  .click("#submitButton")
	  .wait(500)
	  .assertText("#errorMessage", "Wrong Password")
	  .fillForm("#userPass", "correct_password")
	  .click("#submitButton")
	  .wait(500)
	  .assertText("#errorMessage", "")
	  .assertCSS("#loginForm", "display", "none")
	  .finish(done)
});
```

## How to use it


First, include jQuery and t3.min.js in your page. Currently only Jasmine is supported. And create an async test.

```
it("Should do something awesome", function (done) {
	t3.start()
	  // All t3 statements come here
	  .finish(done) // this should be the last statement
});
```

You will have to *chain* various statements together to perform actions and checks

### Understanding t3's Context

Since t3 is frequently used to test the DOM, and not every item in the DOM has an id or a unique selector, for convenience, t3 always operates on a specific context.

For example, if you're making an application and are testing everything rendered into a div called "renderTarget", you can just do:

```
t3.start()
  .setContext ("#renderTarget")
  // ...
```

Now when you use a command like

```
  .assertText("p.warning", "Please check yo'self");
```

It only checks inside the `#renderTarget`.

### Using various statements

#### start

Starts the chain.

```
t3.start()
  .finish(done)
```

#### finish

Finishes the chain and if no errors are found, marks the test as successful.

```
t3.start()
  .finish(done)
```

#### wait

Waits for some number of milliseconds before continuing to the next step on the chain.

```
t3.start()
  .wait(2000) // Wait 2 seconds before finishing the test
  .finish(done)
```

#### debug

Launches a JavaScript debugger inside the chain so you can manually examine the context of the DOM. You might want to remove this in production.

```
t3.start()
  .debug()
  .finish(done)
```

#### setContext

Allows you to set the context. You can pass either:

* A jQuery Selector. This is always selected from the top-level.
* A jQuery object which you've already selected

```
t3.start()
  .setContext ("#mailBoxRenderer")
  .finish(done);
```

#### drillContext

If you already have a context, and want to set a new context which is below the current context, you can use ``drillContext``

```
t3.start()
  .setContext ("#mailBoxRenderer")
  .drillContext ("li.mailItem:eq(0)")
  .finish(done);
```

#### enterTempContext and exitTempContext

If you want to temporarily go into a sub-context div (for example if you're checking a todo list, you go from the full list temporarily into a single item). You can exit this temp context by using `exitTempContext`

```
t3.start()
  .setContext ("#todoListRenderer") // context is #todoListRenderer
  .enterTempContext ("div.todoItem:eq(5)") // context is #todoListRenderer > div.todoItem:eq(5)
  	.assert(".todoName", "Throw ring[0] in mordor")
  .exitTempContext () // context is #todoListRenderer
  .finish(done);
```

#### trigger

Trigger an event on an element. (This is still in development)

```
t3.start()
  .setContext ("#loginForm")
  .trigger ("#userName", "click")
  .finish(done);
```

There are some shortcut methods for common functions like `.click` which you can use directly

```
t3.start()
  .setContext ("#loginForm")
  .click ("#submitButton")
  .finish(done);
```

#### doSync

Execute some code in the correct step in the chain.

```
t3.start()
  .setContext ("#loginForm")
  .doSync (function () {
  	console.log("t3 is awesome");
  })
  .finish(done);
```

#### doAsync

```
t3.start()
  .setContext ("#loginForm")
  .doAsync(function (contextDiv, _done) {
  	setTimeout (function () {
  		console.log ("finished async task");
  		_done ();
  	});
  	console.log("Starting async task")
  })
  .doSync (function () {
  	console.log("t3 is awesome");
  })
  .finish(done);
```

This will output:

```
Starting async task
finished async task
t3 is awesome
```

#### assert

This is the generic assert that you can use to check custom conditions. For example, to check if a todo list has only 5 items after adding 5 items:

```
t3.start()
  .setContext("#todoList > li")
  .assert(function (contextDiv, success, error) {
  	if(contextDiv.length == 5) {
  		success ();
  	}
  	else {
  		error ("The number of list items is not 5");
  	}
  })
  .finish (done)
```

This allows you to exercise full control over all the custom testing features that t3 does not provide, while still benefiting from the async chain.

#### assertText

Asserts that the text has a specific value

```
t3.start ()
  // ...
  .assertText ("p.warning", "Something is not right")
  .finish(done);
```

#### assertCSS

Assert that the CSS values of an element match requirements.

```
t3.start ()
  // ...
  .assertCSS ("p.warning", "color", "red") // a single condition
  .assertCSS ("#tooltip", {
  	"display": "inline",
  	"float": "left"
  }) // multiple conditions
  .finish(done);
```

#### assertAttrs

Assert attibute values of an element match requirements.

```
t3.start ()
  // ...
  .assertCSS ("p.warning", "data-alert", "warning") // a single condition
  .assertCSS ("#tooltip", {
  	"class": "tooltip",
  	"data-tooltip-content": "Hello"
  }) // multiple conditions
  .finish(done);
```

#### svgMeasure

Function which works with SVG attributes instead of CSS items.

```
t3.start ()
  .setContext ("svg")
  .svgMeasure ("rect", "width", 42)
  .finish(done);
```

#### svgTriggerEvent

Function which works with SVG elements instead of regular elemtns

```
t3.start ()
  .setContext ("svg")
  .svgTriggerEvent("rect", "click")
  .finish(done);
```


### Helper functions

T3 also includes a few special helper functions.

#### t3.between (start, end)

Checking for CSS/SVG measurements might have slight variations, and testing them perfectly is hard, so you can provide a range to check the values against.

```
.assertCSS("#todoItem", "height", t3.between(45, 48));
```

#### t3.approximate (value, tolerance)

If you expect a value of, say, 45. But there might be some minor changes, with a maximum deviation of 2.

```
.assertCSS("#todoItem", "height", t3.approximate(45, 2));
```

## Special features

#### Check values using a function

Just about anywhere a value or object is expected, you can pass a function which handles the evaluation. You can also have custom errors.

```
// For example if your DOM outputs strings which aren't trimmed
// <p class="warning">       This is a warning   </p>
assertText("p.warning", "This is a warning"); // would fail

// you can use
assertText ("p.warning", function (value, context) {
	return value.trim() == "This is a warning";
}); // this passes
```