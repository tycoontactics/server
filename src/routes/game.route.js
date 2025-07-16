import express from "express";
import { buyProp, createGame, endTurn, joinGame, payRent, rollDice, startGame, offerTrade, rejectOffer, acceptOffer, buildHouse, mortgageProp } from "../controllers/game.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { checkGame, checkHost, checkGameJoined, checkOwner } from "../middlewares/game.middleware.js";

const router = express.Router();

router.use(protectRoute);
router.post("/create", createGame);
router.post("/join/:code", checkGame, joinGame);
router.post("/start/:code", checkGame, checkHost, startGame);
router.post("/:code/roll", checkGameJoined, rollDice);
router.post("/:code/endTurn", checkGameJoined, endTurn);
router.post("/:code/buy", checkGameJoined, buyProp);
router.post("/:code/pay", checkGameJoined, payRent);
router.post("/:code/mortgage", checkGameJoined, mortgageProp);
router.post("/:code/offer-trade", checkGameJoined, offerTrade);
router.post("/:code/reject-offer", checkGameJoined, rejectOffer);
router.post("/:code/accept-offer", checkGameJoined, acceptOffer);
router.post("/:code/build-house", checkGameJoined, buildHouse);
// router.post("/:code/voice-offer", voiceOffer);
// router.post("/:code/voice-answer", voiceAnswer);
// router.post("/:code/voice-ice-candidate", voiceCandidate);
export default router;