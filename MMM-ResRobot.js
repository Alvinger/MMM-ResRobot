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
		updateInterval: 5 * 50 * 1000,	// Update every 5 minutes.
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25,	// Start on 1/4th of the list.
		initialLoadDelay: 0,	// start delay seconds.
		apiBase: "https://api.resrobot.se/v2/departureBoard?format=json&passlist=0",
		apiKey: "<YOUR RESROBOT API KEY HERE>",
		from: "740020749",	// Starting station ID (or array) from ResRobot, default: Stockholm Central Station (Metro)
		to: "",	// Destination station ID (or array) from ResRobot, default: none
		maximumEntries: 6,	// Total Maximum Entries to show
		truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. Default: 5
		iconTable: {
			"B": "fa fa-bus",
			"S": "fa fa-subway",
			"J": "fa fa-train",
			"U": "fa fa-subway",
			"F": "fa fa-ship",
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

	// Define start sequence.
	start: function() {
		Log.info("Starting module: " + this.name);

		// Set locale.
		moment.locale(config.language);

		this.departures = [];
		this.loaded = false;
		this.sendSocketNotification("CONFIG", this.config);
		this.scheduleUpdate(this.config.initialLoadDelay);
		this.updateTimer = null;
	},

	socketNotificationReceived: function(notification, payload) {
		Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if (notification === "DEPARTURES") {
			this.departures = payload;
			this.loaded = true;
			this.updateDom();
		}
	},

	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.from === "") {
			wrapper.innerHTML = "Please set the correct Departure-Station name: " + this.name + ".";
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

		for (var d in this.departures) {
			if (d >= this.config.maximumEntries) {
				break;
			}
			var departure = this.departures[d];
console.log(JSON.stringify(departure));

			var row = document.createElement("tr");
			table.appendChild(row);

			var depTimeCell = document.createElement("td");
			depTimeCell.className = "departuretime";
			depTimeCell.innerHTML = departure.departuretime;
			row.appendChild(depTimeCell);

			var depTypeCell = document.createElement("td");
			depTypeCell.className = "linetype";
			var typeSymbol = document.createElement("span");
			typeSymbol.className = this.config.iconTable[departure.type.substring(0,1)];
			depTypeCell.appendChild(typeSymbol);
			row.appendChild(depTypeCell);

			var depLineCell = document.createElement("td");
			depLineCell.className = "lineno";
			depLineCell.innerHTML = departure.line;
			row.appendChild(depLineCell);

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
		return table;
	},
	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.updateDom();
		}, nextLoad);
	},
});
