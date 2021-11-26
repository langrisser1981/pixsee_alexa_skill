const fs = require('fs');
const csv2json = require("csvtojson");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { apiGetGrantCode, apiSetToken, apiGetToken, apiUserInfo, apiBabyInfo, apiDeviceInfo, apiGetEventList, apiSetBaseUrl, apiDeleteDevice, apiTUTKGetToken, apiTUTKSetToken, apiTUTKquery, apiTUTKGetVideoLink, apiTUTKDownloadVideo } = require('./api');

// if (process.argv.length < 3) {
//     console.log('Usage: node ' + process.argv[1] + ' FILENAME');
//     process.exit(1);
// }

const readUserData = (filename) => {
    return new Promise((resolve, reject) => {
        let path = `${resourcePath}/${filename}.csv`;

        csv2json().fromFile(path)
            .then((jsonObj) => {
                // 第一組資料是裝置序號以及使用者信箱，後面才是事件資訊
                const userinfo = jsonObj.shift();

                const sn = Object.keys(userinfo)[0];
                const mail = userinfo[sn];
                // console.log("sn: ", sn)
                // console.log("mail: ", mail)
                console.log(`${filename} : ${sn} : ${mail}`)

                resolve([sn, mail]);
            })
    })
}

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
                // log('grant_code:', code);
            }
        }

    } catch (error) {
        console.log('該序號無法取得授權碼');
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

    const config = {
        headers: {
            'Authorization': 'Basic Wm1Kak1qQmxZall0T0RRd015MDBaV1ppTFdJMFptUXRZakUyWkdNeU16TmhNekZqOllUTXpNelEzTURFdE5tRTFZaTAwTTJOaUxXSXlaall0TURVM05qQmhPREUwWkdWbA==',
        },
    };

    try {
        let res = await apiGetToken(data, config);
        token = res.data.access_token;
        token = `Bearer ${token}`;
        // log('pixsee_token:', token);

    } catch (error) {
        console.log('該序號無法取得仁寶金鑰');
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
        // log('tutk_token:', token);

    } catch (error) {
        console.log('該序號無法取得VSAAS金鑰');
    }

    // 寫入金鑰
    apiTUTKSetToken(token);
    return token;
}

const getUserData = async () => {
    // 取得使用者資料；包含 openId, babyId, deviceId, sn
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
        log('無法在仁寶雲取得使用者資訊', error);
    } finally {
        return { openId, email, babyId, deviceId, sn, babyName, locationName, deviceName, deviceModel };
    }
}

const getPixseeEventList = async (babyId, sdt) => {
    try {
        // 取得事件列表
        res = await apiGetEventList(babyId, sdt);
        let eventList = res.data.result;

        return eventList;

    } catch (error) {
        log('無法在仁寶雲取得事件列表', error);
    }
}

const getVsaasUserInfo = async () => {
    try {
        // 取得使用者資訊
        data = 'query {\n\tget_account{\n\t\tpk,vendor,uid,nickname,name,email,lang,created,updated,last_login,is_active\n\t}\n}';
        res = await apiTUTKquery(data);
        // log('user:', JSON.stringify(res.data))

        // 取得使用者裝置
        data = 'query {\n\tget_device_list{\n\t\tvendor,created,updated,account,udid,thumbnail,channel,color_tag,nickname,st,uid,credential,fw_ver\n\t}\n}';
        res = await apiTUTKquery(data);
        // log('device:', JSON.stringify(res.data))
        // 取得udid
        let udid = res.data.data.get_device_list[0].udid;
        // log('udid:', udid);

        // 解綁裝置
        // data = `mutation {\n\tremove_device(udid:"${udid}")\n}`;
        // res = await apiTUTKquery(data);
        // log('device:', JSON.stringify(res.data))

        // 取得影片伺服器
        data = `query {get_binding_server (udid:"${udid}")}`;
        res = await apiTUTKquery(data);
        let bindingServer = res.data.data.get_binding_server;
        // log('bindingServer:', bindingServer);

        return [udid, bindingServer];

    } catch (error) {
        log('無法在VSAAS取得使用者資訊', error);
    }
}

const getVsaasEventList = async (udid, from, to) => {
    try {
        // 取得事件列表
        data = `query {\n\tget_event_list (device:"${udid}",start_time:"${from}",end_time:"${to}",is_archieve:false){\n\t\tpk,created,updated,account,device,start_time,start_time_ts,thumbnail,event_type,is_archieve,expires,url\n\t}\n}`;
        res = await apiTUTKquery(data);
        let eventList = res.data.data.get_event_list;

        return eventList;

    } catch (error) {
        log('無法在VSAAS取得事件錄影列表', error);
    }
}

const findTargetVideo = async (name, userEvents, udid, server, vsaasEvents) => {
    let records = [];
    let i = 0;

    for (let userEvent of userEvents) {
        i++
        let { category, eventTime, eventMessage } = userEvent;

        // 根據使用者上傳方式定義檔名
        let type;
        if (category == "e") {
            type = "auto"
        } else if (category == "f") {
            type = "manual"
        } else {
            type = "undefined"
        }

        // 轉換時間戳記成人看得懂的格式
        const timeString = ts2date(eventTime);

        // 建立檔案名稱
        let filename = `${name}_${type}_${timeString}`;

        // 尋找是否有符合該使用者標記時間範圍內的事件影片
        let vsaasEvent = vsaasEvents.find((e) => {
            const eventTimestamp = e.start_time_ts;
            const range = 1 * 60 * 1000;
            const diff = eventTimestamp - eventTime;
            return Math.abs(diff) < range;
        })

        // 如果有找到符合的事件影片就下載
        if (vsaasEvent != null) {
            let ts = vsaasEvent.start_time_ts;
            // 取得影片連結
            let url = await getVideoLink(server, udid, ts);

            // 下載影片
            console.log(`第${i}筆資料: 雲端事件錄影連結: ${url}`);
            let status = await downloadVideo(url, filename);

            let record = {
                name: name,
                number: i,
                // status: status,
                file: filename
            }
            records.push(record);
        } else {
            console.log(`第${i}筆資料: 雲端事件錄影找不到對應的時間`);
        }

        console.log(` `);
    }

    // console.log(records);
    return records;
}

const getVideoLink = async (server, udid, ts) => {
    // 根據時間戳記取得影片連結
    try {
        let url = `https://${server}/ask`;
        let data = `query {\n\task_media (device:"${udid}",timestamp:"${ts}",length:30,mode:ASK_DOWNLOAD){\n\t\tcode,ret,url\n\t}\n}`;

        res = await apiTUTKGetVideoLink(url, data);
        let link = res.data.data.ask_media.url;
        return link;

    } catch (error) {
        log('無法取得影片連結', error);
    }
}

const downloadVideo = async (url, filename) => {
    // 下載影片至指定位置
    try {
        let path = `${resourcePath}/video/${filename}.mp4`;
        let stream = await apiTUTKDownloadVideo(url);
        stream.data.pipe(fs.createWriteStream(path));
        console.log(`--影片下載完成: ${filename}`);
        return 1;

    } catch (error) {
        log('--影片下載失敗', error);
        return 0;
    }
}

const saveResult = (records, filename) => {
    return new Promise((resolve, reject) => {
        let path = `${resourcePath}/${filename}_result.csv`;

        const csvWriter = createCsvWriter({
            path: path,
            header: [
                { id: 'name', title: 'NAME' },
                { id: 'number', title: 'NUMBER' },
                { id: 'status', title: 'STATUS' },
                { id: 'file', title: 'FILE' }
            ]
        });

        csvWriter.writeRecords(records)       // returns a promise
            .then(() => {
                console.log(`已輸出結果: ${path}`);
                resolve();
            });
    })
}

function getTimeStamp(date, time) {
    date = date.split('/');
    const y = date[0];
    const m = date[1];
    const d = date[2];

    time = time.split(':');
    const hh = time[0];
    const mm = time[1];

    const dt = new Date(y, (m - 1), d, hh, mm);
    const ts = dt.getTime();
    // console.log(dt, ts);
    return { ts, y, m, d, hh, mm, date, time };
}

function ts2date(ts) {
    let date = new Date(ts);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const min = date.getMinutes();
    return `${year}_${month}_${day}_${hour}_${min}`
}
/**
 * 
 * Pretty logger.
 */
function log(title, msg) {
    console.log(`[${title}] ${msg}`);
}

async function process(filename) {
    // 從外部檔案讀取事件資料
    const [sn, mail] = await readUserData(filename);
    const name = mail.split("@")[0];

    // 使用超級使用者權限取得授權碼
    const code = await getGrantCode(sn, mail);

    // 根據使用者資訊登入並取得金鑰
    const pixseeToken = await getPixseeToken(code);
    const vsaasToken = await getVsaasToken(code);
    // 如果找不到使用者就結束程式並顯示提示
    if ((pixseeToken == undefined) || (vsaasToken == undefined)) {
        console.log('找不到符合的使用者');
        return;
    }

    // 在仁寶雲取得使用者資訊
    const { openId, email, babyId, deviceId } = await getUserData();
    // 在仁寶雲取得事件列表
    const userEvents = await getPixseeEventList(babyId, from);
    console.log(`仁寶雲上有 ${userEvents.length} 個事件`);

    // 取得裝置udid以及影片伺服器
    const [udid, bindingServer] = await getVsaasUserInfo();
    // 取得事件錄影列表
    const vsaasEvents = await getVsaasEventList(udid, from, to);
    console.log(`VSAAS上有 ${vsaasEvents.length} 個事件錄影`);

    // 尋找並下載符合規則的事件影片
    const records = await findTargetVideo(name, userEvents, udid, bindingServer, vsaasEvents);

    // 將結果另存至外部檔案
    await saveResult(records, filename);
}

async function mainFunction() {
    // 標記程式開始運作的時間
    let startTime = new Date().getTime();

    // 處理每個要求
    for (let filename of files) {
        await process(filename);
    }

    // 處理完成
    console.log('...Done');
    // 計算總耗時
    var endTime = new Date().getTime();
    let cost = endTime - startTime;
    console.log(`總共花了 ${cost / 1000} 秒`)
}

const from = 1637723293000;
// const to = 1634712617000;
const to = new Date().getTime();
const resourcePath = './userdata'
const files = ['03_c'];

mainFunction();