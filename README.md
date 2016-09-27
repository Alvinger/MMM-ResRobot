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
		module: "ResRobot",
		position: "left",
		header: "Departures",
		config: {
			stationID: "",	// Station ID (or an array of stationIDs)
			destinationID: "",	// ID of terminating station
			maximumEntries: "6",	// Number of departures to show
			apiKey: ""	// Your ResRobot apiKey
        }
    },
```
# Get API key

You need to obtain your API key here: http://www.trafiklab.se, you want one for API "ResRobot - Pole Schedules 2". Registration is free but required.


