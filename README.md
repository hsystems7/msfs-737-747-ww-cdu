# MSFS 2024 Winwing CDU Plugin for Asobo 737 MAX and 747-8

## Usage
* Download the folder ```zzz-hsystems-b737-b747-ww-cdu``` and put it into your MSFS 2024 Community folder.
* Make sure you're running the MF beta and properly installed Python [Tutorial](https://docs.mobiflight.com/guides/installing-python/)
* Make sure SimAppPro is NOT running
* Start your flight with either 737 MAX or 747-8
* You should see ```WAIT FOR POWER``` on your CDU
* Turn on the power on the airplane
* Now you should see data on your CDU

## Tested with

MSFS 2024 Version: 1.4.20.0
Mobiflight Version: 10.5.3.7

| CDU | MSFS 2024 |
| -------- | ------- |
| WW MCDU  | :white_check_mark: |
| WW PFP7 | :white_check_mark: |

It might work with the PFP3. It might not. Since I don't own that unit (and probably never will) I can't test it.

## What this is NOT
This is not a profile for those aircrafts, so you can use the buttons on the WW hardware with those planes. There are already profiles for that on [flightsim.to](https://flightsim.to/).

## Why not the base ASOBO Airbus planes, i.e. A330?
I already tried it. Since those MCDUs are WASM-based, there is no chance to read the data. At least as far as I know. Maybe there are some hacks for that. Maybe not.

## It does not work.
Create an Github issue. I'll try to fix it. No promises though. I am not an expert neither in MSFS development nor in JS. And I'm doing this in my already spare free time. So please bear with me.

## Credits
All this work would not have been possible without them:
* https://github.com/dementedmonkey - parsing CDU data from 737 MAX to a webbrowser, among other planes.
* https://github.com/tracernz - parsing WT FMC data to WW CDUs
