/* Resrobot - Timetable for ResRobot Module */

/* Magic Mirror
 * Module: MMM-ResRobot
 *
 * By Benjamin Angst http://www.beny.ch
 * based on a script by Benjamin Angst http://www.beny.ch which is
 * based on a script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("MMM-ResRobot",{

	// Define module defaults
	defaults: {
		maximumEntries: 6,	// Total Maximum Entries to show
		updateInterval: 5 * 60 * 1000,	// Update every 5 minutes.
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25,	// Start on 1/4th of the list.
		initialLoadDelay: 0,	// start delay seconds.
		apiBase: "https://api.resrobot.se/v2/departureBoard?format=json&passlist=0",
		apiKey: "<YOUR RESROBOT API KEY HERE>",
		from: "740020749",	// Starting station ID (or array) from ResRobot, default: Stockholm Central Station (Metro)
		to: "",	// Destination station ID (or array) from ResRobot, default: none
	},

	// Define required styles.
	getStyles: function() {
		return ["MMM-ResRobot.css"];
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
		this.scheduleUpdate(this.config.initialLoadDelay);

		this.updateTimer = null;
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
			wrapper.innerHTML = "Loading departures ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var table = document.createElement("table");
		table.className = "small";

		for (var d in this.departures) {
			var departure = this.departures[d];

			var row = document.createElement("tr");
			table.appendChild(row);

			var depTimeCell = document.createElement("td");
			depTimeCell.className = "departuretime";
			depTimeCell.innerHTML = "(" + departure.departuretime + ")";
			row.appendChild(depTimeCell);

			var depLineCell = document.createElement("td");
			depLineCell.className = "lineno";
			depLineCell.innerHTML = departure.from;
			row.appendChild(depLineCell);

			var depToCell = document.createElement("td");
			depToCell.className = "to";
			depToCell.innerHTML = departure.to;
			row.appendChild(depToCell);

			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = this.departures.length * this.config.fadePoint;
				var steps = this.departures.length - startingPoint;
				if (t >= startingPoint) {
					var currentStep = t - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}

		}

		return table;
	},

	/* updateTimetable(compliments)
	 * Requests new data from openweather.org.
	 * Calls processTrains on succesfull response.
	 */
	updateTimetable: function() {
		var self = this;
		var retry = true;

		// Reset all departures
		this.departures = [];
		var url = this.getURL() + "&id=" + this.config.from;

		var departureRequest = new XMLHttpRequest();
		departureRequest.open("GET", url, true);
		departureRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processDepartures(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.config.id = "";
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect waht so ever...");
					retry = false;
				} else {
					Log.error(self.name + ": Could not load trains.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		departureRequest.send();
	},

	/* getURL()
	 * Generates a base url with api parameters based on the config.
	 *
	 * return String - URL.
	 */
	getURL: function() {
		var url = this.config.apiBase;
		url +="?key=" + this.config.apiKey;
		if (this.config.maximumEntries !== "") {
			url += "&maxJourneys=" + this.config.maximumEntries;
		}

		return url;
	},

	/* processDepartures(data)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - Departure information received from ResRobot.
	 */
	processTrains: function(data) {
		var now = moment();

		for (var i in data.Departure) {
			var departure = data.Departure[i];
			var departureTime = moment(departure.date + " " + departure.time);
			var waitingTime = moment.duration(departureTime.diff(now));
			this.departures.push({
				timestamp: departureTime,	// Departure timestamp, used for sorting
				departuretime: departureTime.format("HH:mm"),	// Departure time in HH:mm, used for display
				waitingtime: waitingTime.get("minutes"),	// Time until departure, in minutes
				line: departure.transportNumber,	// Line number/name of departure
				to: departure.direction	// Destination/Direction
			});
		}

		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
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
			self.updateTimetable();
		}, nextLoad);
	},
});
