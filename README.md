# Jellyfin-Remove-NextUp-Items-ClientSide "↺" ❌

## Remove items from Next Up on Jellyfin home page. Client Side, Local storage, userscript Javascript injector plugin

- Click "❌" to remove items
- Click "↺" next to "Next Up" to restaure all items

## Troubleshooting
- Manual console restore : window.NextUpHideRestoreAll()
- Dump : window.NextUpHideDump()
- Force refresh : window.NextUpHideRefresh()
- local storage key : jf-nextup-hider:v6:<serverAddress>:<userId>

It is not compatible with Jellyfin apps that do not use the Jellyfin Web UI & JavaScript Injector.



## Features


## Transparency

- This repository contains a suspicious amount of LLM code.
- Human involvement was required to optimize the process, despite JavaScript repeatedly trying to hurt the human.

## Requirements

- [Jellyfin JavaScript Injector plugin](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

## Screenshots

<br>

<br>



<br>

## Installation

#### 1. Install the *Jellyfin JavaScript Injector* plugin in your Jellyfin server if it is not already installed (may need server reboot).

#### 2. Open the Jellyfin admin ***dashboard***

#### 3. Go to: ***Dashboard*** => ***JS Injector***

#### 4. Create a new injected script

***Add Script*** => Name it *Remove-NextUp-Items-ClientSide* or whatever => Copy/Paste the full [.js script](   ) into the new field => Click ***Enabled*** => Click ***Save***

#### 5. Open and refresh the Jellyfin home page

- You should see "❌" on Next Up items.
- "↺" appear next to "Next Up" to restaure all items

##### Alternatively, if you want to use it only in your web browser, or if you do not want to use the JS Injector plugin, you can install it with an extension like *Violentmonkey*.

## Technical



## Need Help?
- Don't hesitate to open an [issue](https://github.com/Damocles-fr/jellyfin-imdb-episodes-heatmap-ratings-grid/issues)
- **DM me** https://forum.jellyfin.org/u-damocles
- GitHub [**Damocles-fr**](https://github.com/Damocles-fr)
