// GLOBALS 

let CONFIG = {
    track_last: 2, // the last how many should be shown
    backup_history: 10, // additianalliy soted to track_last: that are used in case tabs are closed
    colors: ["red",  "yellow", "blue", "pink"], // todo: other way around?? or change down their
    show_numbers: true  // show the numbers?
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


async function get_window(window_id) {
    try {
        let window = await chrome.windows.get(parseInt(window_id));
        return window;
    } catch {}
    return undefined
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// GET CONFIG

chrome.storage.sync.get([
    "TabTrace_track_last", 
    "TabTrace_colors", 
    "TabTrace_show_numbers",
    "TabTrace_backup_history"
], ({ TabTrace_track_last, TabTrace_colors, TabTrace_show_numbers, TabTrace_backup_history }) => {
    if (TabTrace_track_last != undefined) {
        CONFIG.track_last = TabTrace_track_last
    }

    if (TabTrace_colors != undefined) {
        CONFIG.colors = TabTrace_colors
    }

    if (TabTrace_show_numbers != undefined) {
        CONFIG.show_numbers = TabTrace_show_numbers
    }

    if (TabTrace_backup_history != undefined) {
        CONFIG.show_numbers = TabTrace_backup_history
    }
});




chrome.tabs.onActivated.addListener(async (tab) => {
    // todo: can we set this down? Or can be do it in a safe way: in a loop that tries as long as it doen not throw an error?
    // todo: this is a bug: is there a nicer way to fix this?
    let success = false;
    while (!success) {
        try {
            await delay(500)
            await main_loop(tab)
            success = true
        }
        catch {}
    }

});

async function main_loop(active_tab) {
    await update_state(active_tab)
    await clear(active_tab.windowId)
    await redraw(active_tab.windowId, active_tab.tabId)
}

async function update_state(active_tab) {
    /**
     * todo: test
     * todo: doc
     */
    let {tabId, windowId} = active_tab;

    for (let window_id in TABS) {
        let window = await get_window(window_id)
        if (window == undefined) {
            // window doesnt exist any more
            delete TABS[window_id]
        } else {
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
    }

    if (windowId in TABS) {
        if (TABS[windowId].length > CONFIG.track_last + CONFIG.backup_history) {
            // needs to be trimmed
            TABS[windowId] = TABS[windowId].slice(0, CONFIG.track_last + CONFIG.backup_history)
            // todo when we trimm: ungroup the rese
        }
        TABS[windowId].tabs.unshift(tabId)
    } else {
        // new window:
        TABS[windowId] = {
            tabs: [tabId]
        } 
    }
}


async function redraw(window_id, active_tab_id) {
    let drawn = new Set()
    let index = 1
    while (drawn.size < CONFIG.track_last) {
        if (index >= TABS[window_id].tabs.length) {
            break;
        }
        let tab_id = TABS[window_id].tabs[index]
        index += 1
        
        if (tab_id == active_tab_id) {
            continue; // dont draw active window
        }

        if (drawn.has(tab_id)) {
            continue; // dont draw twice
        }


        let group_id = await chrome.tabs.group({ tabIds: tab_id });

        let title = ""
        if (CONFIG.show_numbers) {
            title = (drawn.size + 1).toString()
        }

        await chrome.tabGroups.update(group_id, {
            collapsed: false,
            title: title,
            color: CONFIG.colors[drawn.size] // todo: the other way around would be more intuitive
        });
        drawn.add(tab_id)
    }
}

async function clear(window_id) {
    /**
     * todo: test
     * todo: doc
     */
    for (let tab_id of TABS[window_id].tabs) {
        await chrome.tabs.ungroup(tab_id);
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



// HANDLE STATE UPDATES
chrome.storage.onChanged.addListener(async ({TabTrace_show_numbers, TabTrace_track_last}) => {
    if (TabTrace_show_numbers) {
        CONFIG.show_numbers = TabTrace_show_numbers.newValue;
    }

    if (TabTrace_track_last) {
        CONFIG.track_last = TabTrace_track_last.newValue;
    }

    let [active_tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await clear(active_tab.windowId)
    await redraw(active_tab.windowId, active_tab.tabId)
})
