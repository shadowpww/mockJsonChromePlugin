const https = require('https');
const fs = require('fs');
const path = require('path');
const common = require('./common');

const repositoryURL =
  'https://apihelper.oa.com/#/repository/328/805934?version=7374&moduleId=0';
const targetController = ['CodeBatchController']; //预期选择的后台控制器
const targetUrl = []; //预期选择的URl

function getRepositoryParams(url) {
  const reg = /repository\/(\d*)\/[\W\w]*/i;
  const matches = repositoryURL.match(reg);
  const [, ProjectId] = matches;
  const [, query] = url.split('?');
  let VersionId, ModuleId;

  if (query) {
    const queryArrays = query.split('&');
    for (let v of queryArrays) {
      const [key, value] = v.split('=');
      key === 'version' && (VersionId = value);
      key === 'moduleId' && (ModuleId = value);
    }
  }
  const params = {
    VersionId,
    ProjectId,
    ModuleId
  };
  return params;
}

function filterTargetUrl(source, targetController, targetUrl) {
  if (Array.isArray(targetController) && targetController.length > 0) {
    source = source.filter(api => {
      return targetController.includes(api.Group);
    });
  }
  if (Array.isArray(targetUrl) && targetUrl.length > 0) {
    source = source.filter(api => {
      return targetUrl.includes(api.Route);
    });
  }
  return source;
}

/**
 *
 * @param ·apihelper上拉取接口列表时，必须的业务参数
 * 在这里拿到 业务的api列表。
 */
function getApiList(params) {
  const { ModuleId, VersionId, ProjectId } = params;
  const query = JSON.stringify({
    Limit: 1000,
    ModuleId: +ModuleId,
    VersionId: +VersionId,
    ProjectId: +ProjectId,
    Offset: 0
  });
  const options = {
    ...common.options,
    ...{ method: 'POST', path: '/api/pub/api/list' }
  };
  let body = [];
  const req = https.request(options, res => {
    res
      .on('data', chunk => {
        body.push(chunk);
      })
      .on('end', () => {
        if (!body.length) {
          console.log('获取接口列表信息失败，请检查登录信息后重试');
          return;
        }
        responseData = JSON.parse(Buffer.concat(body).toString());
        //这里已经拿到的所有接口的数据。
        const {
          Response: {
            Data: { List }
          }
        } = responseData;
        //过滤掉不需要拉取的url接口
        const filterList = filterTargetUrl(
          List.slice(),
          targetController,
          targetUrl
        );
        getSingleApiMockData(filterList, params);
      });
  });
  req.on('error', error => {
    console.error('error1', error);
  });
  req.write(query);
  req.end();
}

/**
 *
 * @param {array} List  拉取的业务api列表
 * @param {number} ProjectId 项目ID
 * @param {Set} bizApiList 需要mock的业务api，这里是一个set类型，避免传递时值有重复的
 */
function getSingleApiMockData(List, params) {
  const { ProjectId, VersionId } = params;
  let count = 0; //计数器，是否所有的mock数据请求都已经完成。
  List.forEach(api => {
    const { ApiId } = api;
    const query = JSON.stringify({
      ApiId: +ApiId,
      ProjectId: +ProjectId
    });
    const options = {
      ...common.options,
      ...{ path: '/api/pub/api/detail', method: 'POST' }
    };
    let body = [];
    const req = https.request(options, res => {
      res
        .on('data', chunk => {
          body.push(chunk);
        })
        .on('end', () => {
          responseData = JSON.parse(Buffer.concat(body).toString());
          //这里已经拿到的所有接口的数据。
          const {
            Response: {
              Data: { Method, Url }
            }
          } = responseData;
          //在这里真实的去拉取apihelper上的mock数据
          fs.writeFile(
            path.resolve(__dirname, '../mock', 'apiList.ts'),
            'export default {',
            err => {
              err && console.log('error2', err);
            }
          );
          fetchUrlMockJSON(VersionId, ProjectId, Method, Url).then(() => {
            count++;
            if (count === List.length) {
              fs.appendFile(
                path.resolve(__dirname, '../mock', 'apiList.ts'),
                '}',
                err => {
                  err && console.log('error3', err);
                }
              );
            }
          });
        });
    });
    req.on('error', error => {
      console.error('error4', error);
    });
    req.write(query);
    req.end();
  });
}

function fetchUrlMockJSON(VersionId, ProjectId, Method, url) {
  return new Promise((resolve, reject) => {
    const options = {
      ...common.options,
      ...{
        path: `/api/mock/test/${ProjectId}/default/${VersionId}${url}`,
        method: 'GET'
      }
    };
    let body = [];
    const req = https.get(options, res => {
      res
        .on('data', chunk => {
          body.push(chunk);
        })
        .on('end', () => {
          responseData = JSON.parse(Buffer.concat(body).toString());
          let content = JSON.stringify(responseData);
          content = content.replace(/"code":\s*(\d+)/g, () => {
            return `"code":"Success"`;
          });
          fs.appendFile(
            path.resolve(__dirname, '../mock', 'apiList.ts'),
            `"${Method} ${url}":${content},`,
            err => {
              if (err) {
                console.log('err5', err);
                return;
              }
            }
          );
          resolve();
        });
    });
    req.on('error', error => {
      reject(error);
      console.error('error6', error);
    });
  });
}

const params = getRepositoryParams(repositoryURL);
getApiList(params);
