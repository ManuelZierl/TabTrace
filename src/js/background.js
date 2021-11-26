const default_config = {
    track_last: 2,
    colors: ["red", "yellow"], // todo: other way around?
    show_numbers: true // todo: use this
}

let last_n_tab_ids = []

chrome.tabs.onActivated.addListener(function(tab) {
    setTimeout(() => { // todo: this is a bug: is there a nicer way to fix this?
        adjust_tabs(tab)
    }, 500);
});



async function adjust_tabs(tab) {
    // todo: check if the tab is already in a group not handled by TabTrace: if so it should do nothing ...
    // todo: this should be clarified in the doc
    // todo: if a tab appears multiple times it should get the smaller number:
    // todo: if it is the active ine it should never be marked (is confusing)
    last_n_tab_ids.unshift(tab.tabId)
    let outdated = last_n_tab_ids.slice(default_config.track_last + 1)
    last_n_tab_ids = last_n_tab_ids.slice(0, default_config.track_last + 1)
    for (let i = 0; i < outdated.length; i++) {
        try {
            await chrome.tabs.ungroup(outdated[i]);
        }
        catch {}
    }

    for (let i = 1; i < last_n_tab_ids.length; i++) {
        try {
            tab_id = last_n_tab_ids[i];
            await chrome.tabs.ungroup(tab_id);
            group_id = await chrome.tabs.group({ tabIds: tab_id}); // groupId
            chrome.tabGroups.update(group_id, {
                collapsed: false,
                title: i.toString(),
                color: default_config.colors[i%default_config.colors.length]
            });
        }
        catch {}

    }
}