# MMM-ResRobot

A module for MagicMirror2 (https://github.com/MichMich/MagicMirror) which shows scheduled departures from public transport stop(s) in Sweden. The module
uses the ResRobot API for which you do need to obtain an API key, see below.

# Install

1. Clone repository into `../modules/` inside your MagicMirror folder.
2. Run `npm install` inside `../modules/MMM-ResRobot/` folder
3. Find your Station ID at https://www.trafiklab.se/node/14049/console. Select "Location Lookup" as Method and type your station name in "Location Name".
4. Add the module to the MagicMirror config
```
	{
		module: "MMM-ResRobot",
		position: "left",
		header: "Departures",
		config: {
			from: "",		// ResRobot Station ID (or a comma-separated string of IDs)
			to: "",			// ResRobot Station ID of destination (or a comma-separated string of IDs)
			skipMinutes: 0,		// Skip departures that happens within the next <value> minutes.
			maximumEntries: 6,	// Number of departures to show on screen
			truncateAfter: 5,	// A value > 0 will truncate direction name at first space after <value> characters. 0 = no truncation
			apiKey: ""		// Your ResRobot apiKey
        }
    },
```
# Get API key

You need to obtain your API key here: http://www.trafiklab.se, you want one for API "ResRobot - Pole Schedules 2".
Get it at https://www.trafiklab.se/api/resrobot-stolptidtabeller-2. Registration is free but required.


