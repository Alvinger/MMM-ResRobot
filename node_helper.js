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
   		console.log("node_helper for " + this.name + " received a socket notification: " + notification + " - Payload: " + JSON.stringify(payload));
		if (notification === "CONFIG" && this.started == false) {
			this.config = payload;
			this.started = true;
			this.updateTimetable();
		}
	},

	/* updateTimetable()
	 * Requests new departure data from ResRobot (if no cached data is current).
	 */
	updateTimetable: function() {
		var self = this;
		var now = moment();
		var cutoff = now.add(moment.duration(this.config.skipMinutes, "minutes"));

		// Save all all departures that are still current (Departure time being after cutoff time)
		var currentDepartures = [];
		for (d in this.departures) {
			var departureTime = moment(this.departures[d].timestamp);
			if (departureTime.isAfter(cutoff)) {
				currentDepartures.push(this.departures[d]);
			}
		}

		// If there are still more than CONFIG.MAXIMUMENTRIES left, keep on displaying them
		if (currentDepartures.length > this.config.maximumEntries) {
			console.log('Reusing ' + currentDepartures.length + ' cached departure(s) for module: ' + this.name);
			this.departures = currentDepartures;
			this.displayAndSchedule(this.departures);
		} else {
		// Otherwise, get new departures
			console.log('Fetching new departure data for module: ' + this.name);
			// Clear departure list
			this.departures = [];
			// Process each route (from and to pair)
			for (d in this.config.routes) {
				// Get current list of departures between from and to
				var url = this.getURL() + "&id=" + this.config.routes[d].from;
				if (typeof this.config.routes[d].to === "string" && this.config.routes[d].to !== "") {
					url += "&direction=" + this.config.routes[d].to;
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
//		if (this.config.maximumEntries !== "") {
//			url += "&maxJourneys=" + this.config.maximumEntries;
//		}
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
			var departureTime = moment(departure.date + "T" + departure.time);
			var waitingTime = moment.duration(departureTime.diff(now));
			var departureTo = departure.direction;
			var departureType = departure.Product.catOutS;
			// If truncation is requested, truncate ending station at first word break after n characters
			if (this.config.truncateAfter > 0) {
				if (departureTo.indexOf(" ",this.config.truncateAfter) > 0)  {
					departureTo = departureTo.substring(0, departureTo.indexOf(" ",this.config.truncateAfter));
				}
			}
			if (departureTime.isSameOrAfter(now.add(moment.duration(config.skipMinutes, 'minutes')))) {
				this.departures.push({
					timestamp: departureTime,			// Departure timestamp, used for sorting
					departuretime: departureTime.format("HH:mm"),	// Departure time in HH:mm, used for display
					waitingtime: waitingTime.get("minutes"),	// Time until departure, in minutes
					line: departure.transportNumber,		// Line number/name of departure
					type: departureType,				// Short category code for departure
					to: departureTo					// Destination/Direction
				});
			}
		}

		// Sort the departures in the order in which they occur timewise
		this.departures.sort(function(a, b) {
			if (a.timestamp < b.timestamp) return -1;
			if (a.timestamp > b.timestamp) return 1;
			return 0;
 		});
		this.displayAndSchedule(this.departures);
	},
	/* displayAndSchedule(departures)
	 * Send a notification to refresh display.
	 *
	 * argument dep object - Departures to send in notification.
	 */
	displayAndSchedule: function(dep) {

		// Notify the main module that we have a list of departures
		// Schedule update to coincide with the first upcoming departure (- skipMinutes)
		// Time between updates should never be more than 1 hour and never less than [update interval]
		if (dep.length > 0) {
			this.sendSocketNotification("DEPARTURES", dep);
			nextUpdate = this.departures[0].timestamp - moment().add(moment.duration(this.config.skipMinutes, "minutes"));
			nextUpdate = Math.min(nextUpdate,(60 * 60 * 1000));
			nextUpdate = Math.max(nextUpdate,this.config.updateInterval);
			this.scheduleUpdate(nextUpdate);
		} else {
			this.scheduleUpdate();
		}
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
