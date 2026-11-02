// Shared by the server layout (boot script) and the client Display settings.
export const DISPLAY_KEY = "sl-display";
/** Runs before first paint (inlined in <head>) so there is no flash of the wrong size / contrast. */
export const DISPLAY_BOOT = `try{var s=JSON.parse(localStorage.getItem("${DISPLAY_KEY}")||"{}"),d=document.documentElement;if(s.size&&s.size!==100)d.style.fontSize=s.size+"%";if(s.hc)d.classList.add("hc")}catch(e){}`;
