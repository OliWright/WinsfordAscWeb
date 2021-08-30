// Winsford ASC Website
//
//   swim-data.js
//
// AJAX based swim data presentation.
//
// Feel free to use this code in your own website, but please credit us.
//
// Copyright (C) 2016 Oliver Wright
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

var dataWrapperElement;
var disclaimerElement;
var conversionModeElement;
var dateControlsElement;
var swimmerIndexXML;
var asaNumberToSwimmer = {};
var allSwimmers = [];
var asaNumberToFullyLoadedSwimmer = {};
var swimmersOfInterest = [];
var gsNameSpace = "http://schemas.google.com/spreadsheets/2006/extended";
var conversionMode = 0; // 0 : Short, 1: Long, 2: Both
var originalCourseName = "long"; // For tooltip showing 'converted from...'
var pageTitleElement;
var pbArgs = {};

//
// Swimmer Object
//

function Swimmer( swimmerXmlElement ) {
	this.asaNumber = parseInt(swimmerXmlElement.getElementsByTagName("asaNumber")[0].textContent);
	this.firstName = swimmerXmlElement.getElementsByTagName("firstName")[0].textContent;
	this.knownAs = swimmerXmlElement.getElementsByTagName("knownAs")[0].textContent;
	this.lastName = swimmerXmlElement.getElementsByTagName("lastName")[0].textContent;
	this.gender = swimmerXmlElement.getElementsByTagName("gender")[0].textContent;
	var dateOfBirthStr = swimmerXmlElement.getElementsByTagName("dateOfBirth")[0].textContent;
	if( dateOfBirthStr.length )
	{
		this.dateOfBirth = parseDate(dateOfBirthStr);
	}
	this.splitsDisplaySwim = null;
	this.fullName = this.knownAs + ' ' + this.lastName;
	this.pbsOpen = false;
	this.historyEventCode = null;
	this.historyMode = 0; // 0 : Table, 1 : Graph
}

Swimmer.prototype = {
	constructor: Swimmer,

	// Get a swimmer's personal bests as an array of swims indexed by event index.
	// Optionally pass an args object to filter by course and date.
	//	 args.earliestDate  : Earliest date for a swim to be considered
	//	 args.latestDate	: Latest date for a swim to be considered
	//	 args.courseCode	: "L" or "S"
	getPersonalBests: function (args) {
		var personalBests = [];
		var numSwims = this.swims.length;
		var onlyLongCourse = false;
		var onlyShortCourse = false;
		var earliestDate;
		var latestDate;
		if (args !== undefined) {
			if (args.courseCode !== undefined) {
				if (args.courseCode == "L") {
					onlyLongCourse = true;
				}
				else if (args.courseCode == "S") {
					onlyShortCourse = true;
				}
			}
			earliestDate = args.earliestDate;
			latestDate = args.latestDate;
		}

		for (var i = 0; i < numSwims; ++i) {
			var swim = this.swims[i];

			// Does it meet the filter criteria
			if ((earliestDate !== undefined) && (swim.date < earliestDate)) { continue; }
			if ((latestDate !== undefined) && (swim.date > latestDate)) { continue; }
			if (swim.isLongCourse()) {
				if (onlyShortCourse) { continue; }
			}
			else {
				if (onlyLongCourse) { continue; }
			}

			if (personalBests[swim.eventIdx] === undefined) {
				// First swim of this event
				personalBests[swim.eventIdx] = swim;
			}
			else if (swim.scRaceTime < personalBests[swim.eventIdx].scRaceTime) {
				personalBests[swim.eventIdx] = swim;
			}
		}
		return personalBests;
	},

	updateElements: function () {
	    this.headingElement = document.getElementById("head_" + this.asaNumber);
	    this.pbsElement = document.getElementById("pbs_" + this.asaNumber);
	    this.historyElement = document.getElementById("history_" + this.asaNumber);
	    this.historyDataElement = null;
	    this.historyDataElement2 = null;
	    this.splitsElement = document.getElementById("splits_" + this.asaNumber);
	},

	getSmallHeadingHtml: function () {
	    return '<p onclick="togglePBs(' + this.asaNumber + ')">' + this.firstName + ' ' + this.lastName + '</p>';
	},

	getBigHeadingHtml: function () {
	    var html = '';
	    html += '<h3><span onclick="togglePBs(' + this.asaNumber + ')">' + this.firstName + ' ' + this.lastName + '</span>';
	    html += ' <a href=https://www.swimmingresults.org/individualbest/personal_best.php?mode=A&tiref=' + this.asaNumber + ' target="_blank">(SwimEngland#: ' + this.asaNumber + ')</a>';
	    html += '</h3>';
	    return html;
	}
};

//
// Swim Object
//

function Swim( swimSheetRow ) {
	var eventName = swimSheetRow[1];
	this.eventIdx = eventNameToIndex(eventName);
	this.date = parseDate(swimSheetRow[0]);
	this.courseCode = eventName[eventName.length - 2];
	this.meet = swimSheetRow[2];
	this.raceTime = parseFloat(swimSheetRow[4]);
	this.toolTip = null;
	if( this.courseCode == 'L' )
	{
		this.lcRaceTime = this.raceTime;
		this.scRaceTime = round(convertLongCourseToShortCourse(this.eventIdx, this.raceTime), 0.1);
	}
	else
	{
		this.scRaceTime = this.raceTime;
		this.lcRaceTime = round( convertShortCourseToLongCourse(this.eventIdx, this.raceTime), 0.1 );
	}
	this.scSplits = [];
	this.lcSplits = [];
	var splits;
	if (swimSheetRow.length > 5) {
		splits = swimSheetRow[5].split(",");
	}
	else {
		splits = [];
    }
	if(splits.length > 1)
	{
		var intervalDistance = eventDistance(this.eventIdx) / splits.length;
		var distance = 0;
		for(var i = 0; i < splits.length; i++)
		{
			distance += intervalDistance;
			var split = parseFloat(splits[i]);
			if( this.courseCode == 'L' )
			{
				this.lcSplits.push(split);
				this.scSplits.push(round(convertSplitLongCourseToShortCourse(this.eventIdx, split, distance), 0.1));
			}
			else
			{
				this.scSplits.push(split);
				this.lcSplits.push(round(convertSplitShortCourseToLongCourse(this.eventIdx, split, distance), 0.1));
			}
		}
	}
}

Swim.prototype = {
	constructor: Swim,
	isLongCourse: function() { return this.courseCode == 'L'; },
	hasSplits: function () { return this.scSplits.length > 0; },

	getHtmlForTableRow: function(swimmer, includeEvent)
	{
	    var html = '';
	    var raceTime;
	    var tooltip = '';
	    var precision = 2;
	    var convertedSuffix = '';
	    var courseCode = '';
	    switch (conversionMode) {
	        case 0:
	            raceTime = this.scRaceTime;
	            break;
	        case 1:
	            raceTime = this.lcRaceTime;
	            break;
	        case 2:
	            raceTime = this.raceTime;
	            courseCode = ' ' + this.courseCode + 'C';
	            tooltip = 'title="Converted to ';
	            if (this.isLongCourse()) {
	                tooltip += 'short course: ' + raceTimeToString(this.scRaceTime, 1);
	            }
	            else {
	                tooltip += 'long course: ' + raceTimeToString(this.lcRaceTime, 1);
	            }
	            tooltip += '"';
	            break;
	    }
	    if (raceTime != this.raceTime) {
	        tooltip = 'title="Original ' + originalCourseName + ' course time: ' + raceTimeToString(this.raceTime) + '"';
	        precision = 1;
	        convertedSuffix = '<sup>*</sup>';
	    }
	    html += '<tr class="' + eventStroke(this.eventIdx).toLowerCase() + '">';
	    if (includeEvent)
	    {
	        html += '<td onclick="toggleHistory(asaNumber=' + swimmer.asaNumber + ', eventCode=' + this.eventIdx + ')">' + eventName(this.eventIdx) + courseCode + '</td>';
	    }
	    var onclick = "";
	    if (this.hasSplits()) {
	        onclick = 'onclick="toggleSplits(asaNumber=' + swimmer.asaNumber + ', swim=' + this.idx + ')"';
	    }
	    html += '<td ' + tooltip + onclick + '>' + raceTimeToString(raceTime, precision) + convertedSuffix + '</td>';
	    html += '<td>' + formatDateDDMMYYYY(this.date) + '</td>';
	    html += '<td>' + this.meet + '</td>';
	    html += '</tr>';
	    return html;
	},

	requiresConversion: function()
	{
	    switch (conversionMode) {
	        case 0:
	            if (this.isLongCourse()) { return true; }
	            break;
	        case 1:
	            if (!this.isLongCourse()) { return true; }
	            break;
	    }
	    return false;
	},

	getTooltip: function()
	{
	    if (this.toolTip == null) {
	        this.toolTip = this.date.toLocaleDateString() + ' ' + this.meet + '<br/>';
	        if (this.courseCode == 'L') {
	            this.toolTip += 'Original LC Time: ' + raceTimeToString(this.lcRaceTime) + '<br/>';
	            this.toolTip += 'Converted SC Time: ' + raceTimeToString(this.scRaceTime);
	        }
	        else {
	            this.toolTip += 'Original SC Time: ' + raceTimeToString(this.scRaceTime) + '<br/>';
	            this.toolTip += 'Converted LC Time: ' + raceTimeToString(this.lcRaceTime);
	        }
	    }
        return this.toolTip;
    }

};

function makePBsTable( swimmer )
{
	$(disclaimerElement).show();
	$(conversionModeElement).show();
	$(dateControlsElement).show();
	
	var html = '';
	html += '<table>';
	html += '<thead><tr><th style="min-width: 7em;">Event</th><th style="min-width: 5em;">Time</th><th style="min-width: 6em;">Date</th><th style="min-width: 25em;">Meet</th></thead>';
	html += '<tbody>';

	var personalBests;
	var personalBestsLC;
	switch( conversionMode )
	{
		case 0:
		case 1:
			pbArgs.courseCode = "";
			personalBests = swimmer.getPersonalBests( pbArgs );
			break;
		case 2:
			pbArgs.courseCode = "S";
			personalBests = swimmer.getPersonalBests( pbArgs );
			pbArgs.courseCode = "L";
			personalBestsLC = swimmer.getPersonalBests( pbArgs );
			break;
	}
	var anyConversions = false;
	for (var j = 0; j < NUM_EVENTS; ++j )
	{
		function row(swim)
		{
			if( swim !== undefined )
			{
			    anyConversions |= swim.requiresConversion();
			    html += swim.getHtmlForTableRow(swimmer, includeEvent = true);
			}
		}
		row(personalBests[j]);
		if( conversionMode == 2 )
		{
			row(personalBestsLC[j]);
		}
	}
	html += '</tbody>';
	html += '</table>';
	if( anyConversions )
	{
		html += '<p><sup>*</sup>Converted from ' + originalCourseName + ' course.</p>';
	}
	swimmer.pbsElement.innerHTML = html;
}

function buildAllPBsTables()
{
	count = swimmersOfInterest.length;
	for (var i = 0; i < count; ++i) {
		var swimmer = swimmersOfInterest[i];
		if( swimmer.hasOwnProperty("swims") )
		{
			makePBsTable(swimmer);
		}
	}
}

function setConversionMode( element )
{
	var mode = parseInt(element.value );
	if( conversionMode != mode )
	{
		// Change of mode
	    conversionMode = mode;
	    if (conversionMode == 0) {
	        originalCourseName = "long";
	    } else {
	        originalCourseName = "short";
	    }
		// Rebuild all tables
		buildAllPBsTables();
		for (var i = 0; i < count; ++i) {
		    var swimmer = swimmersOfInterest[i];
		    if (swimmer.historyEventCode != null)
		    {
		        showHistory(swimmer, swimmer.historyEventCode);
		    }
			if( swimmer.splitsDisplaySwim != null )
			{
				showSplits( swimmer, swimmer.splitsDisplaySwim.idx );
			}
		}
	}
}

function dateRangeChanged()
{
	pbArgs.earliestDate = document.getElementById("earliest-date").valueAsDate;
	pbArgs.latestDate = document.getElementById("latest-date").valueAsDate;

	buildAllPBsTables();
}

function togglePBs( asaNumber )
{
    var swimmer = asaNumberToSwimmer[asaNumber];
    if (swimmer.pbsOpen) {
        swimmer.pbsElement.innerHTML = '';
        swimmer.splitsElement.innerHTML = '';
        swimmer.pbsOpen = false;
        if (showAllMembers) {
            swimmer.headingElement.innerHTML = swimmer.getSmallHeadingHtml();
        }
    }
    else {
        if (showAllMembers) {
            swimmer.headingElement.innerHTML = swimmer.getBigHeadingHtml();
        }
        loadSwimsForSwimmer(swimmer);
    }
}

function toggleSplits( asaNumber, swimIdx )
{
    var swimmer = asaNumberToSwimmer[asaNumber];
    if( (swimmer.splitsDisplaySwim != null) && (swimmer.splitsDisplaySwim.idx == swimIdx) )
    {
        // Hide the splits
        swimmer.splitsElement.innerHTML = "";
        swimmer.splitsDisplaySwim = null;
    }
    else
    {
        showSplits(swimmer, swimIdx);
        if (!isScrolledIntoView(swimmer.splitsElement, 200))
        {
            // Use JQuery to scroll the splits element into view
            $('html, body').animate({ scrollTop: $(swimmer.splitsElement).offset().top + 200 - $(window).height() }, 400);
        }
    }
}

function toggleHistory(asaNumber, eventCode)
{
    var swimmer = asaNumberToSwimmer[asaNumber];
    if ((swimmer.historyEventCode != null) && (swimmer.historyEventCode == eventCode))
    {
        // Hide the history
        swimmer.historyElement.innerHTML = "";
        swimmer.historyEventCode = null;
    }
    else
    {
        showHistory(swimmer, eventCode);
        if (!isScrolledIntoView(swimmer.historyElement, 200))
        {
            // Use JQuery to scroll the splits element into view
            $('html, body').animate({ scrollTop: $(swimmer.historyElement).offset().top + 200 - $(window).height() }, 400);
        }
    }
}

function showHistoryHeader(swimmer, eventCode)
{
    var html = '<h4>' + eventName(eventCode) + ' History</h4>';
    html += '<input type="radio" name="history-type-' + swimmer.asaNumber + '" value="0" onclick="setHistoryMode(this, ' + swimmer.asaNumber + ')"';
    if (swimmer.historyMode == 0)
    {
        html += ' checked';
    }
    html += '>Table</input>';
    html += '<input type="radio" name="history-type-' + swimmer.asaNumber + '" value="1" onclick="setHistoryMode(this, ' + swimmer.asaNumber + ')"';
    if (swimmer.historyMode == 1) {
        html += ' checked';
    }
    html += '>Graph</input>';
    if (conversionMode == 2)
    {
        html += '<h5>Short Course</h5>';
    }
    html += '<div id="historyData_' + swimmer.asaNumber + '"></div>';
    if (conversionMode == 2)
    {
        html += '<h5>Long Course</h5>';
    }
    html += '<div id="historyData2_' + swimmer.asaNumber + '"></div>';
    swimmer.historyElement.innerHTML = html;
    swimmer.historyDataElement = document.getElementById('historyData_' + swimmer.asaNumber);
    swimmer.historyDataElement2 = document.getElementById('historyData2_' + swimmer.asaNumber);
}

function showHistory(swimmer, eventCode)
{
    swimmer.historyEventCode = eventCode;
    showHistoryHeader(swimmer, eventCode);
    showHistoryData(swimmer);
}

function setHistoryMode(el, asaNumber)
{
    var swimmer = asaNumberToSwimmer[asaNumber];
    if(el.value != swimmer.historyMode)
    {
        swimmer.historyMode = el.value;
        showHistoryData(swimmer);
    }
}

function showHistoryData(swimmer) {
    function historyForCourse(el, courseCode) {
        var swims = [];

        for (var i = 0; i < swimmer.swims.length; i++) {
            var swim = swimmer.swims[i];
            if (swim.eventIdx == swimmer.historyEventCode) {
                if ((courseCode == null) || (swim.courseCode == courseCode)) {
                    swims.push(swim);
                }
            }
        }
        swims.sort(function (a, b) {
            if (a.date < b.date) { return -1; }
            else if (a.date > b.date) { return 1; }
            return 0;
        });

        if (swimmer.historyMode == 1) {
            // HighCharts chart definition
            var chartDefinition =
            {
                chart:
                {
                    renderTo: el,
                    zoomType: 'x',
                    backgroundColor: null, // Make the graph transparent
                    style:
                    {
                        fontFamily: '"Open Sans", sans-serif',
                        fontSize: '100%'
                    }
                },
                // Orange first
                colors: ['#E68A2E', '#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#2b908f', '#f45b5b', '#91e8e1'],
                title: null, // We put the title in the HTML, so the graph doesn't need to
                xAxis: { type: 'datetime' },
                yAxis:
                {
                    // Data is race time in seconds
                    type: 'linear',
                    title: null,
                    labels:
                    {
                        // Display as race time
                        formatter: function () { return raceTimeToString(this.value); }
                    }
                },
                legend: { enabled: false },
                plotOptions: {
                    spline: {
                        marker: {
                            enabled: true
                        }
                    }
                },
                tooltip: {
                    formatter: function () {
                        // Look-up the index of the data point
                        var dataPoints = this.series.data;
                        var swimIndex = -1;
                        for (var i = 0; i < dataPoints.length; i++) {
                            if (dataPoints[i].x == this.x) {
                                swimIndex = i;
                                break;
                            }
                        }
                        if (swimIndex == -1) {
                            return 'Failed to look-up swim';
                        }
                        else {
                            return swims[swimIndex].getTooltip();
                        }
                    }
                },

                series: [{
                    type: 'spline',
                    name: swimmer.fullName,
                    data: []
                }]
            }

            // Make the data points
            var dataPoints = chartDefinition.series[0].data
            for (var i = 0; i < swims.length; i++) {
                var swim = swims[i];
                var raceTime;
                switch(conversionMode)
                {
                    case 0:
                        raceTime = swim.scRaceTime;
                        break;
                    case 1:
                        raceTime = swim.lcRaceTime;
                        break;
                    case 2:
                        raceTime = swim.raceTime;
                        break;
                }
                var dataPoint = [swim.date.getTime(), raceTime];
                dataPoints.push(dataPoint);
            }

            // Create the chart
            var chart1 = new Highcharts.Chart(chartDefinition);

        }
        else {
            var html = '<table><thead><tr><th>Time</th><th>Date</th><th>Meet</th></tr></thead><tbody>';
            var anyConversions = false;
            for (var i = 0; i < swims.length; i++) {
                var swim = swims[i];
                anyConversions |= swim.requiresConversion();
                html += swim.getHtmlForTableRow(swimmer, includeEvent = false);
            }
            html += '</tbody></table>';
            if (anyConversions) {
                html += '<p><sup>*</sup>Converted from ' + originalCourseName + ' course.</p>';
            }
            el.innerHTML = html;
        }
    }
    switch (conversionMode) {
        case 0:
        case 1:
            historyForCourse(swimmer.historyDataElement, null);
            swimmer.historyDataElement2.innerHTML = '';
            break;
        case 2:
            historyForCourse(swimmer.historyDataElement, 'S');
            historyForCourse(swimmer.historyDataElement2, 'L');
            break;
    }
}

function showSplits(swimmer, swimIdx)
{
	var swim = swimmer.swims[swimIdx];
	swimmer.splitsDisplaySwim = swim;
	var html = '<h4><span onclick="createStopwatch(' + swimmer.asaNumber + ', ' + swimIdx + ')">S</span>plits for ' + eventName(swim.eventIdx) + '</h4>';
	html += '<p>' + formatDateDDMMYYYY( swim.date ) + ' ' + swim.meet + '</p>';
	var classStr = 'class="' + eventStroke(swim.eventIdx).toLowerCase() + '"';
	//html += '<button onclick="createStopwatch(' + swimmer.asaNumber + ', ' + swimIdx + ')">Stopwatch</button>';
	function splitsTable(splits, courseCode)
	{
		if(courseCode == 'L')
		{
			if(swim.isLongCourse())
			{
				html += '<p>Original long-course splits.</p>';
			}
			else
			{
				html += '<p>Converted from short to long course.</p>';
			}
		}
		else
		{
			if(swim.isLongCourse())
			{
			    html += '<p>Converted from long to short course.</p>';
			}
			else
			{
				html += '<p>Original short-course splits.</p>';
			}
		}
		html += '<table><thead><tr><th>Distance</th><th>Time</th><th>Interval</th></tr></thead><tbody>';
		var numSplits = splits.length;
		var intervalDistance = eventDistance(swim.eventIdx) / splits.length;
		var distance = 0;
		var previousSplitTime = 0.0;
		for(var i = 0; i < numSplits; i++)
		{
			distance += intervalDistance;
			var splitTime = splits[i];
			html += '<tr ' + classStr + '><td>' + distance + 'm</td><td>' + raceTimeToString(splitTime) + '</td><td>' + raceTimeToString(splitTime-previousSplitTime) + '</td></tr>';
			previousSplitTime = splitTime;
		}
		html += '</tbody></table>';
	}
	switch( conversionMode )
	{
		case 0:
			splitsTable(swim.scSplits, 'S');
			break;
		case 1:
			splitsTable(swim.lcSplits, 'L');
			break;
		case 2:
			splitsTable(swim.scSplits, 'S');
			splitsTable(swim.lcSplits, 'L');
			break;
	}
	swimmer.splitsElement.innerHTML = html;
}

function buildEmptyHtmlForSwimmer(swimmer) {
    var html = '';
    html += '<div id="head_' + swimmer.asaNumber + '">';
    if (showAllMembers) {
        html += swimmer.getSmallHeadingHtml();
    } else {
        html += swimmer.getBigHeadingHtml();
    }
    html += '</div>';
    html += '<div id="pbs_' + swimmer.asaNumber + '"></div>';
    html += '<div id="history_' + swimmer.asaNumber + '"></div>';
    html += '<div id="splits_' + swimmer.asaNumber + '"></div>';
    return html;
}

function indexHasLoaded()
{
    var html = '';

    html += '<p>';
    html += 'Recent changes by <a href="https://swimmingresults.org">swimmingresults.org</a> mean that our personal bests ';
    html += 'service is not as good as it used to be.';
    html += '</p>';
    html += '<p>';
    html += 'This is because they have introduced a reCAPTCHA (I am not a robot) to prevent sites like ours from automatically obtaining timing data.';
    html += '</p>';
    html += '<p>';
    html += 'Previously, the system was fully automatic, and PBs would appear the day after they appeared on swimmingresults. ';
    html += 'But now there has to be a tedious manual process to get the data updated, so there will be an inevitable delay ';
    html += 'between when results are posted to swimmingresults, and when they appear here.';
    html += '</p>';
    html += '<p>';
    html += 'To visit the swimmingresults page for your swimmers, click on the SwimEngland# next to their name.';
    html += '</p>';
    html += '<p>';
    html += 'We are very sorry for the inconvenience, but this is out of our hands.';
    html += '</p>';

	html += '<div id="conversion-mode-control" style="display: none;">';
	html += '<h4>Conversion Mode</h4>';
	html += '<input type="radio" name="conversion-mode" value="0" onclick="setConversionMode(this)" checked>Convert to Short Course</input><br>';
	html += '<input type="radio" name="conversion-mode" value="1" onclick="setConversionMode(this)">Convert to Long Course</input><br>';
	html += '<input type="radio" name="conversion-mode" value="2" onclick="setConversionMode(this)">Show both</input><br>';
	html += '</div>';

	html += '<div id="date-controls" style="display: none;">';
	html += '<h4>Date Range</h4>';
	html += "<p>This allows you to restrict the PBs shown to a range of dates, which can be useful if you're entering a gala where the qualifying times have to be in a specific window.</p>"
	html += '<input id="earliest-date" type="date" onchange="dateRangeChanged()" value="2000-01-01"></input> to ';
	html += '<input id="latest-date" type="date" onchange="dateRangeChanged()"></input><br>';
	html += '</div>';

	if( showAllMembers == true )
	{
	    html += '<h4>Swimmers</h4>';
	    allSwimmers.sort(function (a, b) {
	        var comp = a.lastName.localeCompare(b.lastName);
	        if(comp == 0)
	        {
	            comp = a.firstName.localeCompare(b.firstName);
	        }
	        return comp;
	    });
		var numSwimmers = allSwimmers.length;
		for (var i = 0; i < numSwimmers; ++i )
		{
			var swimmer = allSwimmers[i];
			html += buildEmptyHtmlForSwimmer(swimmer);
			swimmersOfInterest.push(swimmer);
		}
	}
	else
	{
		// Create divs for each swimmer that we're interested in
		var memberInfo = document.getElementById("member-info").textContent;
		var parser = new DOMParser();
		var memberInfoXml = parser.parseFromString(memberInfo, "application/xml");
		var asaNumberElements = memberInfoXml.getElementsByTagName("asaNumber");
		var count = asaNumberElements.length;
		if( count == 0 )
		{
			html += '<h3>No ASA numbers associated with account</h3>';
			html += '<p>Your Winsford ASC account has no ASA numbers associated with it. ';
			html += 'If you know what they are, then email <a href="mailto:winsford.asc.web@gmail.com">winsford.asc.web@gmail.com</a> ';
			html += "along with dates-of-birth, and we'll get them listed in your account.</p>";
			html += "<p>If you don't know what they are, then go";
			html += ' <a href="https://www.swimmingresults.org/membershipcheck/">here</a> to find them. And then email them to us,';
			html += ' with dates-of-birth.</p>';
        }
		for (var i = 0; i < count; ++i )
		{
			var asaNumber = parseInt(asaNumberElements[i].textContent);
			var swimmer = asaNumberToSwimmer[asaNumber];

			if (swimmer === undefined) {
			    html += '<h3>Failed to look-up ASA number ' + asaNumber + '</h3>';
			    html += '<p>Your Winsford ASC account lists a swimmer with ASA number: ' + asaNumber + '. ';
			    html += "Unfortunately, the internet pixies have failed to get even the name of the swimmer, which isn't great. ";
			    html += "This could be for a number of reasons. It could be that the number is incorrect, or it could be treacle in ";
			    html += 'the wires somewhere. Who knows? If you email <a href="mailto:winsford.asc.web@gmail.com">winsford.asc.web@gmail.com</a> ';
			    html += 'then somebody might be able to help.</p>';
			}
			else
			{
			    html += buildEmptyHtmlForSwimmer(swimmer, asaNumber);
			    swimmersOfInterest.push(swimmer);
			}
		}
	}

	html += '<div id="disclaimer" class="disclaimer" style="display: none;">';
	html += '<p>The data on this page are obtained from a very poor tool provided by Swim England.</p>'
	html += '<p>If you find something wrong, then please email <a href="mailto:winsford.asc.web@gmail.com">winsford.asc.web@gmail.com</a> ';
	html += "and we'll try and fix it.</p>";
	html += '</div>';

	pageTitleElement.innerHTML = "Personal Bests";
	dataWrapperElement.innerHTML = html;

	// Go find those div elements
	count = swimmersOfInterest.length;
	for (var i = 0; i < count; ++i) {
	    var swimmer = swimmersOfInterest[i];
	    swimmer.updateElements();
	    if (!showAllMembers)
	    {
	        loadSwimsForSwimmer(swimmer); // Asynchronous
	    }
    }
	disclaimerElement = document.getElementById('disclaimer');
	conversionModeElement = document.getElementById('conversion-mode-control');
	dateControlsElement = document.getElementById('date-controls');

	// Initialise the date restrictions
	document.getElementById("latest-date").valueAsDate = new Date();

	if(showAllMembers)
	{
	    $(disclaimerElement).show();
	    $(conversionModeElement).show();
	    $(dateControlsElement).show();
	}
}

// Asynchronously load the /data/index and fill in the asaNumberToSwimmer map
function loadswimmerIndexXML()
{
	var request = new XMLHttpRequest();
	request.onload = function (e) {
		var xmlParser = new DOMParser();
		swimmerIndexXML = this.responseXML;

		var swimmers = swimmerIndexXML.getElementsByTagName("swimmer");
		var numSwimmers = swimmers.length;

		// Build an index of ASA number to swimmer
		for (var i = 0; i < numSwimmers; ++i) {
			var swimmer = new Swimmer(swimmers[i]);
			asaNumberToSwimmer[swimmer.asaNumber] = swimmer;
			allSwimmers.push(swimmer);
		}

		indexHasLoaded();
	};
	request.onerror = function (e)
	{
		console.error(this.statusText);
	};	
	request.open( "GET", "/data/index", true );
	request.send();
}

// Asynchronously load the /data/swim-list for a given swimmer and add the swims
// to a 'swims' attribute of the swimmer
function loadSwimsForSwimmer( swimmer )
{
	if( swimmer.pbsOpen )
	{
		// This swimmer is already fully loaded, or on their way to being
		return;
	}
	swimmer.pbsOpen = true;
	if (swimmer.dateOfBirth === undefined) {
	    var html = '';
	    html += "<p>We are unable to display personal bests for " + swimmer.firstName + " because we don't have a date of birth recorded.</p>";
	    html += "<p>In the past, the ASA published dates of birth for all swimmers but they've stopped doing that recently and they now only ";
	    html += "show a year of birth.  We need a date of birth to be able to calculate the age on day for any given swim.</p>";
	    html += '<p>To enable us to provide the personal bests, please email <a href="mailto:winsford.asc.web@gmail.com?subject=Date%20of%20birth%20for%20' + swimmer.firstName + '%20' + swimmer.lastName;
	    html += '&body=ASA%20Number%3A%20' + swimmer.asaNumber + '%0ADate%20of%20Birth%3A%20">winsford.asc.web@gmail.com</a> ';
	    html += 'providing the date of birth and ASA number (' + swimmer.asaNumber + ') for ' + swimmer.firstName + '.</p>';
	    swimmer.pbsElement.innerHTML = html;
	    return;
	}
	//if (swimmer.swimListWorksheet == "") {
	//    // This swimmer doesn't have a worksheet associated with them yet.
	//    // Which probably means they don't have any swims.
	//    swimmer.pbsElement.innerHTML = "No swims listed yet.";
	//    return;
 //   }
	asaNumberToFullyLoadedSwimmer[swimmer.asaNumber] = swimmer;
	swimmer.pbsElement.innerHTML = "Loading...";
	var request = new XMLHttpRequest();
	request.onload = function (e) {
		if(this.responseText == "")
		{
			swimmer.pbsElement.innerHTML = '<p>There was an error loading the PBs. Please try again later.</p>';
		}
		else
		{
			var swimsRawData = JSON.parse(this.responseText);

			var numSwims = swimsRawData.length;
			if (numSwims == 0)
			{
			    swimmer.pbsElement.innerHTML = "No swims listed.";
			}
			else
			{
			    // Build an array of swim objects
			    var swims = [];
			    var idx = 0;
				for (var i = 0; i < numSwims; ++i) {
					var swim = new Swim(swimsRawData[i]);
			        if(swim.raceTime != 0) // Filter swims with bad times.  TODO: Figure out why there are some 0 time swims.
			        {
			            swim.idx = idx;
			            swims.push(swim);
			            idx++;
			        }
			    }
			    swimmer.swims = swims;

			    makePBsTable(swimmer);
			}
		}
	};
	request.onerror = function (e)
	{
		console.error(this.statusText);
	};
	var url = "/data/swim-list?swimenglandnumber=" + swimmer.asaNumber;
	request.open( "GET", url, true );
	request.send();
}

$(document).ready(function () {
	dataWrapperElement = document.getElementById("data-wrapper");
	dataWrapperElement.innerHTML = "Loading...";
	pageTitleElement = document.getElementById("page-title");

	loadswimmerIndexXML(); // Asynchronous
})