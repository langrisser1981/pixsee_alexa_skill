const axios = require('axios').default;

const userRequest = axios.create({
    baseURL: 'https://staging.ipg-services.com/api/v1'
})
module.exports.apiSetToken = (token) => userRequest.defaults.headers.common['Authorization'] = token;

module.exports.apiUserLogin = (data) => userRequest.post('/authorization/login', data);
module.exports.apiUserInfo = () => userRequest.get('/accounts/limit_info')
module.exports.apiBabyInfo = (openId) => userRequest.get(`/babies?openid=${openId}`)
module.exports.apiDeviceInfo = (babyId) => userRequest.get(`/devices?babyid=${babyId}`)
module.exports.apiBindToCloud = (data) => userRequest.post(`/authorization/get_token/avs`, data)
module.exports.apiGetStreamURI = (sn) => userRequest.get(`/devices/${sn}/rtsp`)
module.exports.apiSendIOTCmd = (sn, payload) => userRequest.put(`/settings/c/${sn}`, payload)