/* Resrobot - Timetable for ResRobot Module */

/* Magic Mirror
 * Module: MMM-ResRobot
 *
 * By Johan Alvinger https://github.com/Alvinger
 * based on a script by Benjamin Angst http://www.beny.ch which is
 * based on a script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
const NodeHelper = require("node_helper");
const unirest = require("unirest");
const moment = require("moment");

module.exports = NodeHelper.create({

	// Define start sequence.
	start: function() {
		console.log("Starting node_helper for module: " + this.name);

		// Set locale.
		moment.locale(config.language);
		this.started = false;
	},

	// Receive notification
	socketNotificationReceived: function(notification, payload) {
   		console.log("node_helper for " + this.name + " received a socket notification: " + notification + " - Payload: " + payload);
		if (notification === "CONFIG" && this.started == false) {
			this.config = payload;
			this.started = true;
			this.scheduleUpdate(this.config.initialLoadDelay);
		}
	},

	/* updateTimetable()
	 * Requests new departure data from ResRobot.
	 * Calls processDepartures on succesful response.
	 */
	updateTimetable: function() {
		var self = this;

		// Reset all departures
		this.departures = [];

		// Save list of froms and tos in arrays
		var destfrom = this.config.from.split(",");
		var destto   = this.config.to.split(",");

		// Process each from and to pair
		for (var d in destfrom) {
			// Get current list of departures between from and to
			var url = this.getURL() + "&id=" + destfrom[d];
			if (typeof destto[d] === "string" && destto[d] !== "") {
				url += "&direction=" + destto[d];
			}
			unirest.get(url)
			.send()
			.end(function (r) {
				if (r.error) {
					console.log(self.name + " : " + r.error);
					self.scheduleUpdate();
				} else {
					// console.log("body: ", JSON.stringify(r.body));
					self.processDepartures(r.body);
				}
			});
		}
	},

	/* getURL()
	 * Generates a base url with api parameters based on the config.
	 *
	 * return String - URL.
	 */
	getURL: function() {
		var url = this.config.apiBase;
		url +="&key=" + this.config.apiKey;
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
	processDepartures: function(data) {
		var now = moment();

		for (var i in data.Departure) {
			var departure = data.Departure[i];
			var departureTime = moment(departure.date + " " + departure.time);
			var waitingTime = moment.duration(departureTime.diff(now));
			var departureTo = departure.direction;
			var departureType = departure.Product.catOutS;
			// If truncation is requested, truncate ending station at first word break after n characters
			if (this.config.truncateAfter > 0) {
				if (departureTo.indexOf(" ",this.config.truncateAfter) > 0)  {
					departureTo = departureTo.substring(0, departureTo.indexOf(" ",this.config.truncateAfter));
				}
			}
			// Only save departures that occurs in the future (silently skip the past ones)
			if (waitingTime > 0) {
				this.departures.push({
					timestamp: departureTime,	// Departure timestamp, used for sorting
					departuretime: departureTime.format("HH:mm"),	// Departure time in HH:mm, used for display
					waitingtime: waitingTime.get("minutes"),	// Time until departure, in minutes
					line: departure.transportNumber,	// Line number/name of departure
					type: departureType,	// Short category code for departure
					to: departureTo	// Destination/Direction
				});
			}
		}

		// Sort the departures and schedule an update for the first departure
		// If no departures, use standard update interval
		this.departures.sort(function(a, b) {
			if (a.timestamp < b.timestamp) return -1;
			if (a.timestamp > b.timestamp) return 1;
			return 0;
 		});

		if (typeof this.departures[0] !== "undefined" && this.departures.length > 0) {
			// Set delay to the lowest of time until next departure and one hour
			var delay = Math.min(this.departures[0].timestamp - now, 60 * 60 * 1000);
			this.scheduleUpdate(delay);
		} else {
			this.scheduleUpdate();
		}

		// Tell the main module that we have a new list of departures
		this.sendSocketNotification("DEPARTURES", this.departures);
	},

	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update. If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function(delay) {
		var self = this;
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.updateTimetable();
		}, nextLoad);
	}
});
