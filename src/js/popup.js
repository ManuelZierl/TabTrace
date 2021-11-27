
// const { CONFIG } = require('./background')


/*chrome.storage.sync.get("color", ({ color }) => {
  // changeColor.style.backgroundColor = color;
  console.log("popup ... ")
});*/


let showNumber_element = document.getElementById("showNumber");
// onclick="checkAddress(this)"
showNumber_element.addEventListener("change", async () => {
    /* let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: setPageBackgroundColor,
    });*/
    //CONFIG.colors = ['red', 'blue']
    //console.log("some of them", CONFIG)
    
    chrome.storage.sync.set({TabTrace_show_numbers: showNumber_element.checked});
    console.log(showNumber_element.checked)
    //console.log(checkbox.srcElement)
    //console.log(checkbox.srcElement.checkbox)
    //console.log(checkbox.checked)
  });