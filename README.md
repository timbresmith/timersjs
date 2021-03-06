timersjs
========

A tiny JavaScript timer library

This library was extracted from [The Render Engine](https://github.com/bfattori/TheRenderEngine) game engine's code base for use by
anyone.  It provides five little timer wrappers which make using timers a little easier.

## Usage:

```javascript
var timer = TimersJS.timer(100, function(delta, now) {
   console.log("This is output after 100ms, the current time is " + now + "ms");
});
```

The function is given the timer itself as the context so within the function, "this" refers
to the timer.  A timer can be turned into an interval simply by calling the timer's restart() method:

```javascript
var timer = TimersJS.timer(250, function() {
   console.log("This is output every 250ms");
   this.restart();
});
```

This simple construct is implemented for you as:

```javascript
var repeater = TimersJS.repeater(250, function(delta) {
   console.log("This is output every 250ms, time since last execution: " + delta + "ms");
});
```

It's possible to use this functionality to allow a timer to kill itself when something completes:

```javascript
TimersJS.timer(50, function() {
   if (ajaxHasReturned()) {
      this.kill();
   } else {
      this.restart();
   }
});
```

There are other types of timers, a one-shot which self-kills when it's done:

```javascript
TimersJS.oneShot(500, function() {
   console.log("This is called when the timeout is complete");
});
```

This is a timer which will repeat a certain number of times before it self destructs:

```javascript
TimersJS.multi(250, 8, function(repetition) {
   console.log("This is repetition " + repetition);
}, function() {
   console.log("The multi timer is complete");
});
```

Finally, this is a timer which will run a repeater internally:

```javascript
TimersJS.trigger(5000, function() {
    console.log("The trigger is complete");
}, 500, function(now, delta) {
    console.log("Triggered @ " + delta + "ms");
});
```

You may wonder why have the trigger and the multi?  Well, the multi is triggered a specific number of times
with the same interval between callbacks.  It is guaranteed to call back the number of times you want it.
The trigger will trigger as often as it can in the time allotted.
