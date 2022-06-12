# MMM-ResRobot

A module for MagicMirror2 (https://github.com/MichMich/MagicMirror) which shows scheduled departures from public transport stop(s) in Sweden. The module
uses the ResRobot API for which you do need to obtain an API key, see below.

# Install

1. Clone repository into `../modules/` inside your MagicMirror folder.
2. Run `npm install` inside `../modules/MMM-ResRobot/` folder
3. Find your Station ID at https://www.trafiklab.se/api/resrobot-reseplanerare/konsol. Select "Location Lookup" as Method and type your station name in "Location Name".
4. Add the module to the MagicMirror config
```
	{
		module: "MMM-ResRobot",
		position: "left",
		header: "Departures",
		config: {
			routes: [
				{from: "", to: ""},	// ResRobot Station IDs of starting and destination station(s). At least one route must be defined.
				{from: "", to: ""},	// "from" is required but "to" is optional (set "to" to empty string to indicate all destinations)
			],
			skipMinutes: 0,		// Skip departures that happens within the next <value> minutes.
			maximumEntries: 6,	// Number of departures to show on screen
			maximumDuration: 360,	// Number of minutes to search for departures
	                getRelative: 0,         // Show relative rather than absolute time when less than <valute> minutes left to departure, 0 = stay absolute
			truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. 0 = no truncation
			truncateLineAfter: 5,	// A value > 0 will truncate line number <value> characters. 0 = no truncation
	                showTrack: true,        // If true, track number will be displayed
			coloredIcons: false,    // Setting this to true will color transportation type icons according to colors in colorTable
			apiKey: ""		// Your ResRobot apiKey
        }
    },
```
# Get API key

You need to obtain your API key here: http://www.trafiklab.se, you want one for API "ResRobot - Pole Schedules 2". Registration is free but required.
