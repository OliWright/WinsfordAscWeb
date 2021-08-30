var navPanelOpen = false;
var navPanelEverOpened = false;
var useTransform = true;

var navWrapperElement;
var pageElement;
var navPanelElement;
var toggleButtonElement;
var mainWrapperElement;

function toggleNavPanel()
{
	if (navPanelOpen)
	{
		// Close the nav panel
		if( useTransform )
		{
			navWrapperElement.style.transform = "translate(0px,0px)";
			navWrapperElement.style.webkitTransform = "translate(0px,0px)";
		}
		else
		{
			pageElement.style.left = "0";
			navWrapperElement.style.left = "0";
		}
		
		navWrapperElement.removeEventListener("click", toggleNavPanel);
	}
	else
	{
		// Open the nav panel
        var height = window.innerHeight.toString() + "px";

		navWrapperElement.style.height = height;
		navPanelElement.style.height = height;
		if( useTransform )
		{
			navWrapperElement.style.transform = "translate(250px,0px)";
			navWrapperElement.style.webkitTransform = "translate(250px,0px)";
		}
		else
		{
			pageElement.style.left = "250px";
			navWrapperElement.style.left = "250px";
		}
		navPanelEverOpened = true;
	}
	navPanelOpen = !navPanelOpen;
}

function hideNavPanel()
{
	navPanelElement.style.height = "0"; // Effectively hide
	navWrapperElement.style.height = "44px";
}

function navPanelTransitionEnd()
{
    if( skel.isActive("mobile") )
    {
	    if (navPanelOpen)
	    {
            // Make the whole nav-panel listen for clicks to close the panel
		    navWrapperElement.addEventListener("click", toggleNavPanel);
	    }
	    else
	    {
		    hideNavPanel();
	    }
    }
}

skel.init({
    reset: 'full',
    //containers: "768",     
    breakpoints: {
        desktop: {
            containers: '80%',
            media: '(min-width: 769px)',
            href: '/css/style-desktop.css'
        },
        medium: { // For smaller desktops or tablets.  Overlaps with desktop
            containers: '98%',
            media: '(min-width: 769px) and (max-width: 1024px)',
            href: '/css/style-1000px.css'
        },
        mobile: {
            containers: '98%',
            media: '(max-width: 768px)',
            href: '/css/style-mobile.css',
            grid: {
                collapse: true
            }
        }
    }
});

// Attached to click events for question class paragraphs
// Toggles the visibility of a following div (the answer)
function toggleAnswer( ev )
{
    var answer = ev.target.nextSibling.nextSibling;
    if( answer.tagName == "DIV")
    {
        // Toggle the answer
        $(answer).toggle();
        // Make the answer hide itself if clicked
        $(answer).click( function(){ $(answer).hide(); } )
    }
}

function search( searchString )
{
    window.parent.location = "/search-results?search=" + searchString;
}

// Called when the search icon is pressed on mobile
var searchIsVisible = false;
function toggleSearch()
{
    if( searchIsVisible )
    {
        // Hide the search
        searchIsVisible = false;
        $("#mobile-search").hide();
    }
    else
    {
        // Show the search
        searchIsVisible = true;
        $("#mobile-search").show();
        // And give it focus
        document.getElementById("mobile-search-input").focus();
    }
}

skel.on('ready', function () {
    //$(document).bind("ready",	function () {
    navWrapperElement = document.getElementById("navigation-wrapper");
    pageElement = document.getElementById("root");
    navPanelElement = document.getElementById("nav");
    toggleButtonElement = document.getElementById("toggle-menu");
    mainWrapperElement = document.getElementById("main");

    toggleButtonElement.addEventListener("click", toggleNavPanel);
    navWrapperElement.addEventListener("transitionend", navPanelTransitionEnd, false);

    // Look for a login-link to determine if we're logged in or not, then add appropriate
    // classes for CSS to use.
    if (document.getElementById("login-link") == null) {
        $("body").addClass("is-logged-in");
    }
    else {
        $("body").addClass("is-not-logged-in");
    }

    skel.on('+mobile', function () {
        // Turn on feature for mobiles
        hideNavPanel();
        console.log("+mobile");
    });

    skel.on('-mobile', function () {
        // Turn off feature for mobiles
        navPanelElement.style.height = "";
        navWrapperElement.style.height = "";
        pageElement.style.left = "";
        navWrapperElement.style.left = "";
        console.log("-mobile");
    });

    $(".question").click( toggleAnswer );


    // Find all YouTube videos
    var $allVideos = $("iframe[src*='www.youtube.com']"),

    // The element that is fluid width
    $fluidEl = $(".is-page-content");

    // Figure out and save aspect ratio for each video
    $allVideos.each(function() {

      $(this)
        .data('aspectRatio', this.height / this.width)

        // and remove the hard coded width/height
        .removeAttr('height')
        .removeAttr('width');

    });

    // When the window is resized
    $(window).resize(function() {

      var newWidth = $fluidEl.width();

      // Resize all videos according to their own aspect ratio
      $allVideos.each(function() {

        var $el = $(this);
        $el
          .width(newWidth)
          .height(newWidth * $el.data('aspectRatio'));

      });

    // Kick off one resize to fix all videos on page load
    }).resize();
}
);         
