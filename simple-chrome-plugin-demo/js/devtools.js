chrome.devtools.panels.create(
  "myDevTools",
  "icon.png",
  "devtools.html",
  function (panel) {
    console.log("自定义面板创建成功！");
  }
);
const log = (...args) =>
  chrome.extension.sendRequest({
    tabId: chrome.devtools.tabId,
    args,
  });

chrome.devtools.network.onRequestFinished.addListener((request) => {
  request.getContent(function (content, encoding) {
    const { url, method } = request.request;
    if (url.indexOf("mapi.qa.uma.qq.com") > -1) {
      const { code } = JSON.parse(content) || {};
      if (code === "Success") {
        //只有后台接口返回值为成功的时候，才发送给backGround.js去处理
        const reg = /[\w\W]*mapi.qa.uma.qq.com/gi;
        let apiName = url.replace(reg, "");
        chrome.runtime.sendMessage({
          name: "devtool",
          tabId: chrome.devtools.inspectedWindow.tabId,
          content: JSON.stringify({ api: apiName, method: method, content }),
        });
      }
    }
  });
});
