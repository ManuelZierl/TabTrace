let CONFIG = {
    track_last: 2, // the last how many should be shown
    backup_history: 10, // additianalliy soted to track_last: that are used in case tabs are closed
    colors: ["yellow", "red"], // todo: other way around?? or change down their
    show_numbers: true  // todo: use this
}

/*
let TABS = []
let ACTIVE_TAB = undefined

let queryOptions = { active: true, currentWindow: true };
let [tab] = await chrome.tabs.query(queryOptions);
*/
let TABS = {
    /*
    window_id: {
        tabs: [ list of stored tabs]
    } 
    */
}

chrome.storage.sync.get(["track_last", "colors", "show_numbers"], ({ track_last, colors, show_numbers }) => {
    // changeColor.style.backgroundColor = color;
    console.log("==>", track_last, colors, show_numbers)
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



let last_n_tab_ids = []

chrome.tabs.onActivated.addListener(function(tab) {
    setTimeout(() => { 
        // todo: this is a bug: is there a nicer way to fix this?
        foo(tab)
    }, 500); // todo: can we set this down? Or can be do it in a safe way: in a loop that tries as long as it doen not throw an error?
});

/*
async function foo(tab) {
    // console.log(tab.tabId)
    last_n_tab_ids.push(tab)
    // console.log(last_n_tab_ids)
    for (let tab_id of last_n_tab_ids) {
        console.log(tab_id)
    }
    console.log("--")

}*/

async function adjust_tabs(tab) {
    let x = await chrome.tabs.query({});
    // console.log("==>", x)
    // todo: check if the tab is already in a group not handled by TabTrace: if so it should do nothing ...
    // todo: this should be clarified in the doc
    // todo: if a tab appears multiple times it should get the smaller number:
    // todo: if it is the active ine it should never be marked (is confusing)
    // todo: doesnt work with multiple windows: every window should have its own trace
    // todo: if a tab is closed: removed it from list before you do the shift ...
    last_n_tab_ids.unshift(tab.tabId)
    let outdated = last_n_tab_ids.slice(CONFIG.track_last + 1)
    last_n_tab_ids = last_n_tab_ids.slice(0, CONFIG.track_last + 1)
    for (let i = 0; i < outdated.length; i++) {
        try {
            await chrome.tabs.ungroup(outdated[i]);
        }
        catch (e) {
            console.log("debug-error-1", e)
        }
    }

    for (let i = 1; i < last_n_tab_ids.length; i++) {
        try {
            tab_id = last_n_tab_ids[i];
            await chrome.tabs.ungroup(tab_id);
            group_id = await chrome.tabs.group({ tabIds: tab_id }); // groupId
            chrome.tabGroups.update(group_id, {
                collapsed: false,
                title: i.toString(),
                color: CONFIG.colors[i % CONFIG.colors.length] // todo: the other way around would be more intuitive
            });
        }
        catch (e) {
            console.log("debug-error-2", e)
        }

    }
}

// main loop
// 1. update state -> al exisit and are in correct window
// 2. clear: remove groups for all tabs
// 3. draw: create group for all neede according to config

async function foo(active_tab) {
    await update_state(active_tab)
    await clear()
    await redraw()
}


async function update_state(active_tab) {
    /**
     * todo: test
     * todo: doc
     */
    // handle the state ...
    let {tabId, windowId} = active_tab;

    // iterate over all windows:
    //    filter all tabs: 
    //      - remove not existing
    //      - remove other window + ungroup them: means moved tabs are
    for (let window_id in TABS) {
        TABS[window_id].tabs = TABS[window_id].tabs.filter(async (tab_id) => {
            let tab = get_tab(tab_id)
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
    // todo: redraw all current groups
    // basicly what adjust_tabs does
    for (let window_id in TABS) { 
        // for first n that needs to be drawn ...
        for (let i = 1; i < Math.min(TABS[window_id].tabs.length, CONFIG.track_last+1); i++) {
            let tab_id = TABS[window_id].tabs[i]
            
            group_id = await chrome.tabs.group({ tabIds: tab_id }); 
            
            chrome.tabGroups.update(group_id, {
                collapsed: false,
                title: i.toString(),
                color: CONFIG.colors[i % CONFIG.colors.length] // todo: the other way around would be more intuitive
            });
        }
        /*group_id = await chrome.tabs.group({ tabIds: tab_id });
        
        await chrome.tabs.ungroup(tab_id);*/
        
    }
}

async function clear() {
    /**
     * todo: test
     * todo: doc
     */
    // clear all groups
    // empty list of last pages
    
    for (let window_id in TABS) { 
        for (let tab_id of TABS[window_id].tabs) {
            // todo: QUESTION is it a probelm that there will be defenitly some here that are not in a group:
            //          can i ungroup a tab that is not in a group without anything happening.
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