'use strict';

/**
 * Discover and show cameras on a local network without a cloud service.
 * This is part of the alexa-ip-cam project.
 * See https://github.com/goruck/alexa-ip-cam.
 * 
 * This demonstrates a smart home skill using the publicly available API on Amazon's Alexa platform.
 * For more information about developing smart home skills, see
 * https://developer.amazon.com/alexa/smart-home
 *
 * For details on the smart home API, please visit
 * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 * 
 * Copyright (c) Lindo St. Angel 2018.
 */
const { apiSetToken, apiUserInfo, apiBabyInfo, apiDeviceInfo, apiBindToCloud, apiSetUserId, apiGetStreamURI, apiSendIOTCmd, apiUserLogin, apiGetStreamURI_byDeviceId } = require('./api')
const fs = require('fs');
const { v4: uuidv4 } = require('../../node_modules/uuid');
const Buffer = require('buffer').Buffer;

// Get general configuration.
const config = JSON.parse(fs.readFileSync('./config.json'));
//
const RECORDINGS_BASE_PATH = config.recordings.recordingsBasePath;
//
const VIDEO_URI_BASE = config.recordings.videoUriBase;
/**
 * Utility functions
 */

String.prototype.splice = function (start, delCount, newSubStr) {
    return this.slice(0, start) + newSubStr + this.slice(start + Math.abs(delCount));
};

/**
 * 
 * Pretty logger.
 */
function log(title, msg) {
    console.log(`[${title}] ${msg}`);
}

/**
 * Generate a unique message ID
 *
 */
function generateMessageID() {
    return uuidv4();
}

/**
 * Generate a response message
 *
 * @param {string} name - Directive name
 * @param {Object} payload - Any special payload required for the response
 * @returns {Object} Response object
 */
function generateResponse(name, payload) {
    return {
        header: {
            messageId: generateMessageID(),
            name: name,
            namespace: 'Alexa.ConnectedHome.Control',
            payloadVersion: '2',
        },
        payload: payload,
    };
}

/**
 * Mock functions to access device cloud.
 *
 * TODO: Pass a user access token and call cloud APIs in production.
 */

function getDevicesFromPartnerCloud() {
    // Read and parse json containing camera configuration.
    // This is not actually from the cloud, rather emulates it. 
    const camerasObj = config;

    return camerasObj;
}

function isValidToken() {
    /**
     * Always returns true for sample code.
     * You should update this method to your own access token validation.
     */
    return true;
}

function isDeviceOnline(applianceId) {
    log('DEBUG', `isDeviceOnline (applianceId: ${applianceId})`);
    /**
     * Always returns true for sample code.
     * You should update this method to your own validation.
     */
    return true;
}

/**
 * Main logic
 */

/**
 * This function is invoked when we receive a "Discovery" message from Alexa Smart Home Skill.
 * We are expected to respond back with a list of appliances that we have discovered for a given customer.
 *
 * @param {Object} request - The full request object from the Alexa smart home service. This represents a DiscoverAppliancesRequest.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesrequest
 *
 * @param {function} callback - The callback object on which to succeed or fail the response.
 *     https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-prog-model-handler-callback
 *     If successful, return <DiscoverAppliancesResponse>.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
async function handleDiscovery(request, callback) {
    log('DEBUG', `Discovery Request: ${JSON.stringify(request)}`);

    /**
     * Get the OAuth token from the request.
     */
    const userAccessToken = request.directive.payload.scope.token.trim();

    /**
     * Generic stub for validating the token against your cloud service.
     * Replace isValidToken() function with your own validation.
     */
    if (!userAccessToken || !isValidToken(userAccessToken)) {
        const errorMessage = `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`;
        log('ERROR', errorMessage);
        callback(new Error(errorMessage));
    }

    /**
     * Assume access token is valid at this point.
     * Retrieve list of devices from cloud based on token.
     *
     * For more information on a discovery response see
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
     */

    /**
     * Form and send discover response event.
     *
     */
    const { deviceId, babyName, locationName, deviceModel, deviceName } = await getUserData();
    const header = {
        messageId: generateMessageID(),
        name: 'Discover.Response',
        namespace: 'Alexa.Discovery',
        payloadVersion: '3'
    };

    const camerasObj = getDevicesFromPartnerCloud();

    let endpoints = [];
    camerasObj.cameras.forEach(camera => {
        const endpoint = {
            endpointId: deviceId,
            manufacturerName: camera.manufacturerName,
            modelName: deviceModel,
            friendlyName: `${babyName}'s camera`,
            description: camera.description,
            displayCategories: ['CAMERA'],
            cookie: {},
            capabilities: [
                {
                    type: 'AlexaInterface',
                    interface: 'Alexa.CameraStreamController',
                    version: '3',
                    cameraStreamConfigurations: [
                        {
                            protocols: ['RTSP'],
                            resolutions: camera.resolutions,
                            authorizationTypes: ['NONE'],
                            videoCodecs: camera.videoCodecs,
                            audioCodecs: camera.audioCodecs
                        }]
                },
                {
                    type: 'AlexaInterface',
                    interface: 'Alexa.MediaMetadata',
                    version: '3',
                    proactivelyReported: true
                },
                {
                    type: "AlexaInterface",
                    interface: "Alexa.PowerController",
                    version: "3",
                    properties: {
                        supported: [
                            {
                                name: "powerState"
                            }
                        ],
                        proactivelyReported: true,
                        retrievable: true
                    }
                },
                {
                    type: "AlexaInterface",
                    interface: "Alexa.Speaker",
                    version: "3",
                    properties: {
                        supported: [
                            {
                                name: "volume"
                            },
                            {
                                name: "muted"
                            }
                        ],
                        retrievable: true,
                        proactivelyReported: true
                    }
                },
                {
                    type: "AlexaInterface",
                    interface: "Alexa.EndpointHealth",
                    version: "3",
                    properties: {
                        supported: [
                            {
                                name: "connectivity"
                            }
                        ],
                        proactivelyReported: true,
                        retrievable: true
                    }
                },
                {
                    type: "AlexaInterface",
                    interface: "Alexa",
                    version: "3"
                }
            ]
        };
        // endpoint.capabilities.push(...camera.capabilities);
        endpoints.push(endpoint);
    });

    const response = {
        'event': { header, 'payload': { endpoints } }
    };

    /**
     * Log the response. These messages will be stored in CloudWatch.
     */
    log('DEBUG', `Discovery Response: ${JSON.stringify(response)}`);

    /**
     * Return result with successful message.
     */
    callback(null, response);
}

/**
 * A function to handle control events.
 * This is called when Alexa requests an action such as turning off an appliance.
 *
 * @param {Object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
async function handleControl(request, callback) {
    // log('DEBUG', `Control Request: ${JSON.stringify(request)}`);

    /**
     * Get the access token.
     */
    const userAccessToken = request.directive.endpoint.scope.token.trim();

    /**
     * Generic stub for validating the token against your cloud service.
     * Replace isValidToken() function with your own validation.
     *
     * If the token is invalid, return InvalidAccessTokenError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!userAccessToken || !isValidToken(userAccessToken)) {
        log('ERROR', `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
        callback(null, generateResponse('InvalidAccessTokenError', {}));
        return;
    }

    /**
     * Grab the applianceId from the request.
     */
    const applianceId = request.directive.endpoint.endpointId;

    /**
     * If the applianceId is missing, return UnexpectedInformationReceivedError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#unexpectedinformationreceivederror
     */
    if (!applianceId) {
        log('ERROR', 'No applianceId provided in request');
        const payload = { faultingParameter: `applianceId: ${applianceId}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
    }

    /**
     * At this point the applianceId and accessToken are present in the request.
     *
     * Please review the full list of errors in the link below for different states that can be reported.
     * If these apply to your device/cloud infrastructure, please add the checks and respond with
     * accurate error messages. This will give the user the best experience and help diagnose issues with
     * their devices, accounts, and environment
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#error-messages
     */
    if (!isDeviceOnline(applianceId, userAccessToken)) {
        log('ERROR', `Device offline: ${applianceId}`);
        callback(null, generateResponse('TargetOfflineError', {}));
        return;
    }

    /**
     * Form and send response event.
     *
     */
    const correlationToken = request.directive.header.correlationToken;
    const endpointId = request.directive.endpoint.endpointId;
    let endpoint = {
        endpointId: endpointId
    };

    // TODO: handle multiple camera streams
    const cameraStream = request.directive.payload.cameraStreams[0];

    let header = {
        namespace: 'Alexa.CameraStreamController',
        name: 'Response',
        messageId: generateMessageID(),
        correlationToken: correlationToken,
        payloadVersion: '3'
    };
    let properties = [
        {
            namespace: "Alexa.EndpointHealth",
            name: "connectivity",
            value: {
                value: "OK"
            }
        }
    ];

    // Get uri of camera using applianceId as an index. 
    // const camerasObj = getDevicesFromPartnerCloud();
    // const cameraIdx = parseInt(applianceId) - 1;
    // const uri = camerasObj.cameras[cameraIdx].uri;
    let uri = '';
    let payload = {};

    // 取得串流位置
    // const { sn } = await getUserData();
    // const res = await apiGetStreamURI(sn);

    // 改成用新版的api取得rtsp位置，只需要傳入endpointId就可以，不需要再多次查詢
    const res = await apiGetStreamURI_byDeviceId(endpointId);
    if (res.status == 200) {
        // 定義回覆內容
        uri = res.data.result.path;
        log('info', uri)
        // uri = uri.splice(7, 0, "admin:Aa123456@");
        // log('info', uri)

        payload = {
            cameraStreams: [
                {
                    uri: uri,
                    protocol: 'RTSP',
                    resolution: cameraStream.resolution,
                    authorizationType: 'NONE',
                    videoCodec: cameraStream.videoCodec,
                    audioCodec: cameraStream.audioCodec
                }],
            // imageUri: "https://s.yimg.com/zp/MerchandiseImages/AC7CA41893-SP-9307147.jpg"
        };

    } else {
        // 失敗的回應
        header.namespace = 'Alexa';
        header.name = 'ErrorResponse';
        payload.type = 'ENDPOINT_UNREACHABLE';
        payload.message = 'Unable to reach endpoint, because it appears to be offline'
    }

    const response = {
        // event: { header, endpoint, payload },
        event: { header, payload },
        context: { properties }
    };

    log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

    callback(null, response);
}

/**
 * This handles an AcceptGrant directive.
 * This enables you to obtain credentials that identify and authenticate a customer to Alexa.
 * See https://developer.amazon.com/docs/device-apis/alexa-authorization.html.
 * 
 * @param {object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
async function handleAcceptGrant(request, callback) {
    log('DEBUG', `Accept Grant: ${JSON.stringify(request)}`);

    const code = request.directive.payload.grant.code;
    let res = await bindToCloud(code);
    const response = {
        event: {
            header: {
                messageId: generateMessageID(),
                namespace: 'Alexa.Authorization',
                name: 'AcceptGrant.Response',
                payloadVersion: '3'
            },
            payload: {
            }
        }
    };

    if (res == false) {
        response.event.header.name = "ErrorResponse";
        response.event.payload = {
            "type": "ACCEPT_GRANT_FAILED",
            "message": "Failed to handle the AcceptGrant directive"
        }
    }
    callback(null, response);
}

/**
 * This forms the response to a GetMediaMetadata directive.
 * See https://developer.amazon.com/docs/device-apis/alexa-mediametadata.html.
 * 
 * @param {object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
function handleMediaMetadata(request, callback) {
    log('DEBUG', `MediaMetadata: ${JSON.stringify(request)}`);

    const mediaId = request.directive.payload.filters.mediaIds[0];

    // Replace underscores with slashes to reform path to recordings.
    // Underscores were used in the media id to be compatible w/Alexa MediaMetadata API.
    const mediaIdArr = mediaId.split('__');
    const manufacturerId = mediaIdArr[0] + '-' + mediaIdArr[1];
    const mediaUri = VIDEO_URI_BASE + RECORDINGS_BASE_PATH +
        manufacturerId + '/' + mediaIdArr.slice(2).join('/') + '.mp4';
    log('DEBUG', `mediaUri: ${mediaUri}`);

    let tenMinsFromNow = new Date();
    tenMinsFromNow.setMinutes(tenMinsFromNow.getMinutes() + 10);

    const response = {
        event: {
            header: {
                namespace: 'Alexa.MediaMetadata',
                name: 'GetMediaMetadata.Response',
                messageId: generateMessageID(),
                correlationToken: request.directive.header.correlationToken,
                payloadVersion: '3'
            },
            payload: {
                scope: {
                    type: 'BearerToken',
                    token: request.directive.payload.scope.token
                },
                media: [{
                    id: request.directive.payload.filters.mediaIds[0],
                    cause: 'MOTION_DETECTED',
                    recording: {
                        //'name': 'Optional video name',
                        startTime: '2018-06-29T19:20:41Z', // placeholder for now
                        endTime: '2018-06-29T19:21:41Z', // placeholder for now
                        //'videoCodec': 'H264',
                        //'audioCodec': 'NONE',
                        uri: {
                            value: mediaUri,
                            expireTime: tenMinsFromNow.toISOString().split('.')[0] + 'Z'
                        }
                    }
                }]
                /*'errors': [{
                    'mediaId': 'media id from the request',
                    'status': 'reason for error'
                }]*/
            }
        }
    };

    callback(null, response);
}

async function reportState(request, callback) {
    let data = {
        commandKey: 'deviceState',
        data: ""
    }

    // 定義回覆格式
    const correlationToken = request.directive.header.correlationToken;
    const endpointId = request.directive.endpoint.endpointId;
    let header = {
        namespace: 'Alexa',
        name: 'StateReport',
        messageId: generateMessageID(),
        correlationToken: correlationToken,
        payloadVersion: '3'
    };
    let endpoint = {
        endpointId: endpointId
    };
    let payload = {};
    let response = {};

    try {
        const { sn } = await getUserData();
        const res = await apiSendIOTCmd(sn, data);
        log('DEBUG', `deviceState: ${res.status}: ${res.data}`);
        let properties = [
            {
                namespace: "Alexa.PowerController",
                name: "powerState",
                value: "ON"
            }
        ];
        response = {
            event: { header, endpoint, payload },
            context: { properties }
        };
    } catch (error) {
        log('ERROR', error);
        // 失敗的回應
        header.name = 'ErrorResponse';
        payload.type = 'ENDPOINT_UNREACHABLE';
        payload.message = 'Unable to reach endpoint, because it appears to be offline'
        response = {
            event: { header, payload },
        }
    }

    log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

    callback(null, response);
}

async function setPowerState(request, callback) {
    // 數值
    let state = request.directive.header.name;
    state = (state == 'TurnOn') ? 'on' : 'off';
    state = Buffer.from(state).toString('base64');
    let data = {
        commandKey: 'execSleeping',
        data: state
    }

    // 定義回覆格式
    const correlationToken = request.directive.header.correlationToken;
    const endpointId = request.directive.endpoint.endpointId;
    let header = {
        namespace: 'Alexa',
        name: 'Response',
        messageId: generateMessageID(),
        correlationToken: correlationToken,
        payloadVersion: '3'
    };
    let endpoint = {
        endpointId: endpointId
    };
    let payload = {
    };
    const properties = [
        {
            namespace: "Alexa.PowerController",
            name: "powerState",
            value: state
        },
        {
            namespace: "Alexa.Speaker",
            name: "volume",
            value: "1",
        },
        {
            namespace: "Alexa.Speaker",
            name: "muted",
            value: false,
        }
    ];
    let response = {
        event: { header, endpoint, payload },
        context: { properties }
    };

    // 送出指定給雲，根據結果調整回覆內容
    log('DEBUG', `set turn on|off to ${state}`);
    try {
        const { sn } = await getUserData();
        const res = await apiSendIOTCmd(sn, data);
        log('DEBUG', `execVolume: ${res.status}: ${res.data}`);
    } catch (error) {
        log('ERROR', error);
        // 失敗的回應
        header.name = 'ErrorResponse';
        payload.type = 'ENDPOINT_UNREACHABLE';
        payload.message = 'Unable to reach endpoint, because it appears to be offline'
        response = {
            event: { header, payload },
        }
    }

    log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

    callback(null, response);
}
async function setRangeValue(request, callback) {
    // 控制類型
    const instance = request.directive.header.instance;
    // 數值
    let rangeValue = request.directive.payload.rangeValue;
    rangeValue = Buffer.from(rangeValue).toString('base64');
    let data = {
        commandKey: '',
        data: ''
    }
    // 檢索要進行何種控制，輸入指令名稱與相關的數值
    switch (instance) {
        case 'Camera.volume':
            data.commandKey = 'execVolume';
            data.data = rangeValue;
            break;

    }

    // 定義回覆格式
    const correlationToken = request.directive.header.correlationToken;
    let header = {
        namespace: 'Alexa',
        name: 'Response',
        messageId: generateMessageID(),
        correlationToken: correlationToken,
        payloadVersion: '3'
    };
    let payload = {
    };
    const properties = {
        namespace: "Alexa.RangeController",
        instance: instance,
        name: "rangeValue",
        value: rangeValue,
    };
    let response = {
        event: { header, payload },
        context: { properties }
    };

    // 送出指定給雲，根據結果調整回覆內容
    try {
        const { sn } = await getUserData();
        const res = await apiSendIOTCmd(sn, data);
        if (res.status !== 200) {
        }
    } catch (error) {
        log('ERROR', error);
        // 失敗的回應
        header.name = 'ErrorResponse';
        payload.type = 'ENDPOINT_UNREACHABLE';
        payload.message = 'Unable to reach endpoint, because it appears to be offline'
        response = {
            event: { header, payload },
        }
    }

    log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

    callback(null, response);
}

async function setVolume(request, callback) {
    // 數值
    let volume = request.directive.payload.volume;
    volume = (volume > 7) ? 7 : volume;
    volume = Buffer.from(volume.toString()).toString('base64');
    let data = {
        commandKey: 'execVolume',
        data: volume
    }

    // 定義回覆格式
    const correlationToken = request.directive.header.correlationToken;
    const endpointId = request.directive.endpoint.endpointId;
    let header = {
        namespace: 'Alexa',
        name: 'Response',
        messageId: generateMessageID(),
        correlationToken: correlationToken,
        payloadVersion: '3'
    };
    let endpoint = {
        endpointId: endpointId
    };
    let payload = {
    };
    const properties = [
        {
            namespace: "Alexa.Speaker",
            name: "volume",
            value: volume,
        },
        {
            namespace: "Alexa.Speaker",
            name: "muted",
            value: false,
        }
    ];
    let response = {
        event: { header, endpoint, payload },
        context: { properties }
    };

    // 送出指定給雲，根據結果調整回覆內容
    log('DEBUG', `set volume to ${volume}`);
    try {
        const { sn } = await getUserData();
        const res = await apiSendIOTCmd(sn, data);
        log('DEBUG', `execVolume: ${res.status}: ${res.data}`);
    } catch (error) {
        log('ERROR', error);
        // 失敗的回應
        header.name = 'ErrorResponse';
        payload.type = 'ENDPOINT_UNREACHABLE';
        payload.message = 'Unable to reach endpoint, because it appears to be offline'
        response = {
            event: { header, payload },
        }
    }

    log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);

    callback(null, response);
}
/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function.
 *
 * It is recommended to validate the request and response with Alexa Smart Home Skill API Validation package.
 * https://github.com/alexa/alexa-smarthome-validation
 */
exports.handler = (request, context, callback) => {
    log('DEBUG', `request: ${JSON.stringify(request)}`);

    const handlers = new Chain(AlexaHandlers)
    handlers.confirm([request, context, callback])
};

/* 
@param {Array} handlers - handlers set to pass the request through
 */
class Chain {
    constructor(handlers) {
        const resultHandler = (args) => {
            // console.log('-----');
        };
        this.handlers = [...Object.values(handlers), resultHandler].map((handler, index) => args => handler(args, this.handlers[index + 1]));
    }

    confirm(args) {
        this.handlers[0](args);
    }
}

// Set of handlers to process request

const AlexaHandlers = {
    events: (args, next) => {
        let [event, context, callback] = args;
        if (event.request != null && event.request.type != null) {
            handleEvents(event, callback);
        }
        next(args);
    },
    directives: (args, next) => {
        let [request, context, callback] = args;
        if (request.directive != null && request.directive.header != null) {
            handleDirectives(request, callback);
        }
        next(args);
    }
}


function handleEvents(event, callback) {
    const userId = event.context.System.user.userId;
    // log('INFO', `userId: ${userId}`);

    switch (event.request.type) {
        case 'AlexaSkillEvent.SkillEnabled':
            log('event', '0')
            break;

        case 'AlexaSkillEvent.SkillAccountLinked':
            let res = setUserId(userId);
            log('event', '1')
            break;

        case 'AlexaSkillEvent.SkillDisabled':
            log('event', '2')
            break;

        default:
            log("INFO", JSON.stringify(event));

    }
}

function handleDirectives(request, callback) {
    let userAccessToken;

    switch (request.directive.header.namespace) {
        /**
         * The namespace of 'Alexa.ConnectedHome.Discovery' indicates a request is being made to the Lambda for
         * discovering all appliances associated with the customer's appliance cloud account.
         *
         * For more information on device discovery, please see
         * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discovery-messages
         */
        case 'Alexa.Discovery':
            userAccessToken = request.directive.payload.scope.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            handleDiscovery(request, callback);
            break;

        /**
         * The namespace of "Alexa.CameraStreamController" indicates a request is being made to initialize a camera stream for an endpoint.
         * The full list of Control events sent to your lambda are described below.
         *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#payload
         */
        case 'Alexa.CameraStreamController':
            userAccessToken = request.directive.endpoint.scope.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            handleControl(request, callback);
            break;

        /**
         * Accept Grant.
         * This enables you to obtain credentials that identify and authenticate a customer to Alexa.
         * See https://developer.amazon.com/docs/device-apis/alexa-authorization.html.
         */
        case 'Alexa.Authorization':
            userAccessToken = request.directive.payload.grantee.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            handleAcceptGrant(request, callback);
            break;

        /**
         * GetMediaMetadata.
         * Sent when Alexa needs to update information about the media recording, such as updating the URL.
         * See https://developer.amazon.com/docs/device-apis/alexa-mediametadata.html.
         */
        case 'Alexa.MediaMetadata':
            handleMediaMetadata(request, callback);
            break;

        /**
         * The namespace of "Alexa.ConnectedHome.Query" indicates a request is being made to query devices about
         * information like temperature or lock state. The full list of Query events sent to your lambda are described below.
         *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#payload
         *
         * TODO: In this sample, query handling is not implemented. Implement it to retrieve temperature or lock state.
         */
        // case 'Alexa.ConnectedHome.Query':
        //     handleQuery(request, callback);
        //     break;
        /**
         * Received an unexpected message
         */
        case 'Alexa.PowerController':
            userAccessToken = request.directive.endpoint.scope.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            setPowerState(request, callback);
            break;

        case 'Alexa.RangeController':
            userAccessToken = request.directive.endpoint.scope.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            setRangeValue(request, callback);
            break;

        case 'Alexa.Speaker':
            userAccessToken = request.directive.endpoint.scope.token.trim();
            apiSetToken(`Bearer ${userAccessToken}`);
            setVolume(request, callback);
            break;

        default: {
            const name = request.directive.header.name;
            if (name == 'ReportState') {
                userAccessToken = request.directive.endpoint.scope.token.trim();
                apiSetToken(`Bearer ${userAccessToken}`);
                reportState(request, callback);
            } else {
                const errorMessage = `No supported namespace: ${request.directive.header.namespace}`;
                log('ERROR', errorMessage);
                callback(new Error(errorMessage));
            }
        }
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

        log('INFO', `openId:       ${openId}`);
        log('INFO', `babyId:       ${babyId}`);
        log('INFO', `deviceId:     ${deviceId}`);
        log('INFO', `serial:       ${sn}`);
        log('INFO', `babyName:     ${babyName}`);
        log('INFO', `locationName: ${locationName}`);
        log('INFO', `deviceName:   ${deviceName}`);
        log('INFO', `deviceModel:  ${deviceModel}`);
    } catch (error) {
        log('ERROR', error);
    } finally {
        return { openId, babyId, deviceId, sn, babyName, locationName, deviceName, deviceModel };
    }
}

const bindToCloud = async (code) => {
    let result = false;

    try {
        const { openId, babyId, deviceId, sn } = await getUserData();
        const body = {
            target: "avs",
            code: code,
            endpointId: deviceId,
            accountId: openId,
            sn: sn
        }
        const res = await apiBindToCloud(body)

        log('INFO', `bindToCloud: ${JSON.stringify(res.status)}`)
        result = res.status == 200 ? true : false;
    } catch (error) {
        log('ERROR', error);
    } finally {
        return result
    }
}

const setUserId = async (userId) => {
    let result = false;

    try {
        const body = {
            "userId": userId
        }
        const res = await apiSetUserId(body)

        log('INFO', `setUserId: ${JSON.stringify(res.status)}`)
        result = res.status == 200 ? true : false;
    } catch (error) {
        log('ERROR', error);
    } finally {
        return result
    }
}