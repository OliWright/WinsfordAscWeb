// Winsford ASC Google AppEngine App
//   events.js
//   Really simple JavaScript event system.
//   Code can add or remove event handlers, and 'broadcast' events
//   which calls all associated event handlers.
//
// Copyright (C) 2014 Oliver Wright
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

eventListeners = new Array();

function addListener( message, fn )
{
	for (var i=0;i<eventListeners.length; i++)
	{
		if ( eventListeners[i].fn == fn)
			return false;
	}
	listener = {fn:fn, message:message};
	eventListeners.push( listener );
	return true;
}

function removeListener( fn )
{
	for (var i=0;i<eventListeners.length; i++)
	{
		if ( eventListeners[i].fn == fn)
		{
			eventListeners.splice(i,1);
			return true;
		}
	}
	return false;
}

function broadcast( message )
{
	for (var i=0;i<eventListeners.length; i++)
	{
		if ( eventListeners[i].message == message)
		{
			eventListeners[i].fn();
		}
	}
}

// The one and only window.onload. All other scripts should listen for events (like "onLoad")
window.onload = function ()
{
	broadcast( "onLoad" );
}

window.onpopstate = function ()
{
	broadcast( "onPopState" );
}
