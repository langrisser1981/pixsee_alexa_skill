const axios = require('axios').default;

const userRequest = axios.create({
    baseURL: 'https://staging.ipg-services.com/api/v1'
})

module.exports.apiUserLogin = (data) => userRequest.post('/authorization/login', data);
module.exports.apiUserInfo = (data) => userRequest.get('/accounts/limit_info', data)
