// Winsford ASC Website
//
//   time-conversion.js
//
// Provides functions for converting times between long and short course using
// the ASA equivalent time conversion algorithm.
//
// Feel free to use this code in your own website, but please credit us.
//
// Copyright (C) 2015 Oliver Wright
//    oli.wright.github@gmail.com
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


// Notes on the conversion of swim times between 25m and 50m pools
//
// This is taken from https://www.swimmingresults.org/EqvtShare/algorithm.php which tries
// and fails to describe the ASA conversion algorithm.
//
//    Converted Time  = T50 * PoolMeasure – TurnVal * (NumTurnPH – 1)
// Where
//    T50             = Time in a 50m pool
//    PoolMeasure     = Ratio of race distance compared to equivalent distance in a 50m pool.
//                      This is used to convert between events in non-standard length pools.
//                      For our purposes we're only interested in converting between 25m and
//                      50m pools, so there is no difference in the race distance, so we can
//                      take this as 1 and so effectively ignore it.
//    TurnVal         = Time per turn. The time in seconds attributed to execution of a single turn.
//                    = TurnFactor / T50
//    NumTurnPH       = Number of turns per 100m in the length of pool we're converting to.
//
// So far so good.   Unfortunately, reading through the document and trying to follow it,
// we realise there are mistakes and contradictions...
//    (Switching now to lowerCamelCase naming to match my coding style)
//
// turnVal is supposed to be the time [gained] per turn.  But the turnFactor values provided
// in the table look to be normalised per 100m, so it should be....
//    timeGainPerTurn = (raceDistance / 100) * turnFactor / t50
// This is what is used later in the document anyway, and the results match the tables.
//
// If NumTurnsPH is supposed to be the number of turns per 100m in the pool we're converting
// to, then you'd think reasonably that the value would be 4 for a 25m pool.  (If you swam
// indefinitely then every 100m you'd make 4 turns).
// But actually it should be the number of turns in a 100m *race* in the pool we're converting
// to, which is 3 for a 25m pool.
// But more fundamentally, we're actually interested in the number of *additional* turns
// made over the whole race, compared to the same race in a 50m pool.
//    numExtraTurns25 = The number of additional turns in a 25m pool versus the same race in
//                      a 50m pool
//                    = raceDistance / 50         (Think about it)
//
// So this is the actual conversion from a 50m time to a 25m time.
//                t25 = t50 - (timeGainPerTurn * numExtraTurns25)
//
// This makes a lot more sense.
//
// Expanding and re-arranging...
//                t25 = t50 - (((raceDistance / 100) * turnFactor / t50) * (raceDistance / 50))
//                    = t50 - (raceDistance^2 * turnFactor * (1/5000) / t50)
//
// That's straight-forward then to convert from 50m to 25m.  When we try to re-arrange to
// convert from 25m to 50m we realise it's a quadratic...
//
//                t25 = t50 - (raceDistance^2 * turnFactor * (1/5000) / t50)
//        (t25 * t50) = t50^2 - (raceDistance^2 * turnFactor * (1/5000))
//                  0 = t50^2 - (t25 * t50) - (raceDistance^2 * turnFactor * (1/5000))
//
// Remembering to solve a quadratic of the form    a * x^2 + b * x + c = 0
//                                       we use    x = (-b +- sqrt(b^2 - 4 * a * c)) / (2 * a)
// For our quadratic
//                  a = 1
//                  b = -t25
//                  c = -(raceDistance^2 * turnFactor * (1/5000))
// so
//                t50 = (-b + sqrt(b^2 - 4 * a * c)) / (2 * a)
//                          ^--------------the solution we want has the '+' here.
//                    = (-b + sqrt(b^2 - 4 * c)) / 2
//                    = (t25 + sqrt(t25^2 - 4 * c)) / 2
//                    = (t25 + sqrt(t25^2 + (raceDistance^2 * turnFactor * (4/5000)))) / 2

// Helper function to work around floating point precision issues when dealing
// with equality of times that have had some arithmetic operations
var EPSILON_ = 0.001;
function convertTimeToIntegerHundredths( timeInSeconds )
{
    return Math.floor( (timeInSeconds * 100) + EPSILON_ );
}

// Helper class to store details about an event.
var Event = function (distance, stroke, turnFactor, asaTableSteps) {
    this.distance = parseInt(distance);
    this.stroke = stroke;
    this.turnFactor = turnFactor;

    // We include information to allow accurate reconstruction of the ASA Swimming
    // Performance Tables available from
    //   http://www.swimming.org/britishswimming/swimming/running-swimming-competitions/information-on-running-swimming-competitions/2547
    // These tables are indexed by long course time and all conversions appear
    // to be rounded to 1/10s.
    // The intervals of the long course times is not fixed however, so to be able
    // to accurately recreate the tables we need to know what the step interval
    // is at any given long course time.
    // So we provide this constructor with an array of objects listing the time
    // at which a new step interval starts, and what that new step interval is.
    // A step interval of 0 denotes that the table finishes at that time.
    // E.g. [ {time:"22.1", step:0.1}, {time:"39.0", step:0.2}, {time:"45.0", step:0} ]
    // This says that the table starts at 22.1s, with a step of 0.1s.  Then at 39.0s
    // the step changes to 0.2s, then the table stops at 45.0s.
    this.asaTableSteps = asaTableSteps;
    this.numAsaTableSteps = this.asaTableSteps.length;
    this.asaTableSteps.forEach(function (step) {
        var fields = step.time.split(":");
        if (fields.length > 2) {
            alert("Broken ASA table steps in time-conversion.js");
        }
        else if (fields.length == 2) {
            step.time = (parseFloat(fields[0]) * 60) + parseFloat(fields[1]);
        }
        else {
            step.time = parseFloat(fields[0]);
        }
        step.timeInHundredths = convertTimeToIntegerHundredths(step.time);
    });

    // Returns a string of the form '50 Free'
    this.toString = function () { return this.distance.toString() + " " + this.stroke; }

    // When given a long course time in seconds, returns
    // the step size (in seconds) that the ASA Swimming Performance Tables use
    this.getAsaTableStep = function (longCourseTime) {
        var step = 0;
        var timeInHundredths = convertTimeToIntegerHundredths(longCourseTime);
        for (var i = 0; i < this.numAsaTableSteps; ++i) {
            if (this.asaTableSteps[i].timeInHundredths > timeInHundredths) {
                break;
            }
            step = this.asaTableSteps[i].step;
        }
        return step;
    }
}

// List of all swimming events.
var swimEvents =
[
	new Event( 50, "Free", 42.245, [ {time:"22.1", step:0.1}, {time:"39.0", step:0.2}, {time:"45.0", step:0} ] ),
	new Event( 100, "Free", 42.245, [ {time:"48.8", step:0.1}, {time:"1:02.5", step:0.5}, {time:"1:20.0", step:1}, {time:"1:39.0", step:0} ] ),
	new Event( 200, "Free", 43.786, [ {time:"1:47.0", step:0.2}, {time:"2:14.0", step:0.5}, {time:"2:46.0", step:1}, {time:"3:36.0", step:0} ] ),
	new Event( 400, "Free", 44.233, [ {time:"3:46.0", step:0.5}, {time:"4:46.0", step:1}, {time:"6:14.0", step:2}, {time:"7:36.0", step:0} ] ),
	new Event( 800, "Free", 45.525, [ {time:"7:50.0", step:1}, {time:"12:05.0", step:5}, {time:"15:45.0", step:0} ] ),
	new Event( 1500, "Free", 46.221, [ {time:"14:55.0", step:1}, {time:"18:05.0", step:0} ] ),
	new Event( 50, "Breast", 63.616, [ {time:"28.1", step:0.1}, {time:"48.0", step:0} ] ),
	new Event( 100, "Breast", 63.616, [ {time:"59.5", step:0.1}, {time:"1:17.5", step:0.5}, {time:"1:40.0", step:1}, {time:"2:04.0", step:0} ] ),
	new Event( 200, "Breast", 66.598, [ {time:"1:54.0", step:0.2}, {time:"2:30.0", step:0.5}, {time:"3:10.0", step:1}, {time:"3:20.0", step:0} ] ),
	new Event( 50, "Fly", 38.269, [ {time:"22.1", step:0.1}, {time:"52.0", step:0} ] ),
	new Event( 100, "Fly", 38.269, [ {time:"53.0", step:0.1}, {time:"1:07.0", step:0.5}, {time:"1:27.0", step:1}, {time:"1:38.0", step:0} ] ),
	new Event( 200, "Fly", 39.76, [ {time:"1:55.0", step:0.2}, {time:"2:26.0", step:0.5}, {time:"3:16.0", step:1}, {time:"4:00.0", step:0} ] ),
	new Event( 50, "Back", 40.5, [ {time:"25.1", step:0.1}, {time:"55.0", step:0} ] ),
	new Event( 100, "Back", 40.5, [ {time:"52.0", step:0.1}, {time:"1:12.5", step:0.5}, {time:"1:35.0", step:1}, {time:"1:54.0", step:0} ] ),
	new Event( 200, "Back", 41.98, [ {time:"1:54.0", step:0.2}, {time:"2:30.0", step:0.5}, {time:"3:10.0", step:1}, {time:"3:20.0", step:0} ] ),
	new Event( 100, "IM", 1, [ {time:"0.0", step:0} ] ), // Provided for completeness of the swimEvents table
	new Event( 200, "IM", 49.7, [ {time:"2:00.0", step:0.2}, {time:"2:32.0", step:0.5}, {time:"3:17.0", step:1}, {time:"4:06.0", step:0} ] ),
	new Event( 400, "IM", 55.366, [ {time:"4:15.0", step:0.5}, {time:"5:15.0", step:1}, {time:"7:50.0", step:2}, {time:"8:38.0", step:0} ] ),
];

var NUM_EVENTS = swimEvents.length;

// Return an event name corresponding to an index.
//     eventIndex:   0 to 16 index of the events in the swimEvents array
//     return value: A string like '50 Free'
function eventName( eventIndex ) { return swimEvents[ eventIndex ].toString(); }

// Return the stroke name of an event.
//     eventIndex:   0 to 16 index of the events in the swimEvents array
//     return value: A string like 'Free'
function eventStroke( eventIndex ) { return swimEvents[eventIndex].stroke;  }

// Return the distance of an event, in metres.
//     eventIndex:   0 to 16 index of the events in the swimEvents array
//     return value: The distance in metres.
function eventDistance( eventIndex ) { return swimEvents[eventIndex].distance;  }

// Parse an event name string and return the event index
//     eventName:    String of the form "50 Free"
//     return value: The corresponding index into the swimEvents array
function eventNameToIndex( eventName )
{
    var tokens = eventName.split( " " );
    var distance = parseInt(tokens[0]);
    // Get the stroke name in exactly the form we use, catering for the likes of "Individual Medley"
    var firstLetter = tokens[1][0].toLowerCase();
    var secondLetter = tokens[1][1].toLowerCase();
    var stroke = "Free";
    if( firstLetter == 'i' ) { stroke = "IM"; }
    else if( secondLetter == 'l' ) { stroke = "Fly"; }
    else if( secondLetter == 'a' ) { stroke = "Back"; }
    else if( firstLetter == 'b' ) { stroke = "Breast"; }
    for( var i = 0; i < NUM_EVENTS; ++i )
    {
        var event = swimEvents[i];
        if( (event.distance == distance) && (event.stroke == stroke) )
        {
            return i;
        }
    }
    alert('Failed to match event name "' + eventName + '" to an actual event.');
}

// Return the long course table interval in seconds.
//     eventIndex:     0 to 16 index of the events in the events array
//     longCourseTime: The long course race time in seconds that we're interested in
//     return value:   If the longCourseTime is within the range of the ASA
//                     Swimming Performance Tables for this event, then the row
//                     interval in seconds is returned.
//                     If it's out or range, 0 is returned.
function getAsaTableStep(eventIndex, longCourseTime) { return swimEvents[eventIndex].getAsaTableStep(longCourseTime); }

function getAsaTableStartLongCourseTime(eventIndex) { return swimEvents[eventIndex].asaTableSteps[0].time; }

// Convert a time achieved in a short course (25m) pool to a long course (50m) time.
//     eventIndex:   0 to 16 index of the events in the events array
//     raceTime:     The race time in seconds of the short course race
//     return value: The converted time in seconds
function convertShortCourseToLongCourse( eventIndex, raceTime )
{
	// See large comment block at the top of this file for an explanation
	// of how the conversions are worked out.

	// t50 = (t25 + sqrt(t25^2 + (raceDistance^2 * turnFactor * (4/5000)))) / 2
	var event = swimEvents[ eventIndex ];
	var raceDistance = event.distance;
	var turnFactor = event.turnFactor;
	return (raceTime + Math.sqrt( (raceTime * raceTime) + (raceDistance * raceDistance * turnFactor * 0.0008))) * 0.5;
}

// Convert a time achieved in a long course (50m) pool to a long course (25m) time.
//     eventIndex:   0 to 16 index of the events in the events array
//     raceTime:     The race time in seconds of the long course race
//     return value: The converted time in seconds
function convertLongCourseToShortCourse( eventIndex, raceTime )
{
	// See large comment block at the top of this file for an explanation
	// of how the conversions are worked out.
	
	// t25 = t50 - (raceDistance^2 * turnFactor * (1/5000) / t50)
	var event = swimEvents[ eventIndex ];
	var raceDistance = event.distance;
	var turnFactor = event.turnFactor;
	return raceTime - (raceDistance * raceDistance * turnFactor * 0.0002 / raceTime );
}

// Convert a time achieved in a short course (25m) pool to a long course (50m) time.
//     eventIndex:   0 to 16 index of the events in the events array
//     splitTime:    The race time in seconds of the short course split
//     distance:     The race distance of the split
//     return value: The converted time in seconds
function convertSplitShortCourseToLongCourse( eventIndex, splitTime, distance )
{
	// See large comment block at the top of this file for an explanation
	// of how the conversions are worked out.

	// t50 = (t25 + sqrt(t25^2 + (raceDistance^2 * turnFactor * (4/5000)))) / 2
	var event = swimEvents[ eventIndex ];
	var turnFactor = event.turnFactor;
	return (splitTime + Math.sqrt( (splitTime * splitTime) + (distance * distance * turnFactor * 0.0008))) * 0.5;
}

// Convert a time achieved in a long course (50m) pool to a long course (25m) time.
//     eventIndex:   0 to 16 index of the events in the events array
//     splitTime:    The race time in seconds of the long course split
//     distance:     The race distance of the split
//     return value: The converted time in seconds
function convertSplitLongCourseToShortCourse( eventIndex, splitTime, distance )
{
	// See large comment block at the top of this file for an explanation
	// of how the conversions are worked out.
	
	// t25 = t50 - (raceDistance^2 * turnFactor * (1/5000) / t50)
	var event = swimEvents[ eventIndex ];
	var turnFactor = event.turnFactor;
	return splitTime - (distance * distance * turnFactor * 0.0002 / splitTime );
}
