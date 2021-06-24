const { apiGetGrantCode, apiSetToken, apiGetToken, apiUserInfo, apiBabyInfo, apiDeviceInfo, apiSetBaseUrl, apiDeleteDevice, apiTUTKGetToken, apiTUTKSetToken, apiTUTKquery } = require('./api');

// if (process.argv.length < 3) {
//     console.log('Usage: node ' + process.argv[1] + ' FILENAME');
//     process.exit(1);
// }

const unbind = async (sn) => {
    // 用超級使用者取得code
    let res = await apiGetGrantCode(sn);
    let result = res.data.result;

    // 檢查每個使用者是否有裝置，有的話就解綁
    for (let element of result) {
        code = element.code
        log("code:", code);
        let data = {
            code: code,
            grant_type: 'authorization_code'
        }
        await removeDeviceFromPixsee(data);
    }
}

const getUserData = async () => {
    let openId, babyId, deviceId, sn;
    openId = babyId = deviceId = sn = 0;
    let babyName, locationName, deviceModel, deviceName;
    babyName = locationName = deviceModel = deviceName = "";

    try {
        let response = await apiUserInfo();
        openId = response.data.result.openId;
        email = response.data.result.email;

        response = await apiBabyInfo(openId);
        if (response.data.result.length > 0) {
            babyId = response.data.result[0].babyId;
            babyName = response.data.result[0].name;
        }

        response = await apiDeviceInfo(babyId);
        if (response.data.result.length > 0) {
            deviceId = response.data.result[0].deviceId;
            sn = response.data.result[0].sn;
            locationName = response.data.result[0].locationName;
            deviceName = response.data.result[0].deviceName;
            deviceModel = response.data.result[0].deviceModel;
        }

    } catch (error) {
        log('ERROR', error);
    } finally {
        return { openId, email, babyId, deviceId, sn, babyName, locationName, deviceName, deviceModel };
    }
}

const removeDeviceFromPixsee = async (data) => {
    /* 
                    'Authorization': 'Basic TVRnNVlXVmlaR1V0WmprNU55MDBZVFUwTFRrMVpqWXRNalJsT0dSbU16QTJOREk1Ok1EZG1PREUxWVdVdFl6WmhaUzAwTmpVM0xUaGxNV0l0WW1KaU5EUmhOV1JrWmpZNA==',
                    'Authorization': 'Basic WTJVMU1HWmlOVFl0WkRGaE5DMDBaVFUwTFdJeVpqZ3RZVEZpTXpJMVlXVmpZakZtOk1XTmlNR1V4TVdJdFpqTmlZeTAwWlRFekxXSmpZbVF0TlRSaVpXWTJPVFJtTVdNMw==',
                    'Authorization': 'Basic TUdKaU1XRTFZamN0TUdZeE5pMDBOamc0TFdJMk9XSXRZemd4WWpBd1pUQXhOMlZqOk9ETmhOekkyWXpFdE1UTmtOQzAwT0dabExXSXhNekF0T0RjNFlUVTVPR0UyT0RKaQ==',
     */
    try {
        // 取得使用者的金鑰
        const config = {
            headers: {
                'Authorization': 'Basic WTJVMU1HWmlOVFl0WkRGaE5DMDBaVFUwTFdJeVpqZ3RZVEZpTXpJMVlXVmpZakZtOk1XTmlNR1V4TVdJdFpqTmlZeTAwWlRFekxXSmpZbVF0TlRSaVpXWTJPVFJtTVdNMw==',
            },
        };
        let res = await apiGetToken(data, config);
        let token = res.data.access_token;
        token = `Bearer ${token}`;
        log('token:', token);
        // 設定金鑰
        apiSetToken(token);

        // 取得裝置清單
        const { email, deviceId } = await getUserData();
        log('deviceId:', deviceId);

        // 使用者底下有裝置才執行
        if (deviceId) {
            res = await apiDeleteDevice(deviceId);

            // 解綁TUTK
            await removeDeviceFromTUTK(data);
            log('delete device:', `${email} , code:${res.data.code}`);
            return;

        } else {
            log('delete device:', `${email} has no device`);
        }
    } catch (error) {
        log('ERROR', error);
    }
}

const removeDeviceFromTUTK = async (data) => {
    try {
        res = await apiTUTKGetToken(data);
        token = res.data.access_token;
        token = `Bearer ${token}`;
        log('tutk:', token);
        apiTUTKSetToken(token);

        // 取得使用者資訊
        data = 'query {\n\tget_account{\n\t\tpk,vendor,uid,nickname,name,email,lang,created,updated,last_login,is_active\n\t}\n}';
        res = await apiTUTKquery(data);
        log('user:', JSON.stringify(res.data))

        // 取得使用者裝置
        data = 'query {\n\tget_device_list{\n\t\tvendor,created,updated,account,udid,thumbnail,channel,color_tag,nickname,st,uid,credential,fw_ver\n\t}\n}';
        res = await apiTUTKquery(data);
        log('device:', JSON.stringify(res.data))
        // 取得udid
        udid = res.data.data.get_device_list[0].udid;
        log('udid', udid);

        // 解綁裝置
        data = `mutation {\n\tremove_device(udid:"${udid}")\n}`;
        res = await apiTUTKquery(data);
        log('device:', JSON.stringify(res.data))
    } catch (error) {
        log('ERROR', error);
    }
}

/**
 * 
 * Pretty logger.
 */
function log(title, msg) {
    console.log(`[${title}] ${msg}`);
}


// Read the file and print its contents.
var filename = './sn.txt';
var fs = require('fs')
// , filename = process.argv[2];
fs.readFile(filename, 'utf8', async (err, data) => {
    if (err) throw err;
    list = data.split('\n').map(Number);
    for (let sn of list) {
        await unbind(sn);
    }
});