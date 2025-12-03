// get rtt + device-level delivery receipt
(() => {
  const pendingAcks = new Map(); // id -> timestamp

  const SELF = "your_phone_number_goes_here";

  const getReq = () => {
    if (window.require) return window.require;
    let __req;
    const chunk = window.webpackChunkwhatsapp_web_client || window.webpackChunkbuild;
    if (!chunk) return null;
    chunk.push([[Date.now()], {}, e => { __req = e; }]);
    return __req;
  };

  const req = getReq();
  if (!req) return console.error("Could not find WA require");

  const WAComms = req("WAComms");
  const WAWap   = req("WAWap");
  const comms   = WAComms.getComms();

  if (!comms) return console.warn("WAComms not started yet");
  if (comms.__plaintextTap2) return console.log("Already hooked");

  comms.__plaintextTap2 = true;

  const orig = comms.parseAndHandleStanza.bind(comms);

  comms.parseAndHandleStanza = function (socketId, frame) {
    try {
      WAWap.decodeStanza(frame, this.gzipInflate)
        .then(stanza => {
          const { tag, attrs } = stanza || {};
          if (!tag || !attrs) return;

          // ========== ACK RECEIVED ==========
          if (tag === "ack" && attrs.id) {
            pendingAcks.set(attrs.id, performance.now());
          }

          // ========== RECEIPT RECEIVED ==========
          if (tag === "receipt" && attrs.id) {
            const id   = attrs.id;
            const type = attrs.type; // "sender" for server delivery receipt
            const from = attrs.from?.["$1"]?.user;

            // ---- SERVER-SIDE DELIVERY RECEIPT (ALWAYS ARRIVES FIRST) ----
            if (type === "sender") {
              return;
            }

            // ---- DEVICE-LEVEL RECEIPT (ARRIVES WHEN RECIPIENT DEVICE GETS IT) ----
            if (from && from !== SELF) {
              const start = pendingAcks.get(id);
              if (start !== undefined) {
                const end = performance.now();
                const delta = end - start;

                console.log("time-diff: ==" + delta.toFixed(3) + "==");

                pendingAcks.delete(id);
              }
            }
          }
        })
        .catch(err => console.warn("decodeStanza error", err));

    } catch (err) {
      console.warn("decodeStanza threw", err);
    }

    return orig(socketId, frame);
  };

})();

const sendReaction = require("WAWebSendReactionMsgAction").sendReactionToMsg;
const MsgKey = require("WAWebMsgKey");
const Msgs = require("WAWebMsgCollection").MsgCollection;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function reactToMessage(msgKeyStr, emoji, count = 1, delval = 3000) {
  const msg = Msgs.get(MsgKey.fromString(msgKeyStr));
  if (!msg) throw new Error("Message not found: " + msgKeyStr);

  for (let i = 0; i < count; i++) {
    await sendReaction(msg, emoji);
    await delay(delval);
  }

  console.log(`reaction sent ${count} time(s)`);
}

// Example:
reactToMessage(
  "message_id_goes_here",
  ".",
  500000
);
