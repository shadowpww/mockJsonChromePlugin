// chrome.webRequest.onCompleted.addListener(
//   (details) => {
//     const { url } = details;
//     if (url.indexOf("qa.uma") > -1) {
//       console.log("在这里", details);
//     }
//   },
//   { urls: ["*://*.uma.qq.com/*"], types: ["xmlhttprequest"] },
//   ["extraHeaders", "responseHeaders"]
// );

chrome.extension.onRequest.addListener(({ tabId, args }) => {
  // 在给定tabId的tab页中执行脚本
  chrome.tabs.executeScript(tabId, {
    code: `console.log(...${JSON.stringify(args)});`,
  });
});

chrome.storage.local.set({ mockJSON: "{}" }, function () {
  console.log("清理缓存成功");
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.name == "devtool") {
    if (message.content) {
      var data = JSON.parse(message.content);
      var { api, content, method } = data;
      let p = new Promise((resovle, reject) => {
        chrome.storage.local.get(["mockJSON"], (item) => {
          chrome.storage.local.set(
            {
              mockJSON: JSON.stringify({
                ...JSON.parse(item["mockJSON"] || "{}"),
                [`${method} ${api}`]: JSON.parse(content),
              }),
            },
            function () {
              resovle();
              console.log("保存成功！");
            }
          );
        });
      })
        .then(() => {
          chrome.storage.local.get(["mockJSON"], (item) => {
            console.log(
              "预备发送请求,",
              item,
              typeof item,
              JSON.parse(item["mockJSON"])
            );
            fetch("http://localhost:8005", {
              method: "POST",
              body: JSON.stringify({
                mockJSON: JSON.parse(item["mockJSON"]),
              }),
              headers: {
                "Content-type": "application/json; charset=UTF-8",
              },
            })
              .then((re) => res.json())
              .then(console.log)
              .catch((err) => console.log(err));
          });
        })
        .catch(() => {
          console.log("JSON 数据保存失败");
        });
    }
  }
});
