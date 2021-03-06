const fs = require('fs');
const csv2json = require("csvtojson");
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { apiGetGrantCode, apiSetToken, apiGetToken, apiUserInfo, apiBabyInfo, apiDeviceInfo, apiGetEventList, apiGetPhotoList, apiDownloadPhoto, apiSetBaseUrl, apiDeleteDevice, apiTUTKGetToken, apiTUTKSetToken, apiTUTKquery, apiTUTKGetVideoLink, apiTUTKDownloadVideo } = require('./api');

// if (process.argv.length < 3) {
//     console.log('Usage: node ' + process.argv[1] + ' FILENAME');
//     process.exit(1);
// }

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
                log(2, `grant_code:, ${code}`);
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
        log(2, `pixsee_token:, ${token}`);

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
        log(2, `tutk_token:, ${token}`);

    } catch (error) {
        log(4, '該序號無法取得VSAAS金鑰');
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
        log(4, '無法在仁寶雲取得使用者資訊');
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
        log(4, '無法在仁寶雲取得事件列表');
    }
}

const getPhotoList = async (babyId, sdt) => {
    try {
        // 取得事件列表
        res = await apiGetPhotoList(babyId, sdt);
        let photoList = res.data.result.data;

        return photoList;

    } catch (error) {
        log(4, '無法在仁寶雲取得照片列表');
    }
}

const getVsaasUserInfo = async () => {
    try {
        // 取得使用者資訊
        data = 'query {\n\tget_account{\n\t\tpk,vendor,uid,nickname,name,email,lang,created,updated,last_login,is_active\n\t}\n}';
        res = await apiTUTKquery(data);
        log(1, `user:, ${JSON.stringify(res.data)}`);

        // 取得使用者裝置
        data = 'query {\n\tget_device_list{\n\t\tvendor,created,updated,account,udid,thumbnail,channel,color_tag,nickname,st,uid,credential,fw_ver\n\t}\n}';
        res = await apiTUTKquery(data);
        log(1, `device:, ${JSON.stringify(res.data)}`);
        // 取得udid
        let udid = res.data.data.get_device_list[0].udid;
        log(1, `udid:, ${udid}`);

        // 解綁裝置
        // data = `mutation {\n\tremove_device(udid:"${udid}")\n}`;
        // res = await apiTUTKquery(data);
        log(1, `device:, ${JSON.stringify(res.data)}`);

        // 取得影片伺服器
        data = `query {get_binding_server (udid:"${udid}")}`;
        res = await apiTUTKquery(data);
        let bindingServer = res.data.data.get_binding_server;
        log(1, `bindingServer:, ${bindingServer}`);

        // 顯示使用者影片使用量
        data = 'query {get_contract_list{pk,account,duration_type,state,created,updated,expires,nickname,description,devices{udid},max_storage_size,storage_usage}}';
        res = await apiTUTKquery(data);
        let contract = res.data.data.get_contract_list[0];
        let storage_usage = parseFloat(contract.storage_usage).toFixed(2);
        log(1, `使用量:, ${storage_usage} GB`);

        return [udid, bindingServer];

    } catch (error) {
        log(4, '無法在VSAAS取得使用者資訊');
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
        log(4, '無法在VSAAS取得事件錄影列表');
    }
}

const findTargetVideo = async (name, userEvents, photoList, udid, server, vsaasEvents) => {
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
        let filename = `${name}_${type}_${eventTime}_${timeString}`;

        // 尋找是否有符合該使用者標記時間範圍內的事件照片
        const UTCTimeString = ts2date(eventTime, true);
        let photo = photoList.find((e) => {
            const photoName = e.fileName;
            let b = photoName.includes(UTCTimeString);
            return b;
        })

        // 尋找是否有符合該使用者標記時間範圍內的事件影片
        let vsaasEvent = vsaasEvents.find((e) => {
            const eventTimestamp = e.start_time_ts;
            const range = 0 * 60 * 1000;
            const diff = eventTimestamp - eventTime;

            return Math.abs(diff) <= range;
        })


        log(2, `第${i}筆資料:`);
        let record = {
            name: name,
            number: i,
            status: 0,
            file: filename
        }

        // 下載照片
        /*         
                if (photo) {
                    let fid = photo.fid;
                    log(2, `對應的雲端照片: ${fid}`);
                    await downloadPhoto(fid, filename);
                } else {
                    log(2, `找不到對應的事件照片`);
                }
         */

        // 下載事件錄影
        if (vsaasEvent) {
            let ret = null;
            let ts = vsaasEvent.start_time_ts;
            log(2, `雲端事件時間: ${eventTime}`);
            // 下載影片
            let url = await getVideoLink(server, udid, ts, "mp4");
            if (url != null) {
                log(2, `錄影連結: ${url}`);
                do {
                    ret = await downloadVideo(url, filename, "mp4");
                } while (ret == 0);
                record.status = 2;

                // 下載照片
                // url = await getVideoLink(server, udid, ts, "jpg");
                // log(2, `縮圖連結: ${url}`);
                // ret = await downloadVideo(url, filename, "jpg");

                // 從影片中間抓圖
                ret = await extractFrame(`${filename}`);

            }
        } else {
            log(2, `找不到對應的事件錄影`);
        }

        // 如果事件有同時找到符合的照片和事件影片就下載
        if (photo && vsaasEvent) {
            record.status = 3;
        } else {
            // let str = `第${i}筆資料:`
            // str += (photo) ? "" : " 找不到對應的照片 ";
            // str += (vsaasEvent) ? "" : " 找不到對應的事件錄影 ";
        }

        records.push(record);
        log(2, ` `);
    }

    // log(1, records);
    return records;
}

const downloadPhoto = async (fid, filename) => {
    log(2, `下載照片:, ${fid}`);
    // 下載照片至指定位置
    try {
        let path = `${resourcePath}/video/${filename}.jpg`;
        let stream = await apiDownloadPhoto(fid);
        stream.data.pipe(fs.createWriteStream(path));
        log(2, `--照片下載完成: ${filename}.jpg`);
        return 1;

    } catch (error) {
        log(4, `--照片下載失敗, ${error}`);
        return 0;
    }
}

const getVideoLink = async (server, udid, ts, type) => {
    // 根據時間戳記取得影片連結
    try {
        let url = `https://${server}/ask`;

        let data = ``;
        switch (type) {
            case "jpg":
                data = `query {\n\task_media (device:"${udid}",timestamp:"${ts}",length:0,mode:ASK_ICON,role:ios){\n\t\tcode,ret,url\n\t}\n}`;
                break;

            case "mp4":
                data = `query {\n\task_media (device:"${udid}",timestamp:"${ts}",length:30,mode:ASK_DOWNLOAD){\n\t\tcode,ret,url\n\t}\n}`;
                break;
        }

        res = await apiTUTKGetVideoLink(url, data);
        let link = res.data.data.ask_media.url;
        if (link == undefined) { log(4, JSON.stringify(res.data.data)) };

        return link;

    } catch (error) {
        log(4, `無法取得下載連結, ${error}`);
    }
}

const downloadVideo = async (url, filename, type) => {
    // 下載影片至指定位置
    let path = `${resourcePath}/video/${filename}.${type}`;
    let writer = fs.createWriteStream(path);

    return apiTUTKDownloadVideo(url).then(res => {
        return new Promise((resolve, reject) => {
            // log(2, "寫檔中...");
            let timeout = setTimeout(() => {
                writer.destroy(new Error("超時"))
            }, 6000);
            let error = null;

            writer.on('error', err => {
                error = err;
                res.data.pause();
                res.data.unpipe();
                res.data.destroy();

                writer.close();
                reject(err);
            });

            writer.on('finish', () => {
                clearTimeout(timeout);
            })

            writer.on('close', () => {
                if (!error) {
                    switch (type) {
                        case "jpg":
                            log(2, `--縮圖下載完成: ${filename}.jpg`);
                            break;

                        case "mp4":
                            log(2, `--影片下載完成: ${filename}.mp4`);
                            break;
                    }
                    resolve(true);
                }
            });

            res.data.pipe(writer);
        })
    }).catch(err => {
        log(4, `--下載失敗, ${err}`);
        return 0;
    })

}

const extractFrame = (filename) => {
    return new Promise((resolve, reject) => {
        new Promise((resolve, reject) => {
            // 計算影片影格數
            let frames;

            let ffmpeg = require('child_process').spawn('ffprobe', ['-v', '0', '-select_streams', 'v:0', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', `./userdata/video/${filename}.mp4`]);

            ffmpeg.on('error', function (err) {
                log(4, err);
            });

            ffmpeg.on('close', function (code) {
                // log(2, 'ffmpeg exited with code ' + code);
                resolve(frames);
            });

            ffmpeg.stderr.on('data', function (data) {
                log(4, `stderr: ${data}`);
                var tData = data.toString('utf8');
                // var a = tData.split('[\\s\\xA0]+');
                var a = tData.split('\n');
                // log(4, a);
            });

            ffmpeg.stdout.on('data', function (data) {
                frames = data.toString();
                // log(2, `影格數: ${frames}`);
            });

        }).then(frames => {
            // 抓指定的影格輸出成圖片
            let t = Math.round(frames / 2);
            let ffmpeg = require('child_process').spawn('ffmpeg', ['-y', '-i', `./userdata/video/${filename}.mp4`, '-vf', `select='eq(n\\,${t})'`, '-vframes', '1', `./userdata/video/${filename}.jpg`]);

            ffmpeg.on('error', function (err) {
                // log(4, err);
            });

            ffmpeg.on('close', function (code) {
                // log(2, 'ffmpeg exited with code ' + code);
                log(2, `--截圖完成: ${filename}.jpg`);
                resolve(code);
            });

            ffmpeg.stderr.on('data', function (data) {
                // log(4, `stderr: ${data}`);
                var tData = data.toString('utf8');
                // var a = tData.split('[\\s\\xA0]+');
                var a = tData.split('\n');
                // log(4, a);
            });

            ffmpeg.stdout.on('data', function (data) {
                ret = data.toString();
            });
        })
    })
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
                log(2, `已輸出結果: ${path}`);
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
    // log(1, `dt:${dt}, ts:${ts}`);
    return { ts, y, m, d, hh, mm, date, time };
}

function ts2date(ts, utc = false) {
    let date = new Date(ts);

    const year = utc ? date.getUTCFullYear() : date.getFullYear();

    let month = utc ? date.getUTCMonth() + 1 : date.getMonth() + 1;
    month = ("0" + month).slice(-2);

    let day = utc ? date.getUTCDate() : date.getDate();
    day = ("0" + day).slice(-2);

    let hour = utc ? date.getUTCHours() : date.getHours();
    hour = ("0" + hour).slice(-2);

    let min = utc ? date.getUTCMinutes() : date.getMinutes();
    min = ("0" + min).slice(-2);

    let sec = utc ? date.getUTCSeconds() : date.getSeconds();
    sec = ("0" + sec).slice(-2);
    return `${year}_${month}_${day}_${hour}_${min}_${sec}`
}

var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', { flags: 'w' });
function log(level, msg) {
    if (level >= loggingLevel) {
        console.log(`[${level}]: ${msg}`);
        log_file.write(util.format(msg) + '\n');
    }
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
// await delay(1000) /// waiting 1 second.

async function handler(sn, mail) {
    log(2, `開始處理 序號:${sn} 使用者:${mail} 的資料`);
    const name = mail.split("@")[0];
    let records = [];

    // 使用超級使用者權限取得授權碼
    const code = await getGrantCode(sn, mail);

    // 根據使用者資訊登入並取得金鑰
    const pixseeToken = await getPixseeToken(code);
    const vsaasToken = await getVsaasToken(code);
    // 如果找不到使用者就結束程式並顯示提示
    if ((pixseeToken == undefined) || (vsaasToken == undefined)) {
        log(4, '找不到符合的使用者');
        return;
    }

    // 在仁寶雲取得使用者資訊
    const { openId, email, babyId, deviceId } = await getUserData();

    // 在仁寶雲取得事件列表
    const userEvents = await getPixseeEventList(babyId, from);
    if (!userEvents) {
        log(2, `仁寶雲上找不到任何事件`);
    }

    // 在仁寶雲取得照片列表
    const photoList = await getPhotoList(babyId, from);
    if (!photoList) {
        log(2, `仁寶雲上找不到任何照片`);
    }

    // 取得裝置udid以及影片伺服器
    const [udid, bindingServer] = await getVsaasUserInfo();
    if (!udid) {
        log(4, `VSAAS上面沒有這台裝置: ${sn}`);
    }
    // 取得事件錄影列表
    const vsaasEvents = await getVsaasEventList(udid, from, to);
    if (!vsaasEvents) {
        log(2, `VSAAS上找不到任何事件錄影`);
    }

    if (userEvents && photoList && vsaasEvents) {
        log(2, ``);
        log(2, `仁寶雲上有 ${userEvents.length} 個事件`);
        log(2, `仁寶雲上有 ${photoList.length} 個照片`);
        log(2, `VSAAS上有 ${vsaasEvents.length} 個事件錄影`);
        log(2, ``);
        // 尋找並下載符合規則的事件影片
        records = await findTargetVideo(name, userEvents, photoList, udid, bindingServer, vsaasEvents);
    }

    // 將結果另存至外部檔案
    await saveResult(records, name);
}

async function mainFunction() {
    // 標記程式開始運作的時間
    let startTime = new Date().getTime();

    let args = process.argv.slice(2);
    args.forEach(function (val, index, array) {
        log(1, `${index} + :  + ${val}`);
        if (index == 0 && val != undefined) {
            from = val;
        }
    });
    log(2, `抓取這時間之後的所有事件資料: ${ts2date(+from)}`);

    // 從外部檔案讀取事件資料
    const users = await readUserData(userListCSV);
    // 下載每個使用者的資料
    for (let user of users) {
        const res = await handler(user.sn, user.mail);
    }

    // 處理完成
    log(2, '...Done');
    // 計算總耗時
    let endTime = new Date().getTime();
    let cost = endTime - startTime;
    log(2, `總共花了 ${cost / 1000} 秒`)

    return;
}

let from = 1638576000000;
// const to = 1634712617000;
const to = new Date().getTime();
const resourcePath = './userdata'
const userListCSV = ['userlist'];
const loggingLevel = 2;

mainFunction();