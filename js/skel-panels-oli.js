/* skelJS v0.4 | (c) n33 | skeljs.org | MIT licensed */
skel.registerPlugin("panels", function()
{
	var b = {
		config:
		{
			baseZIndex: 1E4,
			useTransform: !0,
			transformBreakpoints: null,
			speed: 250,
			panels:
			{},
			overlays:
			{}
		},
		cache:
		{
			panels:
			{},
			overlays:
			{},
			body: null,
			window: null,
			pageWrapper: null,
			defaultWrapper: null,
			fixedWrapper: null,
			activePanel: null
		},
		eventType: "click",
		positions:
		{
			panels:
			{
				top: ["top", "left"],
				right: ["top", "right"],
				bottom: ["bottom", "left"],
				left: ["top", "left"]
			},
			overlays:
			{
				"top-left":
				{
					top: 0,
					left: 0
				},
				"top-right":
				{
					top: 0,
					right: 0
				},
				top:
				{
					top: 0,
					left: "50%"
				},
				"top-center":
				{
					top: 0,
					left: "50%"
				},
				"bottom-left":
				{
					bottom: 0,
					left: 0
				},
				"bottom-right":
				{
					bottom: 0,
					right: 0
				},
				bottom:
				{
					bottom: 0,
					left: "50%"
				},
				"bottom-center":
				{
					bottom: 0,
					left: "50%"
				},
				left:
				{
					top: "50%",
					left: 0
				},
				"middle-left":
				{
					top: "50%",
					left: 0
				},
				right:
				{
					top: "50%",
					right: 0
				},
				"middle-right":
				{
					top: "50%",
					right: 0
				}
			}
		},
		presets:
		{
			standard:
			{
				panels:
				{
				//	navPanel:
				//	{
				//		breakpoints: "mobile",
				//		position: "left",
				//		style: "push",
				//		size: "80%",
				//		html: '<div data-action="navList" data-args="nav"></div>'
				//	},
					titleBar:
					{
						breakpoints: "mobile",
						//position: "top-left",
						//width: "100%",
						//height: 44,
						//html: '<span class="toggle" data-action="togglePanel" data-args="navPanel"></span><span class="title" data-action="copyHTML" data-args="logo"></span>'
						html: '<span class="toggle" onclick="toggleNavPanel()"></span><span class="title" data-action="copyHTML" data-args="logo"></span>'
					}
				},
				overlays:
				{
				}
			}
		},
		defaults:
		{
			config:
			{
				panel:
				{
					breakpoints: "",
					position: null,
					style: null,
					size: "80%",
					html: "",
					resetScroll: !0,
					resetForms: !0,
					swipeToClose: !0
				},
				overlay:
				{
					breakpoints: "",
					position: null,
					width: 0,
					height: 0,
					html: ""
				}
			}
		},
		recalcW: function(b)
		{
			var c = parseInt(b);
			"string" == typeof b && "%" == b.charAt(b.length - 1) && (c = Math.floor(jQuery(window).width() * (c / 100)));
			return c
		},
		recalcH: function(b)
		{
			var c = parseInt(b);
			"string" == typeof b && "%" == b.charAt(b.length - 1) && (c = Math.floor(jQuery(window).height() * (c / 100)));
			return c
		},
		getHalf: function(b)
		{
			var c =
				parseInt(b);
			return "string" == typeof b && "%" == b.charAt(b.length - 1) ? Math.floor(c / 2) + "%" : Math.floor(c / 2) + "px"
		},
		parseSuspend: function(b)
		{
			b = b.get(0);
			b._skel_panels_suspend && b._skel_panels_suspend()
		},
		parseResume: function(b)
		{
			b = b.get(0);
			b._skel_panels_resume && b._skel_panels_resume()
		},
		parseInit: function(e)
		{
			// Initialise an element 'e'
			var c, d;
			c = e.get(0);
			var data_action = e.attr("data-action"),
				data_args = e.attr("data-args"),
				g, l;
			data_action && data_args && (data_args = data_args.split(","));
			switch (data_action)
			{
				case "togglePanel":
				case "panelToggle":
					e.css("-webkit-tap-highlight-color", "rgba(0,0,0,0)").css("cursor",
						"pointer");
					c = function(c)
					{
						c.preventDefault();
						c.stopPropagation();
						if (b.cache.activePanel) return b.cache.activePanel._skel_panels_close(), !1;
						jQuery(this);
						c = b.cache.panels[data_args[0]];
						c.is(":visible") ? c._skel_panels_close() : c._skel_panels_open()
					};
					"android" == b._.vars.deviceType ? e.bind("click", c) : e.bind(b.eventType, c);
					break;
				case "navList":
					nav_element = jQuery("#" + data_args[0]);
					// Find *all* links below the g nodes.
					// This will include login or logout links too.
					all_links = nav_element.find("a");
					d = [];
					all_links.each( function()
					{
						var this_link = jQuery(this);
						if( (this_link.text() != "Login") && !this_link.hasClass( "overview") )
						{
							var link_depth = Math.max(0, this_link.parents("li").length - 1);
							d.push('<a class="link depth-' + link_depth + '" href="' + this_link.attr("href") +
								'"><span class="indent-' + link_depth + '"></span>' + this_link.text() + "</a>")
						}
					} );
					var html = "";
					if( d.length > 0 ) // Were there any links at all?
					{
						// Initialise the navList
						html = "<nav>" + d.join("") + "</nav>";
					}
					// Copy across any elements with class login-status
					login_status_elements = nav_element.find( ".login-status" );
					if( login_status_elements.length > 0 )
					{
						html += login_status_elements[0].outerHTML;
					}
					e.html( html );
					e.find(".link").css("cursor", "pointer").css("display", "block");
					break;
				case "copyText":
					g = jQuery("#" + data_args[0]);
					e.html(g.text());
					break;
				case "copyHTML":
					g = jQuery("#" + data_args[0]);
					e.html(g.html());
					break;
				case "moveElementContents":
					g = jQuery("#" + data_args[0]);
					c._skel_panels_resume = function()
					{
						g.children().each(function()
						{
							e.append(jQuery(this))
						})
					};
					c._skel_panels_suspend = function()
					{
						e.children().each(function()
						{
							g.append(jQuery(this))
						})
					};
					c._skel_panels_resume();
					break;
				case "moveElement":
					g = jQuery("#" + data_args[0]);
					c._skel_panels_resume = function()
					{
						jQuery('<div id="skel-panels-tmp-' + g.attr("id") + '" />').insertBefore(g);
						e.append(g)
					};
					c._skel_panels_suspend = function()
					{
						jQuery("#skel-panels-tmp-" + g.attr("id")).replaceWith(g)
					};
					c._skel_panels_resume();
					break;
				case "moveCell":
					g = jQuery("#" + data_args[0]), l = jQuery("#" + data_args[1]), c._skel_panels_resume = function()
					{
						jQuery('<div id="skel-panels-tmp-' + g.attr("id") + '" />').insertBefore(g);
						e.append(g);
						g.css("width", "auto");
						l &&
							l._skel_panels_expandCell()
					}, c._skel_panels_suspend = function()
					{
						jQuery("#skel-panels-tmp-" + g.attr("id")).replaceWith(g);
						g.css("width", "");
						l && l.css("width", "")
					}, c._skel_panels_resume()
			}
		},
		lockView: function(e)
		{
			b.cache.window._skel_panels_scrollPos = b.cache.window.scrollTop();
			b._.vars.isTouch && b.cache.body.css("overflow-" + e, "hidden");
			b.cache.pageWrapper.bind("touchstart.lock", function(c)
			{
				c.preventDefault();
				c.stopPropagation();
				b.cache.activePanel && b.cache.activePanel._skel_panels_close()
			});
			b.cache.pageWrapper.bind("click.lock",
				function(c)
				{
					c.preventDefault();
					c.stopPropagation();
					b.cache.activePanel && b.cache.activePanel._skel_panels_close()
				});
			b.cache.pageWrapper.bind("scroll.lock", function(c)
			{
				c.preventDefault();
				c.stopPropagation();
				b.cache.activePanel && b.cache.activePanel._skel_panels_close()
			});
			b.cache.window.bind("orientationchange.lock", function(c)
			{
				b.cache.activePanel && b.cache.activePanel._skel_panels_close()
			});
			b._.vars.isTouch || (b.cache.window.bind("resize.lock", function(c)
				{
					b.cache.activePanel && b.cache.activePanel._skel_panels_close()
				}),
				b.cache.window.bind("scroll.lock", function(c)
				{
					b.cache.activePanel && b.cache.activePanel._skel_panels_close()
				}))
		},
		unlockView: function(e)
		{
			b._.vars.isTouch && b.cache.body.css("overflow-" + e, "visible");
			b.cache.pageWrapper.unbind("touchstart.lock");
			b.cache.pageWrapper.unbind("click.lock");
			b.cache.pageWrapper.unbind("scroll.lock");
			b.cache.window.unbind("orientationchange.lock");
			b._.vars.isTouch || (b.cache.window.unbind("resize.lock"), b.cache.window.unbind("scroll.lock"))
		},
		resumeElement: function(e)
		{
			b.cache[e.type +
				"s"][e.id].find("*").each(function()
			{
				b.parseResume(jQuery(this))
			})
		},
		suspendElement: function(e)
		{
			e = b.cache[e.type + "s"][e.id];
			e._skel_panels_translateOrigin();
			e.find("*").each(function()
			{
				b.parseSuspend(jQuery(this))
			})
		},
		initElement: function(e)
		{
			var c = e.config,
				d = jQuery(e.object),
				h;
			b.cache[e.type + "s"][e.id] = d;
			d._skel_panels_init();
			d.find("*").each(function()
			{
				b.parseInit(jQuery(this))
			});
			switch (e.type)
			{
				case "panel":
					d.addClass("skel-panels-panel").css("z-index", b.config.baseZIndex).css("position", "fixed").hide();
					d.find("a").css("-webkit-tap-highlight-color", "rgba(0,0,0,0)").bind("click.skel-panels", function(c)
					{
						if (b.cache.activePanel)
						{
							c.preventDefault();
							c.stopPropagation();
							c = jQuery(this);
							var d = c.attr("href");
							b.cache.activePanel._skel_panels_close();
							c.hasClass("skel-panels-ignoreHref") || window.setTimeout(function()
							{
								window.location.href = d
							}, b.config.speed + 10)
						}
					});
					"ios" == b._.vars.deviceType && d.find("input,select,textarea").focus(function(c)
					{
						var d = jQuery(this);
						c.preventDefault();
						c.stopPropagation();
						window.setTimeout(function()
						{
							var c =
								b.cache.window._skel_panels_scrollPos,
								g = b.cache.window.scrollTop() - c;
							b.cache.window.scrollTop(c);
							b.cache.activePanel.scrollTop(b.cache.activePanel.scrollTop() + g);
							d.hide();
							window.setTimeout(function()
							{
								d.show()
							}, 0)
						}, 100)
					});
					switch (c.position)
					{
						case "top":
						case "bottom":
							var f = "bottom" == c.position ? "-" : "";
							d.addClass("skel-panels-panel-" + c.position).data("skel-panels-panel-position", c.position).css("height", b.recalcH(c.size)).scrollTop(0);
							b._.vars.isTouch ? d.css("overflow-y", "scroll").css("-webkit-overflow-scrolling",
								"touch").bind("touchstart", function(b)
							{
								d._posY = b.originalEvent.touches[0].pageY;
								d._posX = b.originalEvent.touches[0].pageX
							}).bind("touchmove", function(b)
							{
								b = d._posY - b.originalEvent.touches[0].pageY;
								var c = d.outerHeight(),
									e = d.get(0).scrollHeight - d.scrollTop();
								if (0 == d.scrollTop() && 0 > b || e > c - 2 && e < c + 2 && 0 < b) return !1
							}) : d.css("overflow-y", "auto");
							switch (c.style)
							{
								default: d._skel_panels_open = function()
								{
									d._skel_panels_promote().scrollTop(0).css("left", "0px").css(c.position, "-" + b.recalcH(c.size) + "px").css("height",
										b.recalcH(c.size)).css("width", "100%").show();
									c.resetScroll && d.scrollTop(0);
									c.resetForms && d._skel_panels_resetForms();
									b.lockView("y");
									window.setTimeout(function()
									{
										d.add(b.cache.fixedWrapper.children()).add(b.cache.pageWrapper)._skel_panels_translate(0, f + b.recalcH(c.size));
										b.cache.activePanel = d
									}, 100)
								},
								d._skel_panels_close = function()
								{
									d.find("*").blur();
									d.add(b.cache.pageWrapper).add(b.cache.fixedWrapper.children())._skel_panels_translateOrigin();
									window.setTimeout(function()
									{
										b.unlockView("y");
										d._skel_panels_demote().hide();
										b.cache.activePanel = null
									}, b.config.speed + 50)
								}
							}
							break;
						case "left":
						case "right":
							switch (f = "right" == c.position ? "-" : "", d.addClass("skel-panels-panel-" + c.position).data("skel-panels-panel-position", c.position).css("width", b.recalcW(c.size)).scrollTop(0), b._.vars.isTouch ? d.css("overflow-y", "scroll").css("-webkit-overflow-scrolling", "touch").bind("touchstart", function(b)
							{
								d._posY = b.originalEvent.touches[0].pageY;
								d._posX = b.originalEvent.touches[0].pageX
							}).bind("touchmove", function(b)
							{
								var e = d._posX - b.originalEvent.touches[0].pageX;
								b = d._posY - b.originalEvent.touches[0].pageY;
								var f = d.outerHeight(),
									h = d.get(0).scrollHeight - d.scrollTop();
								if (c.swipeToClose && 20 > b && -20 < b && ("left" == c.position && 50 < e || "right" == c.position && -50 > e)) return d._skel_panels_close(), !1;
								if (0 == d.scrollTop() && 0 > b || h > f - 2 && h < f + 2 && 0 < b) return !1
							}) : d.css("overflow-y", "auto"), c.style)
							{
								default: d._skel_panels_open = function()
								{
									d._skel_panels_promote().scrollTop(0).css("top", "0px").css(c.position, "-" + b.recalcW(c.size) + "px").css("width", b.recalcW(c.size)).css("height", "100%").show();
									c.resetScroll && d.scrollTop(0);
									c.resetForms && d._skel_panels_resetForms();
									b.lockView("x");
									window.setTimeout(function()
									{
										d.add(b.cache.fixedWrapper.children()).add(b.cache.pageWrapper)._skel_panels_translate(f + b.recalcW(c.size), 0);
										b.cache.activePanel = d
									}, 100)
								};d._skel_panels_close = function()
								{
									d.find("*").blur();
									d.add(b.cache.fixedWrapper.children()).add(b.cache.pageWrapper)._skel_panels_translateOrigin();
									window.setTimeout(function()
										{
											b.unlockView("x");
											d._skel_panels_demote().hide();
											b.cache.activePanel = null
										},
										b.config.speed + 50)
								};
								break;
								case "reveal":
										d._skel_panels_open = function()
									{
										b.cache.fixedWrapper._skel_panels_promote(2);
										b.cache.pageWrapper._skel_panels_promote(1);
										d.scrollTop(0).css("top", "0px").css(c.position, "0px").css("width", b.recalcW(c.size)).css("height", "100%").show();
										c.resetScroll && d.scrollTop(0);
										c.resetForms && d._skel_panels_resetForms();
										b.lockView("x");
										window.setTimeout(function()
										{
											b.cache.pageWrapper.add(b.cache.fixedWrapper.children())._skel_panels_translate(f + b.recalcW(c.size), 0);
											b.cache.activePanel =
												d
										}, 100)
									},
									d._skel_panels_close = function()
									{
										d.find("*").blur();
										b.cache.pageWrapper.add(b.cache.fixedWrapper.children())._skel_panels_translateOrigin();
										window.setTimeout(function()
										{
											b.unlockView("x");
											d.hide();
											b.cache.pageWrapper._skel_panels_demote();
											b.cache.pageWrapper._skel_panels_demote();
											b.cache.activePanel = null
										}, b.config.speed + 50)
									}
							}
					}
					break;
				case "overlay":
					d.css("z-index", b.config.baseZIndex).css("position", "fixed").addClass("skel-panels-overlay"), d.css("width", c.width).css("height", c.height), (h = b.positions.overlays[c.position]) ||
						(c.position = "top-left", h = b.positions.overlays[c.position]), d.addClass("skel-panels-overlay-" + c.position).data("skel-panels-overlay-position", c.position), b._.iterate(h, function(e)
						{
							d.css(e, h[e]);
							"50%" == h[e] && ("top" == e ? d.css("margin-top", "-" + b.getHalf(c.height)) : "left" == e && d.css("margin-left", "-" + b.getHalf(c.width)))
						})
			}
		},
		initElements: function(e)
		{
			var c, d, h, f = [];
			b._.iterate(b.config[e + "s"], function(g)
			{
				c = {};
				b._.extend(c, b.defaults.config[e]);
				b._.extend(c, b.config[e + "s"][g]);
				b.config[e + "s"][g] = c;
				d = b._.newDiv(c.html);
				d.id = g;
				d.className = "skel-panels-" + e;
				c.html || (f[g] = d);
				h = c.breakpoints ? c.breakpoints.split(",") : b._.breakpointList;
				b._.iterate(h, function(f)
				{
					f = b._.cacheBreakpointElement(h[f], g, d, "overlay" == e ? "skel_panels_fixedWrapper" : "skel_panels_defaultWrapper", 2);
					f.config = c;
					f.initialized = !1;
					f.type = e;
					f.onAttach = function()
					{
						this.initialized ? b.resumeElement(this) : (b.initElement(this), this.initialized = !0)
					};
					f.onDetach = function()
					{
						b.suspendElement(this)
					}
				})
			});
			b._.DOMReady(function()
			{
				var c, d;
				b._.iterate(f, function(b)
				{
					c = jQuery("#" +
						b);
					d = jQuery(f[b]);
					c.children().appendTo(d);
					c.remove()
				})
			})
		},
		initJQueryUtilityFuncs: function()
		{
			jQuery.fn._skel_panels_promote = function(c)
			{
				this._zIndex = this.css("z-index");
				this.css("z-index", b.config.baseZIndex + (c ? c : 1));
				return this
			};
			jQuery.fn._skel_panels_demote = function()
			{
				this._zIndex && (this.css("z-index", this._zIndex), this._zIndex = null);
				return this
			};
			jQuery.fn._skel_panels_xcssValue = function(b, d)
			{
				return jQuery(this).css(b, "-moz-" + d).css(b, "-webkit-" + d).css(b, "-o-" + d).css(b, "-ms-" + d).css(b, d)
			};
			jQuery.fn._skel_panels_xcssProperty =
				function(b, d)
				{
					return jQuery(this).css("-moz-" + b, d).css("-webkit-" + b, d).css("-o-" + b, d).css("-ms-" + b, d).css(b, d)
				};
			jQuery.fn._skel_panels_xcss = function(b, d)
			{
				return jQuery(this).css("-moz-" + b, "-moz-" + d).css("-webkit-" + b, "-webkit-" + d).css("-o-" + b, "-o-" + d).css("-ms-" + b, "-ms-" + d).css(b, d)
			};
			jQuery.fn._skel_panels_resetForms = function()
			{
				var b = jQuery(this);
				jQuery(this).find("form").each(function()
				{
					this.reset()
				});
				return b
			};
			jQuery.fn._skel_panels_initializeCell = function()
			{
				var b = jQuery(this);
				b.attr("class").match(/(\s+|^)([0-9]+)u(\s+|$)/) &&
					b.data("cell-size", parseInt(RegExp.$2))
			};
			jQuery.fn._skel_panels_expandCell = function()
			{
				var b = jQuery(this),
					d = 12;
				b.parent().children().each(function()
				{
					var b = jQuery(this).attr("class");
					b && b.match(/(\s+|^)([0-9]+)u(\s+|$)/) && (d -= parseInt(RegExp.$2))
				});
				0 < d && (b._skel_panels_initializeCell(), b.css("width", 100 * ((b.data("cell-size") + d) / 12) + "%"))
			};
			if (b.config.useTransform && 10 <= b._.vars.IEVersion && (!b.config.transformBreakpoints || b._.hasActive(b.config.transformBreakpoints.split(",")))) jQuery.fn._skel_panels_translateOrigin =
				function()
				{
					return jQuery(this)._skel_panels_translate(0, 0)
				}, jQuery.fn._skel_panels_translate = function(b, d)
				{
					return jQuery(this).css("transform", "translate(" + b + "px, " + d + "px)")
				}, jQuery.fn._skel_panels_init = function()
				{
					return jQuery(this).css("backface-visibility", "hidden").css("perspective", "500")._skel_panels_xcss("transition", "transform " + b.config.speed / 1E3 + "s ease-in-out")
				};
			else
			{
				var e = [];
				b.cache.window.resize(function()
				{
					if (0 != b.config.speed)
					{
						var c = b.config.speed;
						b.config.speed = 0;
						window.setTimeout(function()
						{
							b.config.speed =
								c;
							e = []
						}, c)
					}
				});
				jQuery.fn._skel_panels_translateOrigin = function()
				{
					for (var c = 0; c < this.length; c++)
					{
						var d = this[c],
							h = jQuery(d);
						e[d.id] && h.animate(e[d.id], b.config.speed, "swing", function()
						{
							b._.iterate(e[d.id], function(b)
							{
								h.css(b, e[d.id][b])
							});
							b.cache.body.css("overflow-x", "visible");
							b.cache.pageWrapper.css("width", "auto").css("padding-bottom", 0)
						})
					}
					return jQuery(this)
				};
				jQuery.fn._skel_panels_translate = function(c, d)
				{
					var h, f, g, l;
					c = parseInt(c);
					d = parseInt(d);
					0 != c ? (b.cache.body.css("overflow-x", "hidden"), b.cache.pageWrapper.css("width",
						b.cache.window.width())) : g = function()
					{
						b.cache.body.css("overflow-x", "visible");
						b.cache.pageWrapper.css("width", "auto")
					};
					0 > d ? b.cache.pageWrapper.css("padding-bottom", Math.abs(d)) : l = function()
					{
						b.cache.pageWrapper.css("padding-bottom", 0)
					};
					for (h = 0; h < this.length; h++)
					{
						var k = this[h],
							n = jQuery(k),
							m;
						if (!e[k.id])
							if (m = b.positions.overlays[n.data("skel-panels-overlay-position")]) e[k.id] = m;
							else if (m = b.positions.panels[n.data("skel-panels-panel-position")])
							for (e[k.id] = {}, f = 0; m[f]; f++) e[k.id][m[f]] = parseInt(n.css(m[f]));
						else m = n.position(), e[k.id] = {
							top: m.top,
							left: m.left
						};
						a = {};
						b._.iterate(e[k.id], function(f)
						{
							var g;
							switch (f)
							{
								case "top":
									g = b.recalcH(e[k.id][f]) + d;
									break;
								case "bottom":
									g = b.recalcH(e[k.id][f]) - d;
									break;
								case "left":
									g = b.recalcW(e[k.id][f]) + c;
									break;
								case "right":
									g = b.recalcW(e[k.id][f]) - c
							}
							a[f] = g
						});
						n.animate(a, b.config.speed, "swing", function()
						{
							g && g();
							l && l()
						})
					}
					return jQuery(this)
				};
				jQuery.fn._skel_panels_init = function()
				{
					return jQuery(this).css("position", "absolute")
				}
			}
		},
		initObjects: function()
		{
			b.cache.window = jQuery(window);
			b.cache.window.load(function()
			{
				0 == b.cache.window.scrollTop() && window.scrollTo(0, 1)
			});
			b._.DOMReady(function()
			{
				b.cache.body = jQuery("body");
				b.cache.body.wrapInner('<div id="skel-panels-pageWrapper" />');
				b.cache.pageWrapper = jQuery("#skel-panels-pageWrapper");
				b.cache.pageWrapper.css("position", "relative").css("left", "0").css("right", "0").css("top", "0")._skel_panels_init();
				b.cache.defaultWrapper = jQuery('<div id="skel-panels-defaultWrapper" />').appendTo(b.cache.body);
				b.cache.defaultWrapper.css("height",
					"100%");
				b.cache.fixedWrapper = jQuery('<div id="skel-panels-fixedWrapper" />').appendTo(b.cache.body);
				b.cache.fixedWrapper.css("position", "relative");
				jQuery(".skel-panels-fixed").appendTo(b.cache.fixedWrapper);
				b._.registerLocation("skel_panels_defaultWrapper", b.cache.defaultWrapper[0]);
				b._.registerLocation("skel_panels_fixedWrapper", b.cache.fixedWrapper[0]);
				b._.registerLocation("skel_panels_pageWrapper", b.cache.pageWrapper[0])
			})
		},
		initIncludes: function()
		{
			b._.DOMReady(function()
			{
				jQuery(".skel-panels-include").each(function()
				{
					b.parseInit(jQuery(this))
				})
			})
		},
		init: function()
		{
			b.eventType = b._.vars.isTouch ? "touchend" : "click";
			b.initObjects();
			b.initJQueryUtilityFuncs();
			b.initElements("overlay");
			b.initElements("panel");
			b.initIncludes();
			b._.updateState()
		}
	};
	return b
}());