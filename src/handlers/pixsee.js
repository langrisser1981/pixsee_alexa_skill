const { log } = require('./tools.js');
const { apiGetGrantCode, apiSetToken, apiGetToken, apiUserInfo, apiBabyInfo, apiDeviceInfo, apiGetEventList, apiGetPhotoList, apiDownloadPhoto, apiSetBaseUrl, apiDeleteDevice, apiTUTKGetToken, apiTUTKSetToken, apiTUTKquery, apiTUTKGetVideoLink, apiTUTKDownloadVideo } = require('./api');

const getGrantCode = async (sn, mail) => {
    // 用超級使用者取得code
    let code;
    try {
        let res = await apiGetGrantCode(sn);
        let users = res.data.result;

        // 檢查該序號的綁定對象是否有該信箱，有的話就回傳驗證碼
        for (let user of users) {
            if (user.email == mail) {
                code = user.code
                log(2, `授權碼: ${code}`);
            }
        }

    } catch (error) {
        log(4, '該序號無法取得授權碼');
    }

    return code;
}

const getPixseeToken = async (code) => {
    // 取得使用者的金鑰
    let token;
    const data = {
        code: code,
        grant_type: 'authorization_code'
    }

    try {
        let res = await apiGetToken(data);
        token = res.data.access_token;
        token = `Bearer ${token}`;
        log(2, `仁寶雲金鑰: ${token}`);

    } catch (error) {
        log(4, '該序號無法取得仁寶金鑰');
    }

    // 寫入金鑰
    apiSetToken(token);
    return token;
}

const getVsaasToken = async (code) => {
    let token;
    const data = {
        code: code,
        grant_type: 'authorization_code'
    }

    try {
        let res = await apiTUTKGetToken(data);
        token = res.data.access_token;
        token = `Bearer ${token}`;
        log(2, `tutk金鑰: ${token}`);

    } catch (error) {
        log(4, '該序號無法取得VSAAS金鑰');
    }

    // 寫入金鑰
    apiTUTKSetToken(token);
    return token;
}

module.exports.getUserData = async (sn, mail) => {
    log(2, `開始處理 序號: ${sn} 使用者: ${mail} 的資料`);
    const name = mail.split("@")[0];

    let user;
    try {
        // 使用超級使用者權限取得授權碼
        const code = await getGrantCode(sn, mail);

        // 取得兩個服務的金鑰
        const pixseeToken = await getPixseeToken(code);
        const vsaasToken = await getVsaasToken(code);
        // 如果找不到使用者就結束程式並顯示提示
        if ((pixseeToken == undefined) || (vsaasToken == undefined)) {
            log(4, '找不到符合的使用者');
            return;
        }

        // 在仁寶雲取得使用者資訊
        const userInfo = await apiUserInfo();
        user = JSON.parse(JSON.stringify(userInfo.data.result));
        user.babylist = [];

        let openId = user.openId;
        let email = user.email;
        log(2, `使用者識別碼: ${openId}`);
        log(2, `使用者信箱: ${email}`);
        const babyInfo = await apiBabyInfo(openId);
        if (babyInfo.data.result.length > 0) {
            for (const _baby of babyInfo.data.result) {
                let baby = JSON.parse(JSON.stringify(_baby));
                baby.devicelist = [];

                let babyId = baby.babyId;
                let babyName = baby.name;
                log(2, `寶寶識別碼: ${babyId}`);
                log(2, `寶寶名稱: ${babyName}`);
                const deviceInfo = await apiDeviceInfo(babyId);
                if (deviceInfo.data.result.length > 0) {
                    for (const _device of deviceInfo.data.result) {
                        let device = JSON.parse(JSON.stringify(_device));
                        baby.devicelist.push(device);

                        let deviceId = device.deviceId;
                        let sn = device.sn;
                        let locationName = device.locationName;
                        log(2, `裝置識別碼: ${deviceId}`);
                        log(2, `序號: ${sn}`);
                        log(2, `位置: ${locationName}`);
                    }
                }
                user.babylist.push(baby);
            }
        }

    } catch (error) {
        log(4, error);
    } finally {
        log(2, ``);
        return user;
    }
}