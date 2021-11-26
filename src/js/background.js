let config = {
    track_last: 2,
    colors: ["yellow", "red"], // todo: other way around?
    show_numbers: true // todo: use this
}

chrome.storage.sync.get(["track_last", "colors", "show_numbers"], ({ track_last, colors, show_numbers }) => {
    // changeColor.style.backgroundColor = color;
    console.log("==>", track_last, colors, show_numbers)
    if (track_last != undefined) {
        config.track_last = track_last
    }

    if (colors != undefined) {
        config.colors = colors
    }

    if (show_numbers != undefined) {
        config.show_numbers = show_numbers
    }
});



let last_n_tab_ids = []

chrome.tabs.onActivated.addListener(function(tab) {
    setTimeout(() => { // todo: this is a bug: is there a nicer way to fix this?
        foo(tab)
    }, 500);
});

async function foo(tab) {
    console.log(tab.tabId)
    last_n_tab_ids.push(tab.tabId)
    console.log(last_n_tab_ids)
    for (let tab_id of last_n_tab_ids) {
        console.log(tab_id, "-->", await tab_exists(tab_id))
    }

}

async function adjust_tabs(tab) {
    let x = await chrome.tabs.query({});
    console.log("==>", x)
    // todo: check if the tab is already in a group not handled by TabTrace: if so it should do nothing ...
    // todo: this should be clarified in the doc
    // todo: if a tab appears multiple times it should get the smaller number:
    // todo: if it is the active ine it should never be marked (is confusing)
    // todo: doesnt work with multiple windows: every window should have its own trace
    // todo: if a tab is closed: removed it from list before you do the shift ...
    last_n_tab_ids.unshift(tab.tabId)
    let outdated = last_n_tab_ids.slice(config.track_last + 1)
    last_n_tab_ids = last_n_tab_ids.slice(0, config.track_last + 1)
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
            group_id = await chrome.tabs.group({ tabIds: tab_id}); // groupId
            chrome.tabGroups.update(group_id, {
                collapsed: false,
                title: i.toString(),
                color: config.colors[i%config.colors.length] // todo: the other way around would be more intuitive
            });
        }
        catch (e) {
            console.log("debug-error-2", e)
        }

    }
}

async function tab_exists(tab_id) {
    /**
     * checks if the tab with the given tab_id exists returns true/false
     */
    try {
        await chrome.tabs.get(tab_id);
        return true;
    } catch {}
    return false
}


async function redraw() {
    // todo: redraw all current groups
    // basicly what adjust_tabs does
}

async function clear() {
    /**
     * --
     */
    // clear all groups
    // empty list of last pages
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