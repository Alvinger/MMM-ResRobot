/* Resrobot - Timetable for ResRobot Module */

/* Magic Mirror
 * Module: MMM-ResRobot
 *
 * By Johan Alvinger https://github.com/Alvinger
 * based on a script by Benjamin Angst http://www.beny.ch which is
 * based on a script from Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
const Log = require("../../js/logger.js");
const NodeHelper = require("node_helper");
const moment = require("moment");
module.exports = NodeHelper.create({

	// Define start sequence.
	start: function() {
		Log.info("Starting node_helper for module: " + this.name);
		// Set locale.
		moment.locale(config.language);
		this.started = false;
	},

	// Receive notification
	socketNotificationReceived: function(notification, payload) {
   		Log.info("node_helper for " + this.name + " received a socket notification: " + notification + " - Payload: " + JSON.stringify(payload, null, 2));
		if (notification === "CONFIG") { // && this.started == false) {
			this.config = payload;
			this.started = true;
			this.departures = [];
			this.updateDepartures();
		}
	},

	/* updateDepartures()
	 * Check current departures and remove old ones. Requests new departure data if needed.
	 */
	updateDepartures: function() {
		var self = this;
		var now = moment();
		var cutoff = now.clone().add(moment.duration(this.config.skipMinutes, "minutes"));

		// Sort current departures by routeId and departure time (descending)
		this.departures.sort(function(a, b) {
			if (a.routeId < b.routeId) return -1;
			if (a.routeId > b.routeId) return 1;
			if (a.timestamp < b.timestamp) return 1;
			if (a.timestamp > b.timestamp) return -1;
			return 0;
 		});

		// Loop through current departures (by route) and skip old ones
		var routeId = "";
		var departures = [];
		for (var d in this.departures) {
			var dep = this.departures[d];
			// New route, save id and initialize departures for the route
			if (dep.routeId !== routeId) {
				routeId = dep.routeId;
				departures[routeId] = [];
			}
			// Only keep departures if they occur after current time + minutes to skip
			// If old departure is found then we clear all saved departures for that route
			var departureTime = moment(dep.timestamp);
			if (departureTime.isAfter(cutoff)) {
				departures[routeId].push(dep);
			} else {
				departures[routeId] = [];
			}
		}

		// Clear departure list
		this.departures = [];
		// Loop through all routes in config
		// If a route is missing departures, get departures for the route
		// If a route has departures, save them to output
		var getRoutes = [];
		for (var routeId in this.config.routes) {
			if (typeof departures[routeId] == 'undefined' || departures[routeId].length == 0) {
				// Get current list of departures between from and to
				var params = { "id": this.config.routes[routeId].from };
				if (typeof this.config.routes[routeId].to == "string" && this.config.routes[routeId].to !== "") {
					params["direction"] = this.config.routes[routeId].to;
				}
				var url = this.createURL(params);
				getRoutes.push({"routeId": routeId, "url": url});
			} else {
				for (d in departures[routeId]) {
					// Recalculate waitingTime
					departures[routeId][d].waitingTime = moment(departures[routeId][d].timestamp).diff(now, "minutes");
					Log.debug("WaitingTime: " + departures[routeId][d].waitingTime);
					this.departures.push(departures[routeId][d]);
				}
			}
		}
		// Array getRoutes contains id and url for each route that we need to retrieve departures for
		if (getRoutes.length == 0) {
			// Output departures and schedule update
			this.sendDepartures();
		} else {
			var getRouteDepartures = getRoutes.map( (r) => {
				return (async () => {
					const response = await fetch(r.url);
					const json = await response.json();
					json.routeId = r.routeId;
					self.saveDepartures(json);
					return json;
				})();
			})

			Promise.all(getRouteDepartures)
			.then( () => {
				self.sendDepartures();
			});
		}
	},

	/* saveDepartures(data, routeId)
	 * Uses the received data to set the various values.
	 *
	 * argument data object - departure data in JSON format
	 */
	saveDepartures: function(data) {
		var now = moment();
		var routeId = data.routeId;
		for (var i in data.Departure) {
			var departure = data.Departure[i];
			var departureTime = moment(departure.date + "T" + departure.time);
			var waitingTime = departureTime.diff(now, "minutes");
			var departureTransportNumber = departure.ProductAtStop.num; //departure.transportNumber;
			var departureTo = departure.direction;
			var departureType = departure.ProductAtStop.catOutS; //departure.Product.catOutS;
			// If truncation is requested, truncate ending station at first word break after n characters
			if (this.config.truncateAfter > 0) {
				if (departureTo.indexOf(" ",this.config.truncateAfter) > 0)  {
					departureTo = departureTo.substring(0, departureTo.indexOf(" ",this.config.truncateAfter));
				}
			}
			// If truncation of line number is requested, truncate line number after n characters
			if (this.config.truncateLineAfter > 0) {
				departureTransportNumber = departureTransportNumber.substring(0, this.config.truncateLineAfter);
			}
			// Save dparture (if it is after now + skipMinutes)
			if (departureTime.isSameOrAfter(now.clone().add(moment.duration(config.skipMinutes, 'minutes')))) {
				this.departures.push({
					routeId: routeId,				// Id for route, used for sorting
					timestamp: departureTime,			// Departure timestamp, used for sorting
					departureTime: departureTime.format("HH:mm"),	// Departure time in HH:mm, used for display
					waitingTime: waitingTime,			// Relative time until departure (formatted by moment)
					line: departureTransportNumber,			// Line number/name of departure
					track: departure.rtTrack,			// Track number/name of departure
					type: departureType,				// Short category code for departure
					to: departureTo					// Destination/Direction
				});
			}
		}
	},
	/* sendDepartures()
	 * Output departures notification and schedule next update.
	 */
	sendDepartures: function() {
		// Notify the main module that we have a list of departures
		// Schedule update
		if (this.departures.length > 0) {
			// Sort departures by ascending time
			this.departures.sort(function(a, b) {
				if (a.timestamp < b.timestamp) return -1;
				if (a.timestamp > b.timestamp) return 1;
				return 0;
 			});
			this.sendSocketNotification("DEPARTURES", this.departures);
		}
		this.scheduleUpdate();
	},

	/* createURL()
	 * Generates a base url with api parameters based on the config.
	 *
	 * argument params object - an array of key: value pairs to add to url
	 *
	 * return String - URL.
	 */
	createURL: function(params) {
		var url = this.config.apiBase;
		url +="&accessId=" + encodeURIComponent(this.config.apiKey);
		if (this.config.maximumDuration !== "") {
			url += "&duration=" + encodeURIComponent(this.config.maximumDuration);
		}
		if (this.config.maximumEntries !== "") {
			url += "&maxJourneys=" + encodeURIComponent(this.config.maximumEntries);
		}
		for (var key in params) {
			url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
		}
		return url;
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
			self.updateDepartures();
		}, nextLoad);
	}
});
