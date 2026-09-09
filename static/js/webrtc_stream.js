let webrtc, webrtcSendChannel;
let mediaStream;

// $(document).ready(() => {
//     startPlay();
// });

async function startPlay() {
    mediaStream = new MediaStream();
    $("#videoPlayer")[0].srcObject = mediaStream;
    webrtc = new RTCPeerConnection({
        iceServers: [
            {
                urls: ["stun:stun.l.google.com:19302"],
            },
        ],
        sdpSemantics: "unified-plan",
    });

    webrtc.onsignalingstatechange = signalingstatechange;

    webrtc.ontrack = ontrack;
    let offer = await webrtc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
    });
    await webrtc.setLocalDescription(offer);
}

function ontrack(event) {
    unity.logger.debug(event.streams.length + " track is delivered");
    mediaStream.addTrack(event.track);
}
// let streams = {
//     "27aec28e-6181-4753-9acd-0456a75f0289": {
//         name: "TEST-C01",
//         channels: { 0: { url: "rtsp://admin:admin@192.168.1.244:5554", on_demand: true, debug: true, status: 1 } },
//     },
// };
async function signalingstatechange() {
    switch (webrtc.signalingState) {
        case "have-local-offer":
            let uuid = "27aec28e-6181-4753-9acd-0456a75f0289";
            let channel = 0;
            // let url = "/stream/" + uuid + "/channel/" + channel + "/webrtc?uuid=" + uuid + "&channel=" + channel;
            let url =
                "http://192.168.1.48:8083/stream/" +
                uuid +
                "/channel/" +
                channel +
                "/webrtc?uuid=" +
                uuid +
                "&channel=" +
                channel;
            $.post(
                url,
                {
                    data: btoa(webrtc.localDescription.sdp),
                },
                function (data) {
                    try {
                        // unity.logger.debug(data);
                        webrtc.setRemoteDescription(
                            new RTCSessionDescription({
                                type: "answer",
                                sdp: atob(data),
                            })
                        );
                    } catch (e) {
                        unity.logger.warn(e);
                    }
                }
            );
            break;
        case "stable":
            break;

        case "closed":
            break;

        default:
            unity.logger.debug(`unhandled signalingState is ${webrtc.signalingState}`);
            break;
    }
}

$("#videoPlayer")[0].addEventListener("loadeddata", () => {
    $("#videoPlayer")[0].play();
    // makePic();
});

$("#videoPlayer")[0].addEventListener("error", () => {
    unity.logger.debug("video_error");
});

startPlay();
