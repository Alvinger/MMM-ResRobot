/* Resrobot - Timetable for ResRobot Module */

/* Magic Mirror
 * Module: MMM-ResRobot
 *
 * By Johan Alvinger https://github.com/Alvinger
 * based on a script by Benjamin Angst http://www.beny.ch which is
 * based on a script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
Module.register("MMM-ResRobot",{

	// Define module defaults
	defaults: {
		updateInterval: 1 * 60 * 1000,	// Update module every minute.
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25,	// Start on 1/4th of the list.
		apiBase: "https://api.resrobot.se/v2/departureBoard?format=json&passlist=0",
		apiKey: "<YOUR RESROBOT API KEY HERE>",
		routes: [
			{from: "740020749", to: ""},	// Each route has a starting station ID from ResRobot, default: Stockholm Central Station (Metro)
		],					// and a destination station ID from ResRobot, default: none
		skipMinutes: 0,		// Skip entries that depart with the next <value> minutes
		maximumEntries: 6,	// Maximum number of departures to display
		truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. 0 = no truncation
		truncateLineAfter: 5,	// A value > 0 will truncate the line number after <value> characters. 0 = no truncation
		showTrack: true,	// If true, track number will be displayed
		getRelative: 0,		// Show relative rather than absolute time when less than <value> minutes left to departure, 0 = stay absolute
		coloredIcons: false,	// Setting this to true will color departure icons according to colors in colorTable
		iconTable: {
			"B": "fa fa-bus",
			"S": "fa fa-subway",
			"J": "fa fa-train",
			"U": "fa fa-subway",
			"F": "fa fa-ship",
		},
		colorTable: {
			"B": "#DA4439",
			"S": "#019CD5",
			"J": "#FDB813",
			"U": "#019CD5",
			"F": "#444400",
		},
	},

	// Define required styles.
	getStyles: function() {
		return ["MMM-ResRobot.css", "font-awesome.css"];
	},

	// Define required scripts.
	getScripts: function() {
		return ["moment.js"];
	},

        // Define required translations.
        getTranslations: function() {
                return {
                        en: "translations/en.json",
                        sv: "translations/sv.json",
                };
        },

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(this.config.language);

		this.initConfig();
	},

	socketNotificationReceived: function(notification, payload) {
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if (notification === "DEPARTURES") {
			this.departures = payload;
			this.loaded = true;
			this.scheduleUpdate(0);
		}
	},

	// Init config
	initConfig: function() {
		this.departures = [];
		this.loaded = false;
		this.sendSocketNotification("CONFIG", this.config);
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.routes === "") {
			wrapper.innerHTML = "Please set at least one route to watch name: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = "Fetching departures ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className = "small";

		var cutoff = moment().add(moment.duration(this.config.skipMinutes, "minutes"));
		var n = 0;
		for (var d in this.departures) {
			if (n >= this.config.maximumEntries) {
				break;
			}
			var departure = this.departures[d];
			if (moment(departure.timestamp).isBefore(cutoff)) {
				continue;
			}
			n++;

			var row = document.createElement("tr");
			table.appendChild(row);

			var depTimeCell = document.createElement("td");
			depTimeCell.className = "departuretime";
			depTimeCell.innerHTML = departure.departureTime;
			if (departure.waitingTime < this.config.getRelative) {
				if (departure.waitingTime > 1) {
					depTimeCell.innerHTML = departure.waitingTime + " " + this.translate("MINUTES_SHORT");
				} else {
					depTimeCell.innerHTML = this.translate("NOW");
				}
			}
			row.appendChild(depTimeCell);

			var depTypeCell = document.createElement("td");
			depTypeCell.className = "linetype";
			var typeSymbol = document.createElement("span");
			typeSymbol.className = this.config.iconTable[departure.type.charAt(0)];
			if (this.config.coloredIcons) {
				if (this.config.colorTable[departure.type]) {
					typeSymbol.setAttribute("style", "color:" + this.config.colorTable[departure.type]);
                                } else {
					typeSymbol.setAttribute("style", "color:" + this.config.colorTable[departure.type.charAt(0)]);
				}
			}
			depTypeCell.appendChild(typeSymbol);
			row.appendChild(depTypeCell);

			var depLineCell = document.createElement("td");
			depLineCell.className = "lineno";
			depLineCell.innerHTML = departure.line;
			row.appendChild(depLineCell);

			if (this.config.showTrack) {
				var depTrackCell = document.createElement("td");
				depTrackCell.className = "trackno";
				depTrackCell.innerHTML = departure.track || " ";
				row.appendChild(depTrackCell);
			}

			var depToCell = document.createElement("td");
			depToCell.className = "to";
			depToCell.innerHTML = departure.to;
			row.appendChild(depToCell);

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
 					this.config.fadePoint = 0;
				}
				var startingPoint = this.config.maximumEntries * this.config.fadePoint;
				var steps = this.departures.length - startingPoint;
				if (d >= startingPoint) {
					var currentStep = d - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}

		}
		if (n === 0) {
			// No departures found so resend config
			this.initConfig();
		}
		return table;
	},
	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, 30 seconds is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = 30000;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setInterval(function() {
			self.updateDom();
		}, nextLoad);
	},
});
