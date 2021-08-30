// Winsford ASC Website
//
//   stopwatch.js
//
// Stopwatch to compare a previous race's splits to one that's run live.
// Requires other .js files in this project.
//
// Feel free to use this code in your own website, but please credit us.
//
// Copyright (C) 2017 Oliver Wright
//	oli.wright.github@gmail.com
// 
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License along
// with this program (file LICENSE); if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.import logging

var stopwatchElement;
var stopwatchRequestFullscreen;
var stopwatchExitFullscreen;
var stopwatch;
var noSleep = new NoSleep();
var wakeLockEnabled = false;

var ua = {
Android: /Android/ig.test(navigator.userAgent),
iOS: /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent)
};

function getFullscreenElement()
{
    return document.fullscreenElement || document.msFullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement;
}

function setElementDeltaClass(el, delta)
{
    if (delta <= 0) {
        el.className = "up";
    }
    else {
        el.className = "down";
    }
}

function activateWakeLock()
{
    if (!wakeLockEnabled) {
        noSleep.enable(); // keep the screen on!
        wakeLockEnabled = true;
        console.log("Wake Lock Enabled");
    }
}

//
// Split Object
//
function Split(idx)
{
    this.time = 0.0;
    this.resetElements(idx);
    this.isGood = false;
}

Split.prototype = {
    constructor: Split,

    resetElements: function (idx) {
        this.rowElement = document.getElementById("split-row" + idx);
        this.element = document.getElementById("split-" + idx);
    }
}


//
// Stopwatch Object
//
function Stopwatch(asaNumber, swimIdx)
{
    this.asaNumber = asaNumber;
    this.swimIdx = swimIdx;
    this.swimmer = asaNumberToSwimmer[asaNumber];
    var swim = this.swimmer.swims[swimIdx];
    this.swim = swim;
    this.clickPrimed = true;

    // Deltas from original split intervals
    this.bestPossibleDelta = -5.0;
    this.worstLikelyDelta = +5.0;

    var html = '';
    html += '<div id="stopwatch-wrapper" style="display:none;">';
    html += '<h1>' + eventName(swim.eventIdx) + '</h1>';
    html += '<h2>' + this.swimmer.fullName + '</h2>'
    this.isLC = swim.isLongCourse();
    var scChecked = '';
    var lcChecked = '';
    if (this.isLC)
    {
        lcChecked = ' checked';
        this.originalSplits = swim.lcSplits;
    }
    else
    {
        scChecked = ' checked';
        this.originalSplits = swim.scSplits;
    }
    html += '<h3>';
    html += '<input type="radio" name="course" value="short" onclick="stopwatch.setIsLC(false)"' + scChecked + '>SC</input>';
    html += '<input type="radio" name="course" value="long" onclick="stopwatch.setIsLC(true)"' + lcChecked + '>LC</input>';
    html += '</h3>';
    //html += '<p>' + formatDateDDMMYYYY(swim.date) + ' ' + swim.meet + '</p>';
    html += '<div><div class="centre-table"><table><tr>';
    html += '<td><button id="stopwatch-nudgedown" onclick="stopwatch.nudge(-100)">-0.1s</button></td>';
    html += '<td><h1 id="stopwatch-time">00.00</h1></td>';
    html += '<td><button id="stopwatch-nudgeup" onclick="this.nudge(100)">+0.1s</button></td>';
    html += '</tr></table></div></div>';
    html += '<div id="stopwatch-projection" class="centre-table"><table><tr>';
    html += '<td>Projection</td>';
    html += '<td>0:00.0</td>';
    html += '<td></td>';
    html += '</tr></table></div>';
    html += '<div id="stopwatch-button-container">';
    html += '<button id="stopwatch-start" class="glass" onclick="stopwatch.start(true)" ontouchstart="stopwatch.start(false)">Start</button>';
    html += '<button id="stopwatch-lap" class="glass" onclick="stopwatch.lap(true)" ontouchstart="stopwatch.lap(true)">Lap</button>';
    html += '<button id="stopwatch-lap-inactive"></button>';
    html += '<button id="stopwatch-finish" class="glass" onclick="stopwatch.lap(true)" ontouchstart="stopwatch.lap(true)">Finish</button>';
    html += '</div>';
    html += '<button id="stopwatch-stop" class="glass" onclick="stopwatch.stopCheck()">Stop</button>';
    html += '<div id="stopwatch-splits"></div>';
    html += '</div>';

    stopwatchElement.innerHTML = html;

    this.splitsElement = document.getElementById("stopwatch-splits");
    this.timeElement = document.getElementById("stopwatch-time");
    this.startElement = document.getElementById("stopwatch-start");
    this.finishElement = document.getElementById("stopwatch-finish");
    this.stopElement = document.getElementById("stopwatch-stop");
    this.lapElement = document.getElementById("stopwatch-lap");
    this.lapInactiveElement = document.getElementById("stopwatch-lap-inactive");
    this.nudgeDownElement = document.getElementById("stopwatch-nudgedown");
    this.nudgeUpElement = document.getElementById("stopwatch-nudgeup");
    this.projectionElement = document.getElementById("stopwatch-projection");
    this.buttonContainerElement = document.getElementById("stopwatch-button-container");

    this.nudgeDownElement.style.display = "none";
    this.nudgeUpElement.style.display = "none";
    this.lapElement.style.display = "none";
    this.lapInactiveElement.style.display = "none";
    this.finishElement.style.display = "none";
    this.stopElement.style.display = "none";
    this.projectionElement.style.display = "none";

    //this.startElement.addEventListener('click', activateWakeLock, false);
    //this.startElement.touchstart = activateWakeLock;
//    this.startElement.addEventListener('touchstart', function () {
//        stopwatch.start();
//    }, false);

    this.resize();
    this.buildSplitsTable();

    document.getElementById("stopwatch-wrapper").style.display = "flex";
}

Stopwatch.prototype = {
    constructor: Stopwatch,

    cleanup: function() {
        if(this.interval)
        {
            window.clearInterval(this.interval);
        }
    },

    setIsLC: function(isLC) {
        if(this.isLC != isLC)
        {
            this.isLC = isLC;
            if(isLC)
            {
                this.originalSplits = this.swim.lcSplits;
            }
            else
            {
                this.originalSplits = this.swim.scSplits;
            }
            this.buildSplitsTable();
        }
    },

    buildSplitsTable: function() {
        //var classStr = 'class="' + eventStroke(this.swim.eventIdx).toLowerCase() + '"';
        var html = '<table><thead>';
        html += '<tr><th></th><th colspan="2">Original</th><th colspan="3">Now</th></th></tr>';
        html += '<tr><th></th><th>Time</th><th>Int</th><th>Time</th><th>Int</th><th>Delta</th></tr>';
        html += '</thead><tbody>';
        var numSplits = this.originalSplits.length;
        var intervalDistance = eventDistance(this.swim.eventIdx) / this.originalSplits.length;
        var distance = 0;
        var previousSplitTime = 0.0;
        for (var i = 0; i < numSplits; i++) {
            distance += intervalDistance;
            var splitTime = this.originalSplits[i];
            html += '<tr id="split-row' + i + '"><td>' + distance + 'm</td><td>' + raceTimeToString(splitTime) + '</td><td>' + raceTimeToString(splitTime - previousSplitTime) + '</td><td id="split-' + i + '"></td><td></td><td></td></tr>';
            previousSplitTime = splitTime;
        }
        html += '</tbody></table>';
        this.splitsElement.innerHTML = html;

        if (this.splits)
        {
            for (var i = 0; i < numSplits; i++) {
                this.splits[i].resetElements(i);
                this.writeSplitToTable(i);
            }
        }
        else
        {
            this.splits = [];
            for (var i = 0; i < numSplits; i++) {
                this.splits.push(new Split(i))
            }
        }
    },

    nudge: function(deltaMS) {
        this.startTimeMS -= ms;
    },

    start: function (isClickEvent) {
        if (this.clickPrimed)
        {
            // Mark the time
            this.startTimeMS = new Date().getTime();
            this.time = 0.0;
            this.clickPrimed = false;

            // Modify which elements are visible
            this.nudgeDownElement.style.display = "block";
            this.nudgeUpElement.style.display = "block";

            // Initialise the splits table
            this.nextSplitIdx = 0;
            this.nextSplitIsClose = false;
            this.calcEstimates();
            for (var i = 0; i < this.originalSplits.length; i++) {
                this.splits[i].time = 0.0;
                this.splits[i].isGood = false;
            }
            this.buildSplitsTable();

            // Start the tick callback
            this.interval = window.setInterval(function () { stopwatch.tick(); }, 25);
            this.setSplitRowClass(0, "next");

            if(!isClickEvent)
            {
                window.setTimeout(function () { stopwatch.start(true); }, 300);
            }
        }
        if (isClickEvent)
        {
            this.startElement.style.display = "none";
            this.stopElement.style.display = "block";
            this.lapInactiveElement.style.display = "block";
            activateWakeLock();

        }
    },

    setSplitRowClass(idx, className) {
        var split = this.splits[idx];
        var el = split.rowElement;
        el.className = className;
    },

    writeSplitToTable(idx) {
        var split = this.splits[idx];
        if (split.time != 0.0)
        {
            if (split.isGood)
            {
                var el = split.element;
                el.innerHTML = raceTimeToString(split.time);
                var interval = split.time;
                var originalInterval = this.originalSplits[idx];
                if (idx > 0) {
                    interval = split.time - this.splits[idx - 1].time;
                    originalInterval -= this.originalSplits[idx - 1];
                }
                el = el.nextSibling;
                el.innerHTML = raceTimeToString(interval);
                if (interval < originalInterval) {
                    el.className = "up";
                }
                else {
                    el.className = "down";
                }
                var delta = split.time - this.originalSplits[idx];
                el = el.nextSibling;
                el.innerHTML = delta.toFixed(2).toString();
                if (delta <= 0) {
                    this.setSplitRowClass(idx, "up");
                }
                else {
                    this.setSplitRowClass(idx, "down");
                }
            }
            else
            {
                this.setSplitRowClass(idx, "");
            }
        }
        else
        {
            if (this.startTimeMS && (idx == this.nextSplitIdx))
            {
                this.setSplitRowClass(idx, "next");
            }
            else
            {
                this.setSplitRowClass(idx, "");
            }
        }
    },

    getInterval: function(idx) {
        if(idx > 0)
        {
            return this.splits[idx].time - this.splits[idx-1].time;
        }
        else
        {
            return this.splits[0].time;
        }
    },

    getOriginalInterval: function(idx) {
        if(idx > 0)
        {
            return this.originalSplits[idx] - this.originalSplits[idx-1];
        }
        else
        {
            return this.originalSplits[0];
        }
    },

    updateProjection: function() {
        this.projectedFinishTime = null;
        if(this.startTimeMS && (this.nextSplitIdx > 1))
        {
            // The previous two splits *must* be good
            var minGoodSplits = 2;
            var numIdealSplitsToAverage = 3;

            var cumulativeGoodDeltas = 0.0;
            var numGoodDeltas = 0;
            var lastKnownSplitIdx = this.nextSplitIdx - 1;
            var allGood = true;
            for (var i = 0; i < numIdealSplitsToAverage; i++)
            {
                var splitIdx = lastKnownSplitIdx - i;
                if(splitIdx < 0)
                {
                    break;
                }
                if(!this.splits[splitIdx].isGood && (i < minGoodSplits))
                {
                    allGood = false;
                    break;
                }
                if(this.splits[splitIdx].isGood)
                {
                    var delta = this.getInterval(splitIdx) - this.getOriginalInterval(splitIdx);
                    cumulativeGoodDeltas += delta;
                    numGoodDeltas++;
                }
            }
            if (allGood)
            {
                var averageRecentDelta = cumulativeGoodDeltas / numGoodDeltas;
                // Assume this delta will continue
                var finalSplitIdx = this.originalSplits.length - 1;
                var numSplitsRemaining = finalSplitIdx - lastKnownSplitIdx;

                var finishTimeAtOriginalPace = this.splits[lastKnownSplitIdx].time + this.originalSplits[finalSplitIdx] - this.originalSplits[lastKnownSplitIdx];
                this.projectedFinishDelta = averageRecentDelta * numSplitsRemaining;
                this.projectedFinishTime = finishTimeAtOriginalPace + this.projectedFinishDelta;
            }
        }
        if (this.projectedFinishTime)
        {
            var el = this.projectionElement;
            el = el.firstChild.firstChild.firstChild.firstChild.nextSibling; // table, tbody, tr, td - td
            el.innerHTML = raceTimeToString(this.projectedFinishTime);
            setElementDeltaClass(el, this.projectedFinishDelta);

            el = el.nextSibling;
            el.innerHTML = this.projectedFinishDelta.toFixed(2).toString();
            setElementDeltaClass(el, this.projectedFinishDelta);

            this.projectionElement.style.display = "block";
        }
        else
        {
            this.projectionElement.style.display = "none";
        }
    },

    calcEstimates: function() {
        // Find the most recent good split
        var bestSplitIdx = null;
        for (var i = (this.nextSplitIdx - 1) ; i >= 0; i--)
        {
            if(this.splits[i].isGood)
            {
                bestSplitIdx = i;
                break;
            }
        }
        if (bestSplitIdx != null)
        {
            var thisInterval;
            var originalInterval;
            if(bestSplitIdx == 0)
            {
                thisInterval = this.splits[bestSplitIdx].time;
                originalInterval = this.originalSplits[bestSplitIdx];
            }
            else
            {
                thisInterval = this.splits[bestSplitIdx].time - this.splits[bestSplitIdx-1].time;
                originalInterval = this.originalSplits[bestSplitIdx] - this.originalSplits[bestSplitIdx-1];
            }
            var delta = thisInterval - originalInterval;

            // Assume we can apply this delta from the original intervals up to the current split
            var nextSplitTimeAtOriginalPace = this.splits[bestSplitIdx].time + this.originalSplits[this.nextSplitIdx] - this.originalSplits[bestSplitIdx];
            var numSplitsToGuess = this.nextSplitIdx - bestSplitIdx;
            var deltaMultiplier = numSplitsToGuess;
            if (deltaMultiplier > 3)
            {
                deltaMultiplier = 3;
            }
            this.expectedNextSplitTime = nextSplitTimeAtOriginalPace + (delta * deltaMultiplier);
            this.earliestNextSplitTime = nextSplitTimeAtOriginalPace + (this.bestPossibleDelta * deltaMultiplier);
            this.latestNextSplitTime = nextSplitTimeAtOriginalPace + (this.worstLikelyDelta * deltaMultiplier);

            console.log( "Delta: " + delta + ", NumSplitsToGuess: " + numSplitsToGuess + ", ExpectedNextSplitTime: ", this.expectedNextSplitTime)
        }
        else
        {
            // Just go off the previous race
            var deltaMultiplier = this.nextSplitIdx + 1;
            if (deltaMultiplier > 3) {
                deltaMultiplier = 3;
            }
            this.expectedNextSplitTime = this.originalSplits[this.nextSplitIdx];
            this.earliestNextSplitTime = this.originalSplits[this.nextSplitIdx] + (this.bestPossibleDelta * deltaMultiplier);
            this.latestNextSplitTime = this.originalSplits[this.nextSplitIdx] + (this.worstLikelyDelta * deltaMultiplier);
        }
        this.updateProjection();
    },

    markSplitTime: function(isGood) {
        var idx = this.nextSplitIdx;
        if (isGood)
        {
            this.splits[idx].time = ((new Date().getTime()) - this.startTimeMS) * 0.001;
        }
        else
        {
            this.splits[idx].time = this.expectedNextSplitTime;
        }
        this.splits[idx].isGood = isGood;
        this.writeSplitToTable(idx);
        this.nextSplitIdx++;
    },

    lap: function (isGood) {
        if (this.clickPrimed) {
            this.markSplitTime(isGood);
            this.lapElement.style.display = "none";
            this.lapInactiveElement.style.display = "block";
            this.finishElement.style.display = "none";
            this.nextSplitIsClose = false;
            this.clickPrimed = false;
            if (this.nextSplitIdx == this.originalSplits.length) {
                this.stop();
                this.buttonContainerElement.style.display = "none";
            }
            else {
                this.setSplitRowClass(this.nextSplitIdx, "next");
                this.calcEstimates();
            }
        }
    },

    stop: function() {
        this.nudgeDownElement.style.display = "none";
        this.nudgeUpElement.style.display = "none";
        this.lapElement.style.display = "none";
        this.lapInactiveElement.style.display = "none";
        this.finishElement.style.display = "none";
        this.stopElement.style.display = "none";
        this.projectionElement.style.display = "none";
        window.clearInterval(this.interval);
        if (wakeLockEnabled)
        {
            noSleep.disable(); // let the screen turn off.
            wakeLockEnabled = false;
            console.log("Wake Lock Disabled");
        }
        this.startTimeMS = null;
        this.clickPrimed = true;
    },

    stopCheck: function() {
        if(confirm('Are you sure you want to stop the stopwatch?'))
        {
            this.stop();
            this.startElement.style.display = "block";
        }
    },

    tick: function() {
        this.time = ((new Date().getTime()) - this.startTimeMS) * 0.001;
        this.timeElement.innerHTML = raceTimeToString(this.time);

        if (this.nextSplitIsClose)
        {
            if (this.time > this.latestNextSplitTime)
            {
                // I think we've missed the split
                this.lap(false);
            }
        }
        else
        {
            if (this.time > this.earliestNextSplitTime)
            {
                this.lapInactiveElement.style.display = "none";
                this.nextSplitIsClose = true;
                this.clickPrimed = true;
                if (this.nextSplitIdx == (this.originalSplits.length - 1)) {
                    this.finishElement.style.display = "block";
                }
                else {
                    this.lapElement.style.display = "block";
                }
            }

        }
    },

    resize: function () {
        if (getFullscreenElement())
        {
            // Set the height of the stopwatch-splits element to fill the remaining part of the screen
            //var height = window.innerHeight - this.splitsElement.offsetTop;
            //this.splitsElement.style.height = height.toString() + "px";
            //console.log('Resized: ' + this.splitsElement.style.height + ', ' + height);
        }
        else
        {
            // We're not in full-screen mode any more.
            closeStopwatch();
        }
    }
}

function openStopwatch()
{
    if (stopwatchRequestFullscreen)
    {
        stopwatchRequestFullscreen.call(stopwatchElement);
        stopwatchElement.style.width = "100%";
        stopwatchElement.style.height = "100%";
    }
}

function closeStopwatch()
{
    if (stopwatch)
    {
        stopwatch.cleanup();
    }
    if (getFullscreenElement() && stopwatchExitFullscreen)
    {
        stopwatchExitFullscreen.call(stopwatchElement);
    }
    stopwatchElement.style.display = "none";
    if (wakeLockEnabled) {
        noSleep.disable(); // let the screen turn off.
        wakeLockEnabled = false;
        console.log("Wake Lock Disabled");
    }
}


function createStopwatch(asaNumber, swimIdx)
{
    openStopwatch();
    if (stopwatch)
    {
        if((stopwatch.asaNumber != asaNumber) || (stopwatch.swimIdx != swimIdx))
        {
            stopwatch = null;
        }
        else
        {
            // The existing stopwatch is fine.
            // Should it be running?
            if (stopwatch.startTimeMS)
            {
                // Start the tick callback
                stopwatch.interval = window.setInterval(function () { stopwatch.tick(); }, 25);
            }
        }
    }
    if (!stopwatch)
    {
        stopwatch = new Stopwatch(asaNumber, swimIdx);
    }
    stopwatchElement.style.display = "block";
}

$(document).ready(function () {
    stopwatchElement = document.getElementById("stopwatch");
    stopwatchRequestFullscreen = stopwatchElement.requestFullscreen || stopwatchElement.msRequestFullscreen || stopwatchElement.mozRequestFullScreen || stopwatchElement.webkitRequestFullscreen;
    stopwatchExitFullscreen = stopwatchElement.exitFullscreen || stopwatchElement.msExitFullscreen || stopwatchElement.mozExitFullScreen || stopwatchElement.webkitExitFullscreen;
})

$(window).resize(function() {
    if(stopwatch)
    {
        stopwatch.resize();
    }
})
