// Winsford ASC Website
//
//   helpers.js
//
// Provides miscellaneous helpers used in processing and displaying swim data
//
// Feel free to use this code in your own website, but please credit us.
//
// Copyright (C) 2016 Oliver Wright
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

function raceTimeToString( raceTime, precision )
{
	var minutes = Math.floor( raceTime / 60 );
	if (precision === undefined) precision = 2;
	var str = "";
	if( minutes > 0 )
	{
		var seconds = raceTime - (minutes * 60);
		str += minutes + ":";
		if( seconds < 10 )
		{
			str += "0";
		}
		str += seconds.toFixed(precision);
	}
	else
	{
		str += raceTime.toFixed(precision);
	}
	if (precision == 1)
	{
		// Temporary. Put an extra 0 in when showing to 1 decimal place, so that we can
		// copy and paste into the new entry system without it getting it wrong.
		str += "0";
	}
	return str;
}

// Parse a date of the form mm/dd/yyyy
function parseUSFormatDate( dateStr )
{
    var dateFields = dateStr.split("/");
    return new Date( parseInt( dateFields[2] ), parseInt( dateFields[0] ) - 1, parseInt( dateFields[1] ) );
}

// Parse a date of the form yyyy-mm-dd
function parseSpreadsheetDate( dateStr )
{
    var dateFields = dateStr.split("-");
    return new Date( parseInt( dateFields[0] ), parseInt( dateFields[1] ) - 1, parseInt( dateFields[2] ) );
}

// Parse a date of the form dd/mm/yyyy
function parseDate( dateStr )
{
    var dateFields = dateStr.split("/");
    return new Date( parseInt( dateFields[2] ), parseInt( dateFields[1] ) - 1, parseInt( dateFields[0] ) );
}

function formatDateDDMMYYYY( date )
{
    return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
}

function round(val, toNearest) {
    return Math.floor((val / toNearest) + 0.50001) * toNearest;
}

function isScrolledIntoView(elem, requiredVisiblePixels)
{
    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();
    var elemTop = $(elem).offset().top + requiredVisiblePixels;
    return ((elemTop <= docViewBottom) && (elemTop >= docViewTop));
}