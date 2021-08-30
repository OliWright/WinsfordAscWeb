//
// Lenex 3 parser.
//
// Loads a Lenex 3 file and populates a JS object from it.  That's all.
//
// Usage : 
//     LenexLoad(url, function (loadedLenex) {
//         // This will be called when the lenex file has been loaded.
//         // Do something with loadedLenex
//     };
//
// Take a look at lenex-render.js for something that uses this library
// to actually do something useful.
//
// Oli Wright
//

// Define mostly empty objects constructors.  This needs doing before we declare
// the lenexDefition, because it references object types.
function Meet() {
    // Create lookup dictionaries for results, athletes and heats.
    this.resultsLookup = {};
    this.athletesLookup = {};
    this.heatsLookup = {};
}
function AgeDate() {}
function Session() {}
function Event() {}
function SwimStyle() {}
function AgeGroup() {}
function Ranking() {}
function Club() {}
function Athlete() {}
function Result() {}
function Split() {}
function Entry() {}
function Heat() {
    this.entriesByLane = [];
}

//
// Definition of the Lenex file.
// Describes how the XML should be converted into JS objects.
//
// name                  : The name that will be given to the Javascript object member.  The name will be
//                         suffixed with an 's' when the member is an array.
// outerElementName      : If present, the name of the XML container containing an array of objects.
//                         The existence of this field means this data is an array.
// innerElementName      : The name of the XML element containing this data.
// object                : The JavaScript object type that should be created for this data type.
// stringAttributes      : An array of named XML attributes that should be read as strings.
//                         Each will be added to the JavaScript object as a member variable.
// intAttributes         : An array of named XML attributes that should be read as integers.
//                         Each will be added to the JavaScript object as a member variable.
// identifyingAttributes : List of attributes that should be used when searching for a pre-existing
//                         JavaScript object for this data.
//                         All specified attributes should be equal for the object to be considered a match.
// children              : Recursive array of child descriptions
//
var lenexDefinition = {
    children: [{
        name: 'meet', outerElementName: 'MEETS', innerElementName: 'MEET', object: Meet,
        stringAttributes: ['name', 'city', 'nation'],
        identifyingAttributes: ['name', 'city'],
        children: [{
            name: 'agedate', innerElementName: 'AGEDATE', object: AgeDate,
            stringAttributes: ['value'],
            identifyingAttributes: ['value']
            },{
            name: 'session', outerElementName: 'SESSIONS', innerElementName: 'SESSION', object: Session,
            stringAttributes: ['name', 'course', 'date'], intAttributes: ['number'],
            identifyingAttributes: ['number'],
            children: [{
                name: 'event', outerElementName: 'EVENTS', innerElementName: 'EVENT', object: Event,
                stringAttributes: ['gender', 'round'], intAttributes: ['eventid', 'number', 'order'],
                identifyingAttributes: ['eventid'],
                children: [{
                    name: 'swimstyle', innerElementName: 'SWIMSTYLE', object: SwimStyle,
                    stringAttributes: ['name', 'stroke'], intAttributes: ['distance', 'relaycount'],
                    identifyingAttributes: ['stroke', 'distance', 'relaycount']
                    },{
                    name: 'heat', outerElementName: 'HEATS', innerElementName: 'HEAT', object: Heat,
                    intAttributes: ['heatid', 'number'],
                    identifyingAttributes: ['heatid']
                    },{
                    name: 'agegroup', outerElementName: 'AGEGROUPS', innerElementName: 'AGEGROUP', object: AgeGroup,
                    stringAttributes: ['name'], intAttributes: ['agegroupid', 'agemin', 'agemax'],
                    identifyingAttributes: ['agegroupid'],
                    children: [{
                        name: 'ranking', outerElementName: 'RANKINGS', innerElementName: 'RANKING', object: Ranking,
                        intAttributes: ['place', 'resultid'],
                        identifyingAttributes: ['resultid']
                    }]
                }]
            }]
        }, {
            name: 'club', outerElementName: 'CLUBS', innerElementName: 'CLUB', object: Club,
            stringAttributes: ['name', 'shortname', 'code', 'region', 'type'],
            identifyingAttributes: ['code'],
            children: [{
                name: 'athlete', outerElementName: 'ATHLETES', innerElementName: 'ATHLETE', object: Athlete,
                stringAttributes: ['lastname', 'firstname', 'gender', 'birthdate', 'license'], intAttributes: ['athleteid'],
                identifyingAttributes: ['license'],
                children: [{
                    name: 'result', outerElementName: 'RESULTS', innerElementName: 'RESULT', object: Result,
                    stringAttributes: ['swimtime', 'reactiontime', 'status'], intAttributes: ['resultid', 'eventid'],
                    identifyingAttributes: ['resultid'],
                    children: [{
                        name: 'split', outerElementName: 'SPLITS', innerElementName: 'SPLIT', object: Split,
                        stringAttributes: ['swimtime'], intAttributes: ['distance'],
                        identifyingAttributes: ['distance']
                    }]
                    },{
                    name: 'entry', outerElementName: 'ENTRIES', innerElementName: 'ENTRY', object: Entry,
                    stringAttributes: ['entrytime', 'entrycourse'], intAttributes: ['eventid', 'heatid', 'lane'],
                    identifyingAttributes: ['eventid', 'heatid']
                }]
            }]
        }]
    }]
};

// Helpers to recursively convert Lenex XML into JS objects according to the definition
function populateLenexAttributes(object, el, definition) {
    // Populate string attributes
    if (definition.stringAttributes !== undefined) {
        definition.stringAttributes.forEach(function (attribute) {
            var val = el.getAttribute(attribute);
            if (val != null) { object[attribute] = val; }
        });
    }
    // Populate int attributes
    if (definition.intAttributes !== undefined) {
        definition.intAttributes.forEach(function (attribute) {
            var val = el.getAttribute(attribute);
            if (val != null) { object[attribute] = parseInt(val); }
        });
    }
}

function populateLenexChildObjects(object, el, definition, meet) {
    if (definition.children === undefined) {
        return;
    }
    // Construct or modify child objects
    definition.children.forEach(function (childDefinition) {
        if (childDefinition.outerElementName === undefined)
        {
            // Single object (not an array).
            // Find the first direct child node named childDefinition.innerElementName
            var children = el.childNodes;
            for (var i = 0; i < children.length; i++) {
                var innerEl = children[i];
                if (innerEl.nodeName == childDefinition.innerElementName) {
                    var preExistingObject = object[childDefinition.name];
                    if (preExistingObject === undefined) {
                        // Construct a new object for this XML node
                        var newObject = new childDefinition.object();
                        populateLenexObject(newObject, innerEl, childDefinition, meet);
                        object[childDefinition.name] = newObject;
                    } else {
                        // Modify the existing object
                        populateLenexObject(preExistingObject, innerEl, childDefinition, meet);
                    }
                    break;
                }
            }
        }
        else
        {
            // We have an array of elements to populate
            var preExistingArray = object[childDefinition.name + 's'];
            var array;

            if (preExistingArray === undefined) {
                array = [];
                object[childDefinition.name + 's'] = array;
            } else {
                array = preExistingArray;
            }
            var numPreExistingObjects = array.length;

            // Find the first direct child node named childDefinition.outerElementName
            var children = el.childNodes;
            for (var i = 0; i < children.length; i++) {
                var outerEl = children[i];
                if (outerEl.nodeName == childDefinition.outerElementName) {
                    // Now find all that node's children named innerElementName
                    children = outerEl.childNodes;
                    for (var i = 0; i < children.length; i++) {
                        var innerEl = children[i];
                        if (innerEl.nodeName == childDefinition.innerElementName) {
                            var preExistingObject = undefined;
                            if (preExistingArray !== undefined) {
                                // We need to know if this object already exists in the array.
                                // To do this we use the identifyingAttributes list.
                                // Create an object and populate it with this node's attributes
                                var attributes = {};
                                populateLenexAttributes(attributes, innerEl, childDefinition);
                                for (var j = 0; j < numPreExistingObjects; j++) {
                                    var possibleMatch = array[j];
                                    var match = true;
                                    childDefinition.identifyingAttributes.forEach(function (attributeName) {
                                        if (match && (possibleMatch[attributeName] != attributes[attributeName])) {
                                            match = false;
                                        }
                                    });
                                    if(match) {
                                        preExistingObject = possibleMatch;
                                        break;
                                    }
                                }
                            }
                            if (preExistingObject === undefined) {
                                // Construct a new object for this XML node
                                var newObject = new childDefinition.object();
                                populateLenexObject(newObject, innerEl, childDefinition, meet);
                                array.push(newObject);
                            } else {
                                // Modify the pre-existing object
                                populateLenexObject(preExistingObject, innerEl, childDefinition, meet);
                            }
                        }
                    }
                    break;
                }
            }
        }
    });
}

function populateLenexObject(object, el, definition, meet) {
    // Always fill-in the basic attributes
    populateLenexAttributes(object, el, definition);
    if (typeof object.populate == 'function') {
        // This type of object has bespoke 'populate' behaviour.
        // We require that the populate method calls populateLenexChildObjects at some point.
        object.populate(el, definition, meet);
    } else {
        // But this one doesn't.  Just recurse.
        populateLenexChildObjects(object, el, definition, meet);
    }
}

//
// Object constructors
//

function Lenex(urlFolderRoot) {
    this.urlFolderRoot = urlFolderRoot;
}

function HeatLaneEntry(athleteid, entrytime, entrycourse) {
    this.athleteid = athleteid;
    this.entrytime = entrytime;
    this.entrycourse = entrycourse;
    this.entryTimeSeconds = parseTimeString(entrytime);
}

//
// Helpers
//

// Converts a string of the form hh:mm:ss.ff into seconds
function parseTimeString(str) {
    if (str == 'NT') { return 0; }
    var fields = str.split(":");
    if (fields.length != 3) {
        console.warn("Can't parse time string: " + str);
        return 0;
    }
    var seconds = parseInt(fields[0]) * 3600;
    seconds += parseInt(fields[1]) * 60;
    seconds += parseFloat(fields[2]);
    return seconds;
}
// Parse a date of the form yyyy-mm-dd
function parseDateStr(dateStr) {
    var dateFields = dateStr.split("-");
    return new Date(parseInt(dateFields[0]), parseInt(dateFields[1]) - 1, parseInt(dateFields[2]));
}
function calcAgeAtDate( dateOfBirth, dateToTest ) {
    var age = dateToTest.getFullYear() - dateOfBirth.getFullYear();
    var monthOfBirth = dateOfBirth.getMonth();
    var monthToTest = dateToTest.getMonth();
    if(monthOfBirth < monthToTest) {
        age--;
    } else if(monthOfBirth == monthToTest) {
        if (dateOfBirth.getDate() < dateToTest.getDate()) {
            age--;
        }
    }
    return age;
}
//
// Populate methods
//
Meet.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, this);
}
Session.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);
    this.date = parseDateStr(this.date);
}
AgeDate.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);
    this.date = parseDateStr(this.value)
}
Club.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);
    // Tell all the athlete's which club they're a member of
    this.athletes.forEach(function (athlete) {
        athlete.club = this;
    }, this);
}
Athlete.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);
    this.fullname = this.firstname + ' ' + this.lastname;

    // Parse the date-of-birth and calculate the age for the meet
    var dob = parseDateStr(this.birthdate);
    this.yob = 1900 + dob.getYear();
    if (meet.agedate != undefined) {
        this.age = calcAgeAtDate(dob, meet.agedate.date);
    }

    // Add this athlete to the meet's athlete dictionary so we can look them up later
    meet.athletesLookup[this.athleteid] = this;

    // Give each of this athlete's results the athleteid and build a temporary
    // dictionary of eventid to result for this athlete
    var eventIdToResultId = {};
    this.results.forEach(function (result) {
        result.athleteid = this.athleteid;
        eventIdToResultId[result.eventid] = result.resultid;
    }, this);

    // Put this athlete's entries into the heats
    this.entrys.forEach(function (entry) {
        if (entry.lane !== undefined) {
            var heat = meet.heatsLookup[entry.heatid];
            //assert(heat.entriesByLane[entry.lane] === undefined);
            var heatLaneEntry = new HeatLaneEntry(this.athleteid, entry.entrytime, entry.entrycourse);
            heat.entriesByLane[entry.lane] = heatLaneEntry;

            // Do we have a result for this entry?
            // If so, add the result to the heatLaneEntry so that we can do results by heat.
            var resultid = eventIdToResultId[entry.eventid];
            if (resultid != undefined) { heatLaneEntry.resultid = resultid; }
        }
    }, this);
}
Result.prototype.populate = function(el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);

    // Add this result to the meet's result dictionary so we can look them up later
    meet.resultsLookup[this.resultid] = this;

    this.seconds = parseTimeString(this.swimtime);
}
Heat.prototype.populate = function(el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);

    // Add this heat to the meet's heat dictionary so we can look them up later
    meet.heatsLookup[this.heatid] = this;
}
AgeGroup.prototype.populate = function(el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);

    // Rankings aren't in order, so sort them
    this.rankings.sort(function (a, b) { return a.place - b.place; })
}
Split.prototype.populate = function (el, definition, meet) {
    populateLenexChildObjects(this, el, definition, meet);
    this.seconds = parseTimeString(this.swimtime);
}

//
// Additional object methods
//
Event.prototype.hasStartLists = function () {
    return this.heats.length > 0;
}
Event.prototype.hasResults = function () {
    for (var i = 0; i < this.agegroups.length; i++) {
        if (this.agegroups[i].rankings.length > 0) { return true; }
    }
    return false;
}
Session.prototype.hasStartLists = function () {
    for (var i = 0; i < this.events.length; i++) {
        if (this.events[i].hasStartLists()) { return true; }
    }
    return false;
}
Session.prototype.hasResults = function () {
    for (var i = 0; i < this.events.length; i++) {
        if (this.events[i].hasResults()) { return true; }
    }
    return false;
}
Meet.prototype.hasStartLists = function () {
    for (var i = 0; i < this.sessions.length; i++) {
        if (this.sessions[i].hasStartLists()) { return true; }
    }
    return false;
}
Meet.prototype.hasResults = function () {
    for (var i = 0; i < this.sessions.length; i++) {
        if (this.sessions[i].hasResults()) { return true; }
    }
    return false;
}

//
// Loading of additional data into an existing Lenex object
//
Lenex.prototype.tryLoad = function (fileName, onLoadedCallback, onFailCallback) {
    var request = new XMLHttpRequest();
    var url = this.urlFolderRoot + '/' + fileName;
    var thisLenex = this;
    request.onload = function (e) {
        // This is odd, I seem to be getting the onload method called on 404 errors. ???
        if (this.status == 200) {
            console.info('Loaded ' + url);
            // Try to merge the XML into the existing lenex object
            populateLenexChildObjects(thisLenex, this.responseXML.documentElement, lenexDefinition);

            onLoadedCallback();
        } else {
            console.info('Failed to load ' + url + '. Error ' + this.status);
            //console.error(this.statusText);
            onFailCallback(this.statusText);
        }
    };
    request.onerror = function (e) {
        console.info('Failed to load ' + url + '. Error ' + this.status);
        //console.error(this.statusText);
        onFailCallback(this.statusText);
    };
    request.open("GET", url, true);
    request.send();
}

Lenex.prototype.tryLoadSessionFiles = function (fileNamePrefix, onLoadedCallback) {
    // Need to think about how we handle multiple meets in a single file
    if(this.meets.length == 0) { return; }
    var meet = this.meets[0];
    for( var i = 0; i < meet.sessions.length; i++ ) {
        this.tryLoad(fileNamePrefix + 's' + meet.sessions[i].number + '.xml', onLoadedCallback, function () { });
    }
}

Lenex.prototype.tryLoadEventFile = function (event, onLoadedCallback, onFailCallback) {
    this.tryLoad('E' + event.number + '.xml', onLoadedCallback, onFailCallback );
}

// Asynchronously load the the specified lenex URL.
// Will call onLoadedCallback, passing the Lenex object when the data is loaded.
function LenexLoad(urlFolderRoot, onLoadedCallback, onFailCallback, onRefreshCallback) {
    // We always expect there to be at least a schedule.xml file
    // so we try to load that first as a minimum.
    var lenex = new Lenex(urlFolderRoot);

    // Try for results.xml first, because if that exists, then it's all we need
    lenex.tryLoad('results.xml', function () {
        // Success
        onLoadedCallback(lenex);
    }, function () {
        // Nope. Well in that case there should definitely be a schedule.xml
        lenex.tryLoad('schedule.xml', function (e) {
            // Success
            onLoadedCallback(lenex);

            // We're on a roll.  Let's try loading some start-lists.
            lenex.tryLoad('startlists.xml', function (e) {
                // Success
                onRefreshCallback(lenex);
            }, function (failReason) {
                // Maybe start-lists for the whole meet was a bit optimistic.
                // Let's try each session.
                lenex.tryLoadSessionFiles('startlists', onRefreshCallback);
            });

            // Now, for an encore, let's see if we can load any session results
            lenex.tryLoadSessionFiles('results', onRefreshCallback);
        }, function (failReason) {
            // Well that's a shame
            lenex.tryLoad('schedule.xml', onRefreshCallback);
            onFailCallback(failReason);
        });
    });
}
