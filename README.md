# Jellyfin Hide Next Up Items (Client Side) ❌ ↺

## Features
- Remove items from Next Up "❌" on Jellyfin home page.
- Restaure all hidden items "↺"
- Client Side, Local storage, userscript Javascript injector plugin for Jellyfin Web

### BETA VERSION
- Tested with Jellyfin injector plugin and Jellyfin web on Firefox
- compatible with KefinTweaks
- If some Next Up items don't show the "❌", it may be because some episodes are check as watched, mixed with unwatched then watched episodes, not following, of the same TV show. I'm not sure about that.
- It's client side, meaning it don't change nor save anything on your Jellyfin Server, it only try to hide episodes on your browser, and save what to hide in the local storage of the web browser.
- For now, it has only been tested on Firefox and the Jellyfin Android app.
- It does not seem to work on Jellyfin Media Player for Windows. 

#### If if fail and you can't restore with the ↺ icon :
- In firefox, on jellyfin home page, right click and Inspect => Console => Run _window.NextUpHideRestoreAll()_


<p align="center">
  <img src="./assets/RemoveNextUp.webp" alt="Android view" width="800"><br>
</p>


## How to use :
- Click "❌" to remove items
- Click "↺" next to "Next Up" to restaure all hidden items

## Requirements

- [Jellyfin JavaScript Injector plugin](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector)

## Installation

#### 1. Install the *Jellyfin JavaScript Injector* plugin in your Jellyfin server if it is not already installed (may need server reboot).

#### 2. Open the Jellyfin admin ***dashboard***

#### 3. Go to: ***Dashboard*** => ***JS Injector***

#### 4. Create a new injected script

***Add Script*** => Name it *Remove-NextUp-Items-ClientSide* or whatever => Copy/Paste the full [.js script](   ) into the new field => Click ***Enabled*** => Click ***Save***

#### 5. Open and refresh the Jellyfin home page

- You should see an "❌" on Next Up items.
- "↺" appear next to "Next Up" to restaure all hidden items

##### Alternatively, if you want to use it only in your web browser, or if you do not want to use the JS Injector plugin, you can install it with an extension like *Violentmonkey*.

## Troubleshooting & Technical details
- Manual console restore : window.NextUpHideRestoreAll()
- Dump : window.NextUpHideDump()
- Force refresh : window.NextUpHideRefresh()
- local storage key : jf-nextup-hider:v6:<serverAddress>:<userId>
- It is not compatible with Jellyfin apps that do not use the Jellyfin Web UI & JavaScript Injector.

## Transparency

- This repository contains a suspicious amount of LLM code.
- Human involvement was required to optimize the process, despite JavaScript repeatedly trying to hurt the human.

## Need Help?
- Don't hesitate to open an [issue](https://github.com/Damocles-fr/Jellyfin-Remove-NextUp-Items-ClientSide/issues)
- **DM me** https://forum.jellyfin.org/u-damocles
- GitHub [**Damocles-fr**](https://github.com/Damocles-fr)
