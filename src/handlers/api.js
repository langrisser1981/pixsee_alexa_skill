const axios = require('axios').default;

/* 
baseURL = 'https://api.ipg-services.com/api/v1'
        'Authorization': 'Bearer HOaz3B6fozO95JT5h0A3RoYnRZfH0KimmNtY'
baseURL = 'https://staging.ipg-services.com/api/v1'
        'Authorization': 'Bearer HOaz3B6fozO95JT5h0A3RoYnRZfH0KimmNtY'
baseURL = 'https://api.pixseecare.com.cn/api/v1'
        'Authorization': 'Bearer MmUzOTY4NGYtZTVhYy00NzM3LWIyNzktYzU3OTQxMDg4MTUz'
 */
baseURL = 'https://staging.ipg-services.com/api/v1'
const adminRequest = axios.create({
    baseURL: baseURL,
    headers: {
        'Authorization': 'Bearer HOaz3B6fozO95JT5h0A3RoYnRZfH0KimmNtY'
    }
})

/* 
    baseURL: 'https://asia-vsaasapi-tutk.kalayservice.com/vsaas/api/v1',
    baseURL: 'https://asia-vpapi-tutk-stg.kalay.us/vsaas/api/v1/',
    baseURL: 'https://cn-vsaasapi-tutk.kalay.net.cn',
let realm = 'BIOSLAB';
let realm = 'BIOSLAB-stg';
 */
const tutkRequest = axios.create({
    baseURL: 'https://asia-vpapi-tutk-stg.kalay.us/vsaas/api/v1/',
})
let realm = 'BIOSLAB-stg';

module.exports.apiGetGrantCode = (sn) => adminRequest.delete(`/admin/some_devices?sn=${sn}`);

module.exports.apiTUTKGetToken = (data) => tutkRequest.post(`/auth/oauth_token?realm=${realm}`, data);
module.exports.apiTUTKSetToken = (token) => tutkRequest.defaults.headers.common['Authorization'] = token;
module.exports.apiTUTKquery = (data) => tutkRequest.post(`/be/`, data);
module.exports.apiTUTKGetVideoLink = (url, data) => tutkRequest.post(url, data);
module.exports.apiTUTKDownloadVideo = (url) => tutkRequest.get(url, {
    responseType: 'stream'
});

const userRequest = axios.create({
    baseURL: baseURL
})
module.exports.apiSetToken = (token) => userRequest.defaults.headers.common['Authorization'] = token;
module.exports.apiSetBaseUrl = (url) => userRequest.defaults.headers.common['baseUrl'] = url;
module.exports.apiUserLogin = (data) => userRequest.post('/authorization/login', data);
module.exports.apiGetToken = (data, config) => userRequest.post('/authorization/authorize', data, config);
module.exports.apiUserInfo = () => userRequest.get('/accounts/limit_info');
module.exports.apiBabyInfo = (openId) => userRequest.get(`/babies?openid=${openId}`);
module.exports.apiDeviceInfo = (babyId) => userRequest.get(`/devices?babyid=${babyId}`);
module.exports.apiBindToCloud = (data) => userRequest.post(`/authorization/get_token/avs`, data);
module.exports.apiSetUserId = (data) => userRequest.patch(`/authorization/get_token/avs`, data);
module.exports.apiGetStreamURI = (sn) => userRequest.get(`/devices/${sn}/rtsp`);
module.exports.apiGetStreamURI_byDeviceId = (data) => userRequest.get(`/devices/${data}/r`);
module.exports.apiSendIOTCmd = (sn, payload) => userRequest.put(`/settings/c/${sn}`, payload);
module.exports.apiDeleteDevice = (deviceId) => userRequest.delete(`/devices/${deviceId}`);
