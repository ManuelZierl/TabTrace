let showNumber_element = document.getElementById("showNumber");

showNumber_element.addEventListener("change", async () => {    
    chrome.storage.sync.set({
      TabTrace_show_numbers: showNumber_element.checked
    });
});

let trackLast_elements = document.getElementsByName("trackLast");
for (let element of trackLast_elements) {
  element.addEventListener("change", async () => {
    chrome.storage.sync.set({
      TabTrace_track_last: element.value
    });
  })
}

chrome.storage.sync.get([
  "TabTrace_track_last", 
  "TabTrace_show_numbers",
], ({ TabTrace_track_last, TabTrace_show_numbers}) => {
  if (TabTrace_track_last != undefined) {
      document.getElementById("track_last_" + TabTrace_track_last).checked = true;
  }

  if (TabTrace_show_numbers != undefined) {
    showNumber_element.checked = TabTrace_show_numbers
  }
});
