/**
 * TimersJS
 *
 * @fileoverview A collection of timer objects.
 *
 * Copyright (c) 2013 Brett Fattori (bfattori@gmail.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
(function () {

    var global = this, timerPool = [], callbacksPool = [];

    function addTimerToPool(timer) {
        timerPool.push(timer);
        return timerPool.length - 1;
    }

    function removeTimerFromPool(timer) {
        timerPool.splice(timer.id, 1);
    }

    /**
     * @class The base abstract class for all timer objects.
     *
     * @param interval {Number} The interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the interval is reached
     *
     * @constructor
     * @description Create a timer object
     */
    var AbstractTimer = function (interval, callback) {
        this._timer = null;
        this._interval = interval;
        this._callback = callback;
        this._running = false;
        this._paused = false;
        this._timerFn = null;

        this.id = addTimerToPool(this);

        this.restart();
    };

    AbstractTimer.prototype = {

        /**
         * Stop the timer and remove it from the system
         */
        kill:function () {
            // The engine needs to remove this timer
            global.TimersJS.cleanupCallback(this._timerFn);
            this.cancel();
            removeTimerFromPool(this);
            this._timer = null;
            return null;
        },

        /**
         * Get the underlying system timer object.
         * @return {Object}
         */
        timer:function (timer) {
            if (typeof timer !== "undefined") {
                this._timer = timer;
            }
            return this._timer;
        },

        /**
         * Returns <tt>true</tt> if the timer is currently running.
         * @return {Boolean} <tt>true</tt> if the timer is running
         */
        isRunning:function () {
            return this._running;
        },

        /**
         * Cancel the timer.
         */
        cancel:function () {
            this._timer = null;
            this._running = false;
        },

        /**
         * Pause the timer.  In the case where a timer was already processing,
         * a restart would begin the timing process again with the full time
         * allocated to the timer.  In the case of multi-timers (ones that retrigger
         * a callback, or restart automatically a number of times) only the remaining
         * iterations will be processed.
         */
        pause:function () {
            this.cancel();
            this._paused = true;
        },

        /**
         * Cancel the running timer and restart it.
         */
        restart:function () {
            this.cancel();
            this._running = true;
            this._paused = false;
        },

        /**
         * Set the callback function for this timer.  If the timer is
         * currently running, it will be restarted.
         *
         * @param callback {Function} A function object to call
         */
        callback:function (callback) {
            if (typeof callback !== "undefined") {
                this._callback = callback;
                this._timerFn = null;
                if (this.isRunning()) {
                    this.restart();
                }
            } else {
                if (this._timerFn === null) {
                    this._timerFn = function () {
                        if (arguments.callee.timerCallback)
                            arguments.callee.timerCallback.call(arguments.callee.timer);
                    };
                    this._timerFn.timerCallback = this._callback;
                    this._timerFn.timer = this;
                }
            }
            return this._timerFn;
        },

        /**
         * Set the interval of this timer.  If the timer is running, it
         * will be cancelled.
         *
         * @param interval {Number} The interval of this timer, in milliseconds
         */
        interval:function (interval) {
            if (typeof interval !== "undefined") {
                this.cancel();
                this._interval = interval;
            }
            return this._interval;
        }

    };

    /**
     * @class An extension of {@link AbstractTimer} that wraps the <tt>window.setTimeout</tt> method.
     *
     * @param interval {Number} The interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the interval is reached
     * @extends AbstractTimer
     * @constructor
     * @description Create a timeout timer
     */
    var Timer = function (interval, callback) {
        AbstractTimer.call(this, interval, callback);
    };

    Timer.prototype = new AbstractTimer();
    Timer.base = AbstractTimer.prototype;

    /**
     * Cancel this timeout timer.
     */
    Timer.prototype.cancel = function () {
        global.clearTimeout(this.timer());
        Timer.base.cancel();
    };

    /**
     * Cancel and destroy the timeout
     */
    Timer.prototype.kill = function () {
        this.cancel();
        Timer.base.kill();
    };

    /**
     * Restart this timeout timer
     */
    Timer.prototype.restart = function () {
        this.timer(global.setTimeout(this.callback(), this.interval()));
    };

    /**
     * @class An extension of {@link AbstractTimer} that wraps the <tt>window.setInterval</tt> method.
     * @param interval {Number} The interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the interval is reached
     * @extends AbstractTimer
     * @constructor
     * @description Create an interval timer
     */
    var IntervalTimer = function (interval, callback) {
        AbstractTimer.call(this, interval, callback);
    };
    IntervalTimer.prototype = new AbstractTimer();
    IntervalTimer.base = AbstractTimer.prototype;

    /**
     * Cancel this interval timer.
     */
    IntervalTimer.prototype.cancel = function () {
        global.clearInterval(this.timer());
        IntervalTimer.base.cancel.call(this);
    };

    /**
     * Cancel and destroy the interval timer.
     */
    IntervalTimer.prototype.kill = function () {
        this.cancel();
        IntervalTimer.base.kill.call(this);
    };

    /**
     * Restart this interval timer.
     */
    IntervalTimer.prototype.restart = function () {
        this.cancel();
        this.timer(global.setInterval(this.callback(), this.interval()));
    };

    /**
     * @class An extension of {@link Timer} that will repeat the specified number of times before
     *        destroying itself.  The callback will be triggered with the
     *        repetition number as the only argument.  Within the callback, <tt>this</tt>
     *        refers to the <tt>Timer</tt> object itself.
     *
     * @param interval {Number} The interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the interval is reached
     * @param repetitions {Number} The number of repetitions to restart the timer automatically
     * @param completionCallback {Function} The function to call when the timer is about to be killed
     * @extends Timer
     * @constructor
     * @description Create a multi-timeout triggering timer
     */
    var MultiTimer = function (interval, callback, repetitions, completionCallback) {

        var internalCallback = function () {
            var aC = arguments.callee;
            if (aC.repetitions-- > 0) {
                aC.callbackFunction.call(this, aC.totalRepetitions);
                aC.totalRepetitions++;
                this.restart();
            } else {
                if (aC.completionCallback) {
                    aC.completionCallback();
                }
                this.kill();
                global.TimersJS.cleanupCallback(aC);
            }
        };
        internalCallback.callbackFunction = callback;
        internalCallback.completionCallback = completionCallback;
        internalCallback.repetitions = repetitions;
        internalCallback.totalRepetitions = 0;

        Timer.call(this, interval, internalCallback);
    };
    MultiTimer.prototype = new Timer();
    MultiTimer.base = Timer.prototype;

    /**
     * @class An extension of {@link Timer} which is a one-shot timer that cannot
     *        be restarted and will self-destroy after it completes its interval.  Within
     *        the callback, <tt>this</tt> refers to the <tt>Timer</tt> object itself.
     *
     * @param interval {Number} The interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the interval is reached
     * @constructor
     * @extends Timer
     * @description Create a one-shot timeout
     */
    var OneShotTimer = function (interval, callback) {

        var innerCallback = function () {
            if (arguments.callee.callbackFunction) {
                arguments.callee.callbackFunction.call(this);
                this.kill();
                global.TimersJS.cleanupCallback(arguments.callee);
            }
        };
        innerCallback.callbackFunction = callback;

        Timer.call(this, interval, innerCallback);
    };
    OneShotTimer.prototype = new Timer();
    OneShotTimer.base = Timer.prototype;

    /**
     * This timer cannot be restarted.
     * @private
     */
    OneShotTimer.prototype.restart = function () {
        if (!this._paused && this._running) {
            return;
        }

        OneShotTimer.base.restart.call(this);
    };

    /**
     * @class An extension of {@link OneShotTimer} which is a one-shot timer that triggers a callback,
     *        at regular intervals, until the timer has expired.  When the timer expires, the
     *        trigger will automatically destroy itself.  Within the callbacks, <tt>this</tt>
     *        refers to the <tt>Timer</tt> object itself.
     *
     * @param interval {Number} The full interval for the timer, in milliseconds
     * @param callback {Function} The function to call when the full interval is reached
     * @param triggerInterval {Number} The interval between triggers, in milliseconds
     * @param triggerCallback {Function} The function to call for each trigger interval
     * @extends OneShotTimer
     * @constructor
     * @description Create a one-shot triggering timeout
     */
    var OneShotTrigger = function (interval, callback, triggerInterval, triggerCallback) {

        var completionCallback = function () {
            var aC = arguments.callee;
            aC.interval.kill();
            aC.intervalCompletionCallback.call(this);
            global.TimersJS.cleanupCallback(aC);
        };

        // Create an Interval internally
        completionCallback.interval = new IntervalTimer(triggerInterval, triggerCallback);
        completionCallback.intervalCompletionCallback = callback;

        OneShotTimer.call(this, interval, completionCallback);
    };
    OneShotTrigger.prototype = new OneShotTimer();
    OneShotTrigger.base = OneShotTimer.prototype;


    global.TimersJS = {
        cleanupCallback: function(cb) {
            callbacksPool.push(cb);
        },

        poolSize: function() {
            // Subtract the class inheritance
            return timerPool.length - 5;
        },

        pauseAllTimers: function() {
            for (var i = 0; i < timerPool.length; i++)
                timerPool[i].pause();
        },

        restartAllTimers: function() {
            for (var i = 0; i < timerPool.length; i++)
                timerPool[i].restart();
        },

        cancelAllTimers: function() {
            while (timerPool.length > 0) {
                timerPool[0].cancel();
            }
        },

        killAllTimers: function() {
            while (timerPool.length > 0) {
                timerPool[0].kill();
            }
        },

        timer: function(interval, callback) {
            return new Timer(interval, callback);
        },

        repeater: function(interval, callback) {
            return new IntervalTimer(interval, callback);
        },

        multi: function(interval, repetitions, callback, completionCallback) {
            return new MultiTimer(interval, callback, repetitions, completionCallback);
        },

        oneShot: function(interval, callback) {
            return new OneShotTimer(interval, callback);
        },

        trigger: function(interval, callback, triggerRate, triggerCallback) {
            return new OneShotTrigger(interval, callback, triggerRate, triggerCallback);
        }
    };

    global.setInterval(function() {
        while (callbacksPool.length > 0) {
            callbacksPool[0] = null;
            callbacksPool.shift();
        }
    }, 500);
})();