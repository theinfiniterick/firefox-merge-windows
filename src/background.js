async function getCurrentWindows() {
	const currentWindow = await browser.windows.getCurrent();
	const windows = await browser.windows.getAll({});
	return windows.filter((windowObj) => {
		return windowObj.incognito === currentWindow.incognito;
	});
}

async function calculateContextMenu() {
	const windows = await getCurrentWindows();
	const id = "merge-windows";
	browser.contextMenus.remove(id);
	if (windows.length > 1) {
		browser.contextMenus.create({
			id,
			title: "Merge All Windows",
			contexts: ["tab"]
		});
	}
}

async function mergeWindows() {
	const windowMap = new Map();
	const windows = await getCurrentWindows();
	let biggestCount = 0;
	let biggest = null;
	let repin = [];
	const promises = windows.map(async function (windowObj) {
		const tabs = await browser.tabs.query({windowId: windowObj.id});
		windowMap.set(windowObj, tabs.map((tab) => {
			if (tab.pinned) {
				repin.push(browser.tabs.update(tab.id, {pinned: false}));
			}
			return tab.id;
		}));
		if (tabs.length > biggestCount) {
			biggest = windowObj;
			biggestCount = tabs.length;
		}
	});
	await Promise.all(promises);
	const repinTabs = await Promise.all(repin);
	windows.forEach((windowObj) => {
		if (windowObj === biggest) {
			return;
		}
		browser.tabs.move(windowMap.get(windowObj), {index: -1, windowId: biggest.id});
	});
	repinTabs.forEach((tab) => {
		browser.tabs.update(tab.id, {pinned: true});
	});
	calculateContextMenu();
}

browser.contextMenus.onClicked.addListener(() => {
	mergeWindows();
});

browser.windows.onFocusChanged.addListener(() => {
	calculateContextMenu();
});

calculateContextMenu();