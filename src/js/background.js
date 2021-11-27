// GLOBALS 

let CONFIG = {
    track_last: 2, // the last how many should be shown
    backup_history: 10, // additianalliy soted to track_last: that are used in case tabs are closed
    colors: ["yellow", "red"], // todo: other way around?? or change down their
    show_numbers: true  // todo: use this
}

let TABS = {}

// UTILS

async function filter(arr, callback) {
    const fail = Symbol()
    return (
        await Promise.all(
            arr.map(
                async item => (await callback(item)) ? item : fail
            )
        )
    ).filter(i => i !== fail)
}

// GET CONFIG

chrome.storage.sync.get(["track_last", "colors", "show_numbers"], ({ track_last, colors, show_numbers }) => {
    if (track_last != undefined) {
        CONFIG.track_last = track_last
    }

    if (colors != undefined) {
        CONFIG.colors = colors
    }

    if (show_numbers != undefined) {
        CONFIG.show_numbers = show_numbers
    }
});


chrome.tabs.onActivated.addListener(function(tab) {
    // todo: can we set this down? Or can be do it in a safe way: in a loop that tries as long as it doen not throw an error?
    // todo: this is a bug: is there a nicer way to fix this?
    setTimeout(() => { 
        main_loop(tab)
    }, 500); 
});

async function main_loop(active_tab) {
    await update_state(active_tab)
    await clear()
    await redraw()
}

async function update_state(active_tab) {
    /**
     * todo: test
     * todo: doc
     */
    let {tabId, windowId} = active_tab;

    for (let window_id in TABS) {
        TABS[window_id].tabs = await filter(TABS[window_id].tabs, async (tab_id) => {
            let tab = await get_tab(tab_id)
            if (tab != undefined) {
                if (tab.windowId != window_id) {
                    // is in other window now: ungroup and filter it
                    await chrome.tabs.ungroup(tab_id);
                    return false 
                }
                return true // ok
            } else {
                return false // was deleted
            }
        })
    }

    if (windowId in TABS) {
        if (TABS[windowId].length > CONFIG.track_last + CONFIG.backup_history) {
            // needs to be trimmed
            TABS[windowId] = TABS[windowId].slice(0, CONFIG.track_last + CONFIG.backup_history)
        }
        TABS[windowId].tabs.unshift(tabId)
    } else {
        // new window:
        TABS[windowId] = {
            tabs: [tabId]
        } 
    }
}

async function get_tab(tab_id) {
    /**
     * todo: test
     * todo: doc
     */
    try {
        let tab = await chrome.tabs.get(tab_id);
        return tab;
    } catch {}
    return undefined
}


async function redraw() {
    for (let window_id in TABS) { 
        // for first n that needs to be drawn ...
        for (let i = 1; i < Math.min(TABS[window_id].tabs.length, CONFIG.track_last+1); i++) {
            let tab_id = TABS[window_id].tabs[i]
            
            let group_id = await chrome.tabs.group({ tabIds: tab_id });
            await chrome.tabGroups.update(group_id, {
                collapsed: false,
                title: i.toString(),
                color: CONFIG.colors[i % CONFIG.colors.length] // todo: the other way around would be more intuitive
            });
        }
    }
}

async function clear() {
    /**
     * todo: test
     * todo: doc
     */
    
    for (let window_id in TABS) { 
        for (let tab_id of TABS[window_id].tabs) {
            console.log("remove from group", tab_id)
            await chrome.tabs.ungroup(tab_id);
        }
    }
}

async function configure(options) {
    // change configuration and redraw
    /**
     * --
     */
    
    options = {
        track_last: undefined,
        colors: undefined,
        show_numbers: undefined,
        ...options
    }

    chrome.storage.sync.set({ 
        track_last: options.track_last,
        colors: options.colors,
        show_numbers: options.show_numbers,
     });   

    await redraw()
}

async function reset_config() {
    /**
     * todo: doc
     * todo: test
     */
    chrome.storage.sync.set({ 
        track_last: undefined,
        colors: undefined,
        show_numbers: undefined,
    });    
}                                                         