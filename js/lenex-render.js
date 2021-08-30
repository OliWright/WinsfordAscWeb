//
// Lenex 3 HTML renderer.
//
// Loads a Lenex 3 file and renders it to a HTML element.
// Currently a very trivial dump of what's in the Lenex object, but
// ultimately there'll be lots of interactive control.
//
// Usage :
//     Create an empty <div> element and give it a unique id
//         e.g. <div id="my-lenex-container"></div>
//     Add some JavaScript to call LenexRender, passing the URL of a folder containing
//     the Lenex file(s) that you'd like to see, and the id of your div element.
//         <script type="text/javascript">
//             LenexRender("Examples/EMSheffMeet17", "my-lenex-container");
//         </script>
//
// Oli Wright
//

//
// Utility Helpers
//
function createTextElement(nodeType, text) {
    var el = document.createElement(nodeType);
    el.appendChild(document.createTextNode(text));
    return el;
}

function removeClass(el, toRemove) {
    if (!el.hasAttribute('class')) {
        return;
    }
    var classAttr = el.getAttribute('class');
    var oldClasses = classAttr.split(' ');
    var newClasses = Array();
    for (var i = 0; i < oldClasses.length; i++) {
        if (oldClasses[i].length == 0) // double spaces can create empty elements
            continue;
        if (oldClasses[i] == toRemove) // don't include this one
            continue;
        newClasses.push(oldClasses[i])
    }
    el.setAttribute('class', newClasses.join(' '));
}

function addClass(el, toAdd) {
    if (!el.hasAttribute('class')) {
        el.setAttribute('class', toAdd);
        return;
    }
    var oldClasses = el.getAttribute('class').split(' ');
    var newClasses = Array();
    for (var i = 0; i < oldClasses.length; i++) {
        if (oldClasses[i].length == 0) // double spaces can create empty elements
            continue;
        if (oldClasses[i] == toAdd) {
            continue;
        }
        newClasses.push(oldClasses[i])
    }
    newClasses.push(toAdd);
    el.setAttribute('class', newClasses.join(' '));
}

function isClassSet(el, toCheck) {
    if (el.hasAttribute('class')) {
        classes = el.getAttribute('class').split(' ');
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] == toCheck) { return true; }
        }
    }
    return false;
}

function toggleClass(el, toToggle) {
    if (isClassSet(el, toToggle)) { removeClass(el, toToggle); } else { addClass(el, toToggle); }
}

function toggleBlockDisplay(el) {
    if (el.style.display == 'none') { el.style.display = 'block'; } else { el.style.display = 'none'; }
}

function raceTimeToString(raceTime, precision) {
    if (raceTime == 0) { return 'NT'; }
    var minutes = Math.floor(raceTime / 60);
    if (precision === undefined) precision = 2;
    var str = "";
    if (minutes > 0) {
        var seconds = raceTime - (minutes * 60);
        str += minutes + ":";
        if (seconds < 10) {
            str += "0";
        }
        str += seconds.toFixed(precision);
    }
    else {
        str += raceTime.toFixed(precision);
    }
    if (precision == 1) {
        // Temporary. Put an extra 0 in when showing to 1 decimal place, so that we can
        // copy and paste into the new entry system without it getting it wrong.
        str += "0";
    }
    return str;
}

function dateToStr(date) {
    if (date == undefined) {
        return 'Date unknown';
    } else {
        return date.getDate().toString() + '/' + (date.getMonth() + 1).toString() + '/' + date.getFullYear().toString();
    }
}

//
// More bespoke helpers
//

function createRadioButton(parent, groupName, value, label) {
    var el = document.createElement('label');
    el.setAttribute('for', value);
    el.appendChild(document.createTextNode(label));
    parent.appendChild(el);
    el = document.createElement('input');
    el.setAttribute('type', 'radio');
    el.setAttribute('name', groupName);
    el.setAttribute('value', value);
    el.setAttribute('id', value);
    parent.appendChild(el);
    return el;
}

function createCheckBox(parent, name, label, cssClass) {
    var el = document.createElement('label');
    el.setAttribute('for', name);
    el.setAttribute('class', cssClass);
    el.appendChild(document.createTextNode(label));
    parent.appendChild(el);
    el = document.createElement('input');
    el.setAttribute('type', 'checkbox');
    el.setAttribute('name', name);
    el.setAttribute('id', name);
    el.setAttribute('class', cssClass);
    parent.appendChild(el);
    return el;
}

// Create a drop-down <select> element.
// Pass in an array of options, each of which should be an object
// with a 'value' attribute amd a 'text' attribute.
// If used in conjunction with setSelectorClasses, then the value
// attribute should be a class name.
function createDropDown(name, options) {
    var selectEl = document.createElement('select');
    selectEl.setAttribute('name', name);
    options.forEach(function (value) {
        var optionEl = document.createElement('option');
        optionEl.setAttribute('value', value.value);
        optionEl.appendChild(document.createTextNode(value.text));
        selectEl.appendChild(optionEl);
    });
    return selectEl;
}

// selectEl should be a <select> element containing multiple options
// each option's value is taken as a class that will be added or removed from el
// according to the current value of the select element.
function setSelectorClasses(selectEl, el) {
    var selectedIdx = selectEl.selectedIndex;
    var options = selectEl.options;
    for (var i = 0; i < selectEl.length; i++) {
        if (i == selectedIdx) {
            addClass(el, options[i].value);
        } else {
            removeClass(el, options[i].value);
        }
    }
}

//
// CSS customisation
//

const defaultCustomisation = {
    colours: {
        // Use any legal CSS colour string.
        headingsDark: "#33b",
        headingsLight: "#55e",
        text: "#666",
        background: "rgba(170, 170, 170, 0.4)",
        backgroundOddLines:"rgba(200, 200, 200, 0.4)"
    },
    options: {
        // displayMode options:
        //      0 : On a wide display, there's a pane on the right to show results of a selected event.
        //          But on a narrow display, events are expanded inline.
        //      1 : Each session is in its own pane. Results are always expanded inline.
        displayMode: 0,
        // Background image (watermark) options
        showWatermark: true,
        watermarkImage: "images/SportSystems.svg",
        // Show a separate pane containing the meet name
        showTitle: true,
        // Show a separate pane containing interactive controls for the user
        showControls: true,
        // Should the sessions be collapsed or expanded by default?
        startSessionsCollapsed: false,
        // Turn column headings on or off for start-lists and results
        showColumnHeadings: true,
        // Control which columns are shown in start-lists and results
        showClub: true,
        showYoB: true,
        showAge: false
    }
};

// This helper is similar to Object.assign, but provided for compatibility with older browsers.
// It returns a new object with the same properties as obj, but any missing properties that exist
// in defaults are copied across.
function fillDefaults(obj, defaults) {
    if (obj == undefined) {
        return defaults;
    }
    var newObj = {};
    Object.keys(defaults).forEach(function (key) {
        if (obj[key] != undefined) {
            newObj[key] = obj[key];
        } else {
            newObj[key] = defaults[key];
        }
    });
    return newObj;
}

var customisationStyleSheet = undefined; // global because it applies to the document
Lenex.prototype.customise = function () {
    //return;
    if (customisationStyleSheet == undefined) {
        // Create a new stylesheet, and append it to the document
        var style = document.createElement("style");
        // WebKit hack :(
        style.appendChild(document.createTextNode(""));
        // Add the <style> element to the page
        document.head.appendChild(style);
        customisationStyleSheet = style.sheet;
    }
    customisationStyleSheet.insertRule(".lenex h1, .lenex h3, .lenex h4 { color: " + this.customisation.colours.headingsDark + "; }", 0);
    customisationStyleSheet.insertRule(".lenex h2, .lenex h5 { color: " + this.customisation.colours.headingsLight + "; }", 0);
    customisationStyleSheet.insertRule(".lenex { color: " + this.customisation.colours.text + "; }", 0);
    customisationStyleSheet.insertRule("@media screen { .lenex .pane { background-color: " + this.customisation.colours.background + "; } }", 0);
    customisationStyleSheet.insertRule(".lenex .odd { background-color: " + this.customisation.colours.backgroundOddLines + "; }", 0);

    // Count the number of columns
    this.numColumns = 3;
    if (this.customisation.options.showClub) { this.numColumns++; }
    if (this.customisation.options.showYoB) { this.numColumns++; }
    if (this.customisation.options.showAge) { this.numColumns++; }
}

//
// Event handling
//

Lenex.prototype.positionBackgroundImage = function () {
    var windowWidth = window.innerWidth;
    windowWidth = windowWidth == undefined ? document.documentElement.clientWidth : windowWidth;
    var windowHeight = window.innerHeight;
    windowHeight = windowHeight == undefined ? document.documentElement.clientHeight : windowHeight;
    var width;
    var height;
    if (windowWidth < windowHeight) {
        width = height = windowWidth;
    } else {
        width = height = windowHeight;
    }
    var posX = (windowHeight - height) / 2;
    var posY = (windowWidth - width) / 2;
    var backgroundImagePosX = -1000;
    var backgroundImagePosY = -1000;

    if ((Math.abs(posX - backgroundImagePosX) > 30) || (Math.abs(posY - backgroundImagePosY) > 30)) {
        backgroundImagePosX = posX;
        backgroundImagePosY = posY;
        this.backgroundImageEl.style.top = posX.toString() + "px";
        this.backgroundImageEl.style.left = posY.toString() + "px";
        this.backgroundImageEl.style.width = width.toString() + "px";
        this.backgroundImageEl.style.height = height.toString() + "px";
    }
}

Lenex.prototype.setMode = function () {
    if ((this.containerEl.clientWidth > 768) && (this.customisation.options.displayMode == 0)) {
        // Separate results
        if (this.mode != 0) {
            removeClass(this.containerEl, 'inline-results');
            addClass(this.containerEl, 'separate-results');
            this.mode = 0;
            this.meets.forEach(function (meet) { meet.mode = 0; });
        }
    } else {
        if (this.mode != 1) {
            removeClass(this.containerEl, 'separate-results');
            addClass(this.containerEl, 'inline-results');
            this.mode = 1;
            this.meets.forEach(function (meet) { meet.mode = 1; });
        }
    }
}

Lenex.prototype.handleEvent = function (event) {
    switch (event.type) {
        case 'resize':
            if (this.backgroundImageEl != undefined) { this.positionBackgroundImage(); }
            this.setMode();
            break;
    }
}

//
// Add render methods to all the Lenex parser objects.
// We pass through the Meet to all the objects because that is where we keep some lookup tables.
//

Lenex.prototype.render = function () {
    var containerEl = document.createElement('div');
    containerEl.setAttribute('class', 'lenex');
    this.containerEl = containerEl;
    this.mode = -1; // This will be set in setMode
    this.eventTitleEls = [];

    if (this.customisation.options.showWatermark) {
        // Add a background image to the root
        var imageEl = document.createElement('img');
        imageEl.setAttribute('id', 'background-image');
        imageEl.setAttribute('src', this.customisation.options.watermarkImage);
        imageEl.setAttribute('alt', 'Logo');
        containerEl.appendChild(imageEl);
        this.backgroundImageEl = imageEl;
        this.positionBackgroundImage();
    }

    window.addEventListener('resize', this );

    // Render each meet and append it to the element we've just created.
    var lenex = this;
    this.meets.forEach(function (meet) { containerEl.appendChild(meet.render(lenex)); });
    return containerEl;
}

function createWhatToShowControl(meetEl) {
    var el = document.createElement('div');
    //el.appendChild(createTextElement('label', 'What to show: '));
    var selectEl = createDropDown('what-to-show', [
        { value: 'show-auto', text: 'Results or start lists' },
        { value: 'show-startlists', text: 'Start lists' },
        { value: 'show-results', text: 'Results' },
        { value: 'show-results-by-heat', text: 'Results by heat' }
    ]);
    selectEl.onchange = function () { setSelectorClasses(selectEl, meetEl); };
    setSelectorClasses(selectEl, meetEl);
    el.appendChild(selectEl);
    return el;
}

function createSplitsModeControl(meetEl) {
    var el = document.createElement('div');
    //el.appendChild(createTextElement('label', 'Splits: '));
    var selectEl = createDropDown('splits-mode', [
        { value: 'splits-off', text: 'Hide splits (click times to toggle)' },
        { value: 'splits-time', text: 'Show all splits as times' },
        { value: 'splits-interval', text: 'Show all splits as intervals' }
    ]);
    selectEl.onchange = function () { setSelectorClasses(selectEl, meetEl); };
    setSelectorClasses(selectEl, meetEl);
    el.appendChild(selectEl);
    return el;
}

Meet.prototype.render = function (lenex) {
    // Outer container for the whole meet
    var meetEl = document.createElement('div');
    meetEl.setAttribute('id', 'meet');
    addClass(meetEl, 'expand-selected'); // Expand only the events that the user clicks on

    if (lenex.customisation.options.showTitle) {
        var titleEl = document.createElement('div');
        addClass(titleEl, 'pane');
        titleEl.appendChild(createTextElement('h1', this.name));
        meetEl.appendChild(titleEl); // Title
    }
    meetEl.hasAnyResults = this.hasResults();
    meetEl.hasAnyStartLists = this.hasStartLists();

    // 'Controls' pane.  Will hold all filtering and display user controls.
    if (lenex.customisation.options.showControls) {
        var controlsEl = document.createElement('div');
        controlsEl.setAttribute('id', 'controls');
        addClass(controlsEl, 'pane');
        controlsEl.appendChild(createTextElement('h2', 'Controls'));
        controlsEl.appendChild(createTextElement('p', 'Click on an event to expand it to show startlists or results.  Click on a result time to show splits if available.  Click on the splits to toggle them between race times and intervals.'));
        if (meetEl.hasAnyResults == meetEl.hasAnyStartLists) {
            controlsEl.appendChild(createWhatToShowControl(meetEl));
        } else if (meetEl.hasAnyResults) {
            addClass(meetEl, 'show-results');
        } else {
            addClass(meetEl, 'show-startlists');
        }
        controlsEl.appendChild(createSplitsModeControl(meetEl));
        var expandAllEl = createCheckBox(controlsEl, 'expand-all', 'Expand all events', 'only-inline-results');
        expandAllEl.onclick = function () {
            // 'Expand all events' checkbox clicked.
            // Attempt to load all event files
            lenex.eventTitleEls.forEach(function (eventTitleEl) {
                var event = eventTitleEl.inlineEventInfoEl.lenexEvent;
                if (!event.hasResults()) {
                    tryToLoadEventFile(eventTitleEl, event, lenex);
                }
            });

            // Toggle the 'expand-selected' class on the meet element.
            if (expandAllEl.checked) {
                removeClass(meetEl, 'expand-selected');
            } else {
                addClass(meetEl, 'expand-selected');
            }
        }
        meetEl.appendChild(controlsEl);
    } else {
        addClass(meetEl, 'show-auto');
    }

    // Flexbox container for sections of the meet rendering
    var flexboxContainerEl = document.createElement('div');
    addClass(flexboxContainerEl, 'flex-container');
    meetEl.appendChild(flexboxContainerEl);

    if (lenex.customisation.options.displayMode == 0) {
        // Container for the meet index (list of events)
        var indexEl = document.createElement('div');
        indexEl.setAttribute('id', 'index');
        addClass(indexEl, 'pane');
        flexboxContainerEl.appendChild(indexEl);

        // Container for details of the selected event
        var eventInfoContainerEl = document.createElement('div');
        addClass(eventInfoContainerEl, 'pane');
        addClass(eventInfoContainerEl, 'only-separate-results');
        flexboxContainerEl.appendChild(eventInfoContainerEl);
        eventInfoContainerEl.appendChild(createTextElement('p', 'Click on an event in the left-hand pane to see information here.'));

        // Render each session and append it to the meet index
        this.sessions.forEach(function (session) { indexEl.appendChild(session.render(eventInfoContainerEl, this, lenex)); }, this);
    } else {
        // displayMode 1
        addClass(flexboxContainerEl, 'separate-sessions');
        // Render each session into its own pane
        this.sessions.forEach(function (session) {
            // Container for the session
            var sessionPaneEl = document.createElement('div');
            addClass(sessionPaneEl, 'pane');
            flexboxContainerEl.appendChild(sessionPaneEl);

            sessionPaneEl.appendChild(session.render(undefined, this, lenex));
        }, this);
    }

    return meetEl;
}

function tryToLoadEventFile(titleEl, event, lenex) {
    // Try to load them
    markAsLoading(titleEl.inlineEventInfoEl);
    // Separate pane
    if ((titleEl.separateEventInfoEl != undefined) && (titleEl.separateEventInfoEl.lenexEvent === event)) {
        markAsLoading(titleEl.separateEventInfoEl);
    }

    lenex.tryLoadEventFile(event, function () {
        // Success
        console.info('Loaded event ' + event.number);

        updateEventInfo(titleEl.inlineEventInfoEl);
        // Separate pane
        if ((titleEl.separateEventInfoEl != undefined) && (titleEl.separateEventInfoEl.lenexEvent === event)) {
            updateEventInfo(titleEl.separateEventInfoEl);
        }

    }, function () {
        // Fail
        console.info('Failed to load event ' + event.number);

        updateEventInfo(titleEl.inlineEventInfoEl);
        // Separate pane
        if ((titleEl.separateEventInfoEl != undefined) && (titleEl.separateEventInfoEl.lenexEvent === event)) {
            updateEventInfo(titleEl.separateEventInfoEl);
        }
    });
}

function eventClicked(titleEl, event, meet, lenex) {
    var eventIsVisible = false;
    if (lenex.mode == 1) {
        // When we're inline, we just toggle the class of the event intro div
        // to toggle its visiblity
        toggleClass(titleEl.inlineEventInfoEl, 'closed');
        eventIsVisible = !isClassSet(titleEl.inlineEventInfoEl, 'closed');
    } else {
        // When we're displaying startlists/results in the separate pane however,
        // we need to change the contents of the eventInfoEl for the specified event.
        var eventInfoEl = titleEl.separateEventInfoEl;
        eventInfoEl.lenex = lenex;
        eventInfoEl.lenexEvent = event;
        eventInfoEl.lenexMeet = meet;
        eventInfoEl.innerHTML = '';
        eventInfoEl.appendChild(createTextElement('h3', event.title()));
        // Container for the startlists / results
        var infoContainerEl = document.createElement('div');
        eventInfoEl.infoContainerEl = infoContainerEl;

        eventInfoEl.appendChild(infoContainerEl);

        updateEventInfo(eventInfoEl);
        eventIsVisible = true;
    }

    // Do we have any results for this event?
    if (!event.hasResults() && eventIsVisible) {
        tryToLoadEventFile(titleEl, event, lenex);
    }
}

function markAsLoading(eventInfoEl) {
    var infoContainerEl = eventInfoEl.infoContainerEl;
    infoContainerEl.innerHTML = '';

    var loadingEl = createTextElement('p', 'Loading...');
    infoContainerEl.appendChild(loadingEl);
}

function updateEventInfo(eventInfoEl) {
    var event = eventInfoEl.lenexEvent;
    var meet = eventInfoEl.lenexMeet;
    var lenex = eventInfoEl.lenex;
    var infoContainerEl = eventInfoEl.infoContainerEl;
    infoContainerEl.innerHTML = '';

    // Show the startlists
    if (event.hasStartLists()) {
        addClass(infoContainerEl, 'has-startlists');
        infoContainerEl.appendChild(event.renderStartLists(lenex, meet));
    } else {
        var unavailable = createTextElement('p', 'Start lists for this event are not available.');
        addClass(unavailable, 'startlists');
        infoContainerEl.appendChild(unavailable);
    }

    // Show the results
    if (event.hasResults()) {
        addClass(infoContainerEl, 'has-results');
        infoContainerEl.appendChild(event.renderResults(lenex, meet));
        infoContainerEl.appendChild(event.renderResultsByHeat(lenex, meet));
    } else {
        var unavailable = createTextElement('p', 'Results for this event are not available.')
        addClass(unavailable, 'results');
        infoContainerEl.appendChild(unavailable);
        unavailable = createTextElement('p', 'Results for this event are not available.')
        addClass(unavailable, 'results-by-heat');
        infoContainerEl.appendChild(unavailable);
    }
}

Session.prototype.render = function (separateEventInfoEl, meet, lenex) {
    var el = document.createElement('div');
    var titleEl = createTextElement('h2', this.name + ' - ' + dateToStr(this.date));
    var collapsableSessionEl = document.createElement('div');
    if (lenex.customisation.options.startSessionsCollapsed) {
        collapsableSessionEl.setAttribute('class', 'hidden');
    }
    titleEl.onclick = function () {
        toggleClass(collapsableSessionEl, 'hidden');
    };
    el.appendChild(titleEl);
    this.events.forEach(function (event) {
        var titleEl = event.renderTitle();
        var inlineEventInfoEl = document.createElement('div');
        inlineEventInfoEl.lenex = lenex;
        inlineEventInfoEl.lenexEvent = event;
        inlineEventInfoEl.lenexMeet = meet;
        inlineEventInfoEl.infoContainerEl = inlineEventInfoEl;
        addClass(inlineEventInfoEl, 'closed');
        updateEventInfo(inlineEventInfoEl);

        titleEl.separateEventInfoEl = separateEventInfoEl;
        titleEl.inlineEventInfoEl = inlineEventInfoEl;
        titleEl.onclick = function () { eventClicked(titleEl, event, meet, lenex); }

        lenex.eventTitleEls.push(titleEl);

        collapsableSessionEl.appendChild(titleEl);
        collapsableSessionEl.appendChild(inlineEventInfoEl);
    });
    el.appendChild(collapsableSessionEl);
    return el;
}

Event.prototype.title = function (nodeType) {
    return 'Event ' + this.eventid + ': ' + this.swimstyle.name;
}

Event.prototype.renderTitle = function () {
    var tableEl = document.createElement('table');
    tableEl.setAttribute('class', 'event-title');
    var rowEl = document.createElement('tr');
    var numberEl = document.createElement('td');
    numberEl.setAttribute('class', 'event-number');
    numberEl.appendChild(createTextElement('h3', 'Event ' +this.eventid + ':'));
    var descriptionEl = document.createElement('td');
    descriptionEl.appendChild(createTextElement('h3', this.swimstyle.name));
    rowEl.appendChild(numberEl);
    rowEl.appendChild(descriptionEl);
    tableEl.appendChild(rowEl);
    return tableEl;
}

Event.prototype.renderStartLists = function (lenex, meet) {
    var el = document.createElement('div');
    addClass(el, 'startlists');
    el.appendChild(createTextElement('h4', 'Start Lists'));
    this.heats.forEach(function (heat) { el.appendChild(heat.render(lenex, meet)); });
    return el;
}
Event.prototype.renderResults = function (lenex, meet) {
    var el = document.createElement('div');
    addClass(el, 'results');
    el.appendChild(createTextElement('h4', 'Results'));
    this.agegroups.forEach(function (agegroup) { el.appendChild(agegroup.render(lenex, meet)); });
    return el;
}
Event.prototype.renderResultsByHeat = function (lenex, meet) {
    var el = document.createElement('div');
    addClass(el, 'results-by-heat');
    el.appendChild(createTextElement('h4', 'Results by Heat'));
    this.heats.forEach(function (heat) { el.appendChild(heat.renderResults(lenex, meet)); });
    return el;
}

function cycleSplitsMode(splitsRowEl) {
    if (isClassSet(splitsRowEl, 'time')) {
        removeClass(splitsRowEl, 'time');
        addClass(splitsRowEl, 'interval');
    } else if (isClassSet(splitsRowEl, 'interval')) {
        removeClass(splitsRowEl, 'interval');
    } else {
        addClass(splitsRowEl, 'time');
    }
}

function addColumnHeading(rowEl, className, name) {
    el = document.createElement('th');
    el.setAttribute('class', className);
    el.appendChild(document.createTextNode(name));
    rowEl.appendChild(el);
}

function addAthleteColumnHeadings(rowEl, lenex) {
    addColumnHeading(rowEl, 'name', 'Name');
    if (lenex.customisation.options.showClub) { addColumnHeading(rowEl, 'club', 'Club'); }
    if (lenex.customisation.options.showYoB) { addColumnHeading(rowEl, 'yob', 'YoB'); }
    if (lenex.customisation.options.showAge) { addColumnHeading(rowEl, 'age', 'Age'); }
}

AgeGroup.prototype.render = function (lenex, meet) {
    var div = document.createElement('div');
    var title = document.createElement('h4');
    title.appendChild(document.createTextNode(this.name));
    div.appendChild(title);
    var tableEl = document.createElement('table');
    if (lenex.customisation.options.showColumnHeadings) {
        var rowEl = document.createElement('tr');
        addColumnHeading(rowEl, 'place', 'P');
        addAthleteColumnHeadings(rowEl, lenex);
        addColumnHeading(rowEl, 'time', 'Time');
        tableEl.appendChild(rowEl);
    }
    var row = 1;
    this.rankings.forEach(function (ranking) {
        var result = meet.resultsLookup[ranking.resultid];
        result.renderToTableWithSplits(tableEl, ranking.place, row++, lenex, meet);
    });
    div.appendChild(tableEl);
    return div;
}

Athlete.prototype.addDataToRow = function (rowEl, lenex) {
    el = document.createElement('td');
    el.setAttribute('class', 'name');
    el.appendChild(document.createTextNode(this.fullname));
    rowEl.appendChild(el);

    if (lenex.customisation.options.showClub) {
        el = document.createElement('td');
        el.setAttribute('class', 'club');
        el.appendChild(document.createTextNode(this.club.shortname));
        rowEl.appendChild(el);
    }

    if (lenex.customisation.options.showYoB) {
        el = document.createElement('td');
        el.setAttribute('class', 'yob');
        el.appendChild(document.createTextNode(this.yob));
        rowEl.appendChild(el);
    }

    if (lenex.customisation.options.showAge) {
        el = document.createElement('td');
        el.setAttribute('class', 'age');
        el.appendChild(document.createTextNode(this.age));
        rowEl.appendChild(el);
    }
}

HeatLaneEntry.prototype.render = function (lane, lenex, meet) {
    var athlete = meet.athletesLookup[this.athleteid];
    var rowEl = document.createElement('tr');
    var isOdd = ((lane & 1) == 1);
    if (isOdd) { addClass(rowEl, 'odd'); }

    var el = document.createElement('td');
    el.setAttribute('class', 'place');
    el.appendChild(document.createTextNode(lane));
    rowEl.appendChild(el);

    athlete.addDataToRow(rowEl, lenex);

    el = document.createElement('td');
    el.setAttribute('class', 'time');
    el.appendChild(document.createTextNode(raceTimeToString(this.entryTimeSeconds)));
    rowEl.appendChild(el);

    return rowEl;
}

Heat.prototype.render = function (lenex, meet) {
    var div = document.createElement('div');
    var title = document.createElement('h4');
    title.appendChild(document.createTextNode('Heat ' + this.number));
    div.appendChild(title);
    var tableEl = document.createElement('table');

    if (lenex.customisation.options.showColumnHeadings) {
        var rowEl = document.createElement('tr');
        addColumnHeading(rowEl, 'lane', 'L');
        addAthleteColumnHeadings(rowEl, lenex);
        addColumnHeading(rowEl, 'time', 'Entry');
        tableEl.appendChild(rowEl);
    }

    for (var lane = 0; lane < this.entriesByLane.length; lane++) {
        var heatEntry = this.entriesByLane[lane];
        if (heatEntry !== undefined)
        {
            tableEl.appendChild(heatEntry.render(lane, lenex, meet));
        }
    }
    this.entriesByLane.forEach(function (entry) {  });
    div.appendChild(tableEl);
    return div;
}

Heat.prototype.renderResults = function (lenex, meet) {
    // First get the results for the heat
    var heatResults = [];
    for (var lane = 0; lane < this.entriesByLane.length; lane++) {
        var heatEntry = this.entriesByLane[lane];
        if (heatEntry !== undefined) {
            var resultid = heatEntry.resultid;
            if (resultid != undefined) {
                heatResults.push(meet.resultsLookup[resultid]);
            }
        }
    }
    // Then sort them to give us heat results in finish order...
    heatResults.sort(function (a, b) { return a.seconds - b.seconds; });

    var div = document.createElement('div');
    var title = document.createElement('h4');
    title.appendChild(document.createTextNode('Heat ' + this.number));
    div.appendChild(title);
    var tableEl = document.createElement('table');
    var row = 1;
    var placeToDisplay = 1;
    var previousRaceTime = 0;
    heatResults.forEach(function (result) {
        if (result.seconds != previousRaceTime) { placeToDisplay = row; }
        result.renderToTableWithSplits(tableEl, placeToDisplay, row++, lenex, meet);
    });

    div.appendChild(tableEl);
    return div;
}

Result.prototype.renderToTableWithSplits = function (tableEl, placeToDisplay, row, lenex, meet) {
    var isOdd = ((row & 1) == 1);
    var resultRowEl = this.render(placeToDisplay, lenex, meet);
    if (isOdd) { addClass(resultRowEl, 'odd'); }
    tableEl.appendChild(resultRowEl);
    if (this.splits.length > 0) {
        var splitsRowEl = this.renderSplits(lenex);
        if (isOdd) { addClass(splitsRowEl, 'odd'); }
        resultRowEl.timeEl.onclick = function () { toggleClass(splitsRowEl, 'show'); };
        splitsRowEl.onclick = function () { toggleClass(splitsRowEl, 'interval'); };
        tableEl.appendChild(splitsRowEl);
    }
}

Result.prototype.render = function (place, lenex, meet) {
    var athlete = meet.athletesLookup[this.athleteid];
    var rowEl = document.createElement('tr');

    var el = document.createElement('td');
    el.appendChild(document.createTextNode(place));
    el.setAttribute('class', 'place');
    rowEl.appendChild(el);

    athlete.addDataToRow(rowEl, lenex);

    el = document.createElement('td');
    rowEl.timeEl = el;
    el.appendChild(document.createTextNode(raceTimeToString(this.seconds)));
    el.setAttribute('class', 'time');
    rowEl.appendChild(el);

    return rowEl;
}

Result.prototype.renderSplits = function (lenex) {
    var row = document.createElement('tr');
    row.setAttribute('class', 'splits-row');
    var cell = document.createElement('td');
    cell.setAttribute('colspan', lenex.numColumns);

    var times = document.createElement('div');
    times.setAttribute('class', 'splits time');
    this.splits.forEach(function (split) {
        var splitStr = "";
        splitStr += split.distance;
        splitStr += 'm - ';
        splitStr += raceTimeToString(split.seconds);
        var splitEl = createTextElement('p', splitStr);
        times.appendChild(splitEl);
    });
    cell.appendChild(times);

    var intervals = document.createElement('div');
    intervals.setAttribute('class', 'splits interval');
    var previousSplitTime = 0;
    var isFirstSplit = true;
    this.splits.forEach(function (split) {
        var splitStr = "";
        splitStr += split.distance;
        if((isFirstSplit || (previousSplitTime != 0)) && (split.seconds != 0)) {
            splitStr += 'm - ';
            splitStr += raceTimeToString(split.seconds - previousSplitTime);
        } else {
            splitStr += 'm ---';
        }
        previousSplitTime = split.seconds;
        isFirstSplit = false;
        intervals.appendChild(createTextElement('p', splitStr));
    });
    cell.appendChild(intervals);

    row.appendChild(cell);
    return row;
}


function LenexRender(url, containerElementId, customisation) {
    var element = document.getElementById(containerElementId);
    if (element == null)
    {
        alert('LenexRender was unable to find named element: ' + containerElementId);
    }
    else
    {
        element.innerHTML = '<p>Loading...</p>';
        LenexLoad(url, function (loadedLenex) {
            // onLoadedCallback
            // Attach the loaded lenex object to the element
            element.lenex = loadedLenex;
            element.innerHTML = '';
            if (customisation != undefined) {
                // Merge customisation options with the defaults
                loadedLenex.customisation = {};
                loadedLenex.customisation.colours = fillDefaults(customisation.colours, defaultCustomisation.colours);
                loadedLenex.customisation.options = fillDefaults(customisation.options, defaultCustomisation.options);
            } else {
                loadedLenex.customisation = defaultCustomisation;
            }
            loadedLenex.customise();
            element.appendChild(loadedLenex.render());
            loadedLenex.setMode();
        }, function (statusText) {
            // onFailCallback
            element.innerHTML = '<p>Oh dear: ' + statusText + '</p>';
        }, function () {
            // onRefreshCallback
            element.innerHTML = '';
            element.appendChild(element.lenex.render());
            element.lenex.setMode();
        });
    }
}