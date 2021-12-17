const csv2json = require("csvtojson");
const { log } = require('./tools.js');
const { getUserData } = require('./pixsee.js');
const { apiDeleteDevice, apiTUTKquery } = require('./api');

const readUserData = (filename) => {
    return new Promise((resolve, reject) => {
        let path = `${resourcePath}/${filename}.csv`;

        csv2json().fromFile(path)
            .then((jsonObj) => {
                // 資料順序是裝置序號以及使用者信箱
                resolve(jsonObj);
            })
    })
}

const removeDeviceFromPixsee = async (deviceId) => {
    try {
        res = await apiDeleteDevice(deviceId);
        if (res.data.code == 0) {
            log(2, `裝置已從仁寶雲解綁: ${deviceId}`);
        }

    } catch (error) {
        log(4, error);
    }
}

const removeDeviceFromTUTK = async () => {
    try {
        let data;

        // 取得使用者資訊
        data = 'query {\n\tget_account{\n\t\tpk,vendor,uid,nickname,name,email,lang,created,updated,last_login,is_active\n\t}\n}';
        res = await apiTUTKquery(data);
        let user = res.data.data.get_account;
        log(2, `使用者資料:, ${JSON.stringify(user)}`);

        // 取得使用者裝置
        data = 'query {\n\tget_device_list{\n\t\tvendor,created,updated,account,udid,thumbnail,channel,color_tag,nickname,st,uid,credential,fw_ver\n\t}\n}';
        res = await apiTUTKquery(data);
        let deviceList = res.data.data.get_device_list;
        log(2, `使用者裝置列表:, ${JSON.stringify(deviceList)}`);

        // 解綁裝置
        for (device of deviceList) {
            // 取得udid
            let udid = device.udid;
            log(2, `使用者裝置識別碼:, ${JSON.stringify(udid)}`)

            data = `mutation {\n\tremove_device(udid:"${udid}")\n}`;
            res = await apiTUTKquery(data);
            log(2, `裝置已從TUTK解綁:, ${udid}`);
        }

    } catch (error) {
        log(4, error);
    }
}

const handler = async (sn, mail) => {
    let user = await getUserData(sn, mail);

    // 從TUTK解綁
    log(2, `從TUTK解綁`);
    await removeDeviceFromTUTK();

    // 從仁寶雲解綁
    log(2, `從仁寶雲解綁`);
    for (baby of user.babylist) {
        for (device of baby.devicelist) {
            await removeDeviceFromPixsee(device.deviceId);
        }
    }
}


async function mainFunction() {
    // 標記程式開始運作的時間
    let startTime = new Date().getTime();

    // 從外部檔案讀取使用者資料
    const users = await readUserData(userListCSV);

    // 解綁找到的每個使用者
    let i = 0;
    for (let user of users) {
        i++;
        log(2, `開始解綁第 ${i} 位使用者`);
        const res = await handler(user.sn, user.mail);
        log(2, `第 ${i} 位使用者解綁完成`);
        log(2, ``);
    }

    // 處理完成
    log(2, '...Done');
    // 計算總耗時
    let endTime = new Date().getTime();
    let cost = endTime - startTime;
    log(2, `總共花了 ${cost / 1000} 秒`)

    return;
}

const resourcePath = './'
const userListCSV = ['sn'];
mainFunction();